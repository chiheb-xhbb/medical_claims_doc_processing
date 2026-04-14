<?php

namespace App\Http\Controllers\Api;

use App\Enums\DocumentDecisionStatus;
use App\Enums\DocumentStatus;
use App\Enums\DossierStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Dossier;
use App\Models\Rubrique;
use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DocumentDecisionController extends Controller
{
    public function accept(Request $request, Document $document): JsonResponse
    {
        $validated = $request->validate([
            'decision_note' => ['nullable', 'string'],
        ]);

        return $this->decide(
            request: $request,
            document: $document,
            decisionStatus: DocumentDecisionStatus::ACCEPTED,
            successMessage: 'Document accepted successfully.',
            forbiddenMessage: 'You are not allowed to accept this document.',
            invalidStatusMessage: 'Only validated documents can be accepted.',
            decisionNote: $validated['decision_note'] ?? null,
        );
    }

    public function reject(Request $request, Document $document): JsonResponse
    {
        $validated = $request->validate([
            'decision_note' => ['nullable', 'string'],
        ]);

        return $this->decide(
            request: $request,
            document: $document,
            decisionStatus: DocumentDecisionStatus::REJECTED,
            successMessage: 'Document rejected successfully.',
            forbiddenMessage: 'You are not allowed to reject this document.',
            invalidStatusMessage: 'Only validated documents can be rejected.',
            decisionNote: $validated['decision_note'] ?? null,
        );
    }

    private function decide(
        Request $request,
        Document $document,
        DocumentDecisionStatus $decisionStatus,
        string $successMessage,
        string $forbiddenMessage,
        string $invalidStatusMessage,
        ?string $decisionNote = null
    ): JsonResponse {
        /** @var User $user */
        $user = $request->user();

        $document->loadMissing('rubrique.dossier');

        $rubrique = $document->rubrique;
        if (! $rubrique) {
            return response()->json([
                'message' => 'This document is not attached to any rubrique.',
            ], 422);
        }

        $dossier = $rubrique->dossier;
        if (! $dossier) {
            return response()->json([
                'message' => 'Parent dossier not found.',
            ], 404);
        }

        if (! $this->canDecideDocuments($user, $dossier)) {
            return response()->json([
                'message' => $this->resolveForbiddenMessage($user, $dossier, $forbiddenMessage),
            ], 403);
        }

        if ($dossier->isFrozen()) {
            return response()->json([
                'message' => 'This dossier is frozen and cannot be modified.',
            ], 422);
        }

        if (! $this->isDecisionWorkflowStatus($dossier)) {
            return response()->json([
                'message' => 'Documents can only be decided while the dossier is under review or in escalation.',
            ], 422);
        }

        if ($document->status !== DocumentStatus::VALIDATED) {
            return response()->json([
                'message' => $invalidStatusMessage,
            ], 422);
        }

        DB::transaction(function () use (
            $dossier,
            $rubrique,
            $document,
            $user,
            $decisionStatus,
            $decisionNote,
            $forbiddenMessage,
            $invalidStatusMessage
        ) {
            /** @var Dossier $lockedDossier */
            $lockedDossier = Dossier::query()
                ->whereKey($dossier->id)
                ->lockForUpdate()
                ->firstOrFail();

            /** @var Rubrique $lockedRubrique */
            $lockedRubrique = Rubrique::query()
                ->whereKey($rubrique->id)
                ->lockForUpdate()
                ->firstOrFail();

            /** @var Document $lockedDocument */
            $lockedDocument = Document::query()
                ->whereKey($document->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $this->canDecideDocuments($user, $lockedDossier)) {
                $this->forbidden(
                    $this->resolveForbiddenMessage($user, $lockedDossier, $forbiddenMessage)
                );
            }

            if ($lockedDossier->isFrozen()) {
                $this->unprocessable('This dossier is frozen and cannot be modified.');
            }

            if (! $this->isDecisionWorkflowStatus($lockedDossier)) {
                $this->unprocessable('Documents can only be decided while the dossier is under review or in escalation.');
            }

            if ((int) $lockedRubrique->dossier_id !== (int) $lockedDossier->id) {
                $this->unprocessable('This rubrique does not belong to the expected dossier.');
            }

            if ((int) $lockedDocument->rubrique_id !== (int) $lockedRubrique->id) {
                $this->unprocessable('This document does not belong to the expected rubrique.');
            }

            if ($lockedDocument->status !== DocumentStatus::VALIDATED) {
                $this->unprocessable($invalidStatusMessage);
            }

            $lockedDocument->decision_status = $decisionStatus;
            $lockedDocument->decision_by = $user->id;
            $lockedDocument->decision_at = now();
            $lockedDocument->decision_note = $decisionNote;
            $lockedDocument->save();

            $lockedRubrique->refreshStatusFromDocuments();
            $lockedDossier->updateTotal();
        });

        return response()->json([
            'message' => $successMessage,
            'document' => $document->fresh(['rubrique']),
        ], 200);
    }

    private function canDecideDocuments(User $user, Dossier $dossier): bool
    {
        if ($this->hasRole($user, UserRole::ADMIN)) {
            return true;
        }

        if ($dossier->status === DossierStatus::IN_ESCALATION) {
            return $this->hasRole($user, UserRole::SUPERVISOR);
        }

        if ($dossier->status === DossierStatus::UNDER_REVIEW) {
            if ($this->isReturnedFromSupervisor($dossier)) {
                return false;
            }

            return $this->hasRole($user, UserRole::CLAIMS_MANAGER);
        }

        return false;
    }

    private function isDecisionWorkflowStatus(Dossier $dossier): bool
    {
        return in_array($dossier->status, [
            DossierStatus::UNDER_REVIEW,
            DossierStatus::IN_ESCALATION,
        ], true);
    }

    private function isReturnedFromSupervisor(Dossier $dossier): bool
    {
        return $dossier->status === DossierStatus::UNDER_REVIEW
            && ($dossier->chef_decision_type ?? null) === 'RETURNED';
    }

    private function resolveForbiddenMessage(User $user, Dossier $dossier, string $defaultMessage): string
    {
        if ($this->hasRole($user, UserRole::ADMIN)) {
            return $defaultMessage;
        }

        if ($dossier->status === DossierStatus::IN_ESCALATION) {
            return 'Only the supervisor can modify document decisions during escalation.';
        }

        if ($this->isReturnedFromSupervisor($dossier)) {
            return 'Document decisions are locked after a supervisor return. You can only process the dossier or escalate it again.';
        }

        if ($dossier->status === DossierStatus::UNDER_REVIEW) {
            return $defaultMessage;
        }

        return 'Document decisions are not allowed in the current dossier workflow state.';
    }

    private function hasRole(User $user, UserRole ...$roles): bool
    {
        $currentRole = $user->role instanceof UserRole
            ? $user->role
            : UserRole::tryFrom((string) $user->role);

        if (! $currentRole) {
            return false;
        }

        return in_array($currentRole, $roles, true);
    }

    private function forbidden(string $message): void
    {
        throw new HttpResponseException(
            response()->json(['message' => $message], 403)
        );
    }

    private function unprocessable(string $message): void
    {
        throw new HttpResponseException(
            response()->json(['message' => $message], 422)
        );
    }
}