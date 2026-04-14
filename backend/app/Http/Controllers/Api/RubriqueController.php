<?php

namespace App\Http\Controllers\Api;

use App\Enums\DocumentDecisionStatus;
use App\Enums\DocumentStatus;
use App\Enums\DossierStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\AttachDocumentsRequest;
use App\Models\Document;
use App\Models\Dossier;
use App\Models\Rubrique;
use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RubriqueController extends Controller
{
    public function store(Request $request, Dossier $dossier): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $this->canPrepareDossiers($user) || ! $this->canManagePreparationDossier($user, $dossier)) {
            return response()->json([
                'message' => 'You are not allowed to add rubriques to this dossier.',
            ], 403);
        }

        if ($dossier->isFrozen()) {
            return response()->json([
                'message' => 'This dossier is frozen and cannot be modified.',
            ], 422);
        }

        if (! $this->isPreparationPhase($dossier)) {
            return response()->json([
                'message' => 'Rubriques can only be created while the dossier is in preparation.',
            ], 422);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $rubrique = DB::transaction(function () use ($dossier, $user, $validated) {
            /** @var Dossier $lockedDossier */
            $lockedDossier = Dossier::query()
                ->whereKey($dossier->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $this->canPrepareDossiers($user) || ! $this->canManagePreparationDossier($user, $lockedDossier)) {
                $this->forbidden('You are not allowed to add rubriques to this dossier.');
            }

            if ($lockedDossier->isFrozen()) {
                $this->unprocessable('This dossier is frozen and cannot be modified.');
            }

            if (! $this->isPreparationPhase($lockedDossier)) {
                $this->unprocessable('Rubriques can only be created while the dossier is in preparation.');
            }

            $rubrique = new Rubrique();
            $rubrique->dossier_id = $lockedDossier->id;
            $rubrique->title = $validated['title'];
            $rubrique->notes = $validated['notes'] ?? null;
            $rubrique->created_by = $user->id;
            $rubrique->save();

            if ($lockedDossier->status === DossierStatus::RECEIVED) {
                $lockedDossier->status = DossierStatus::IN_PROGRESS;
                $lockedDossier->save();
            }

            return $rubrique;
        });

        return response()->json([
            'message' => 'Rubrique created successfully.',
            'rubrique' => $rubrique->fresh(),
        ], 201);
    }

    public function update(Request $request, Rubrique $rubrique): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $dossier = $rubrique->dossier;

        if (! $dossier) {
            return response()->json([
                'message' => 'Parent dossier not found.',
            ], 404);
        }

        if (! $this->canPrepareDossiers($user) || ! $this->canManagePreparationDossier($user, $dossier)) {
            return response()->json([
                'message' => 'You are not allowed to update this rubrique.',
            ], 403);
        }

        if ($dossier->isFrozen()) {
            return response()->json([
                'message' => 'This dossier is frozen and cannot be modified.',
            ], 422);
        }

        if (! $this->isPreparationPhase($dossier)) {
            return response()->json([
                'message' => 'This rubrique can only be updated while the dossier is in preparation.',
            ], 422);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $rubrique->title = $validated['title'];
        $rubrique->notes = $validated['notes'] ?? null;
        $rubrique->save();

        return response()->json([
            'message' => 'Rubrique updated successfully.',
            'rubrique' => $rubrique->fresh(),
        ], 200);
    }

    public function destroy(Request $request, Rubrique $rubrique): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $dossier = $rubrique->dossier;

        if (! $dossier) {
            return response()->json([
                'message' => 'Parent dossier not found.',
            ], 404);
        }

        if (! $this->canPrepareDossiers($user) || ! $this->canManagePreparationDossier($user, $dossier)) {
            return response()->json([
                'message' => 'You are not allowed to delete this rubrique.',
            ], 403);
        }

        if ($dossier->isFrozen()) {
            return response()->json([
                'message' => 'This dossier is frozen and cannot be modified.',
            ], 422);
        }

        if (! $this->isPreparationPhase($dossier)) {
            return response()->json([
                'message' => 'This rubrique can only be deleted while the dossier is in preparation.',
            ], 422);
        }

        DB::transaction(function () use ($rubrique, $dossier, $user) {
            /** @var Rubrique $lockedRubrique */
            $lockedRubrique = Rubrique::query()
                ->whereKey($rubrique->id)
                ->lockForUpdate()
                ->firstOrFail();

            /** @var Dossier $lockedDossier */
            $lockedDossier = Dossier::query()
                ->whereKey($dossier->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $this->canPrepareDossiers($user) || ! $this->canManagePreparationDossier($user, $lockedDossier)) {
                $this->forbidden('You are not allowed to delete this rubrique.');
            }

            if ($lockedDossier->isFrozen()) {
                $this->unprocessable('This dossier is frozen and cannot be modified.');
            }

            if (! $this->isPreparationPhase($lockedDossier)) {
                $this->unprocessable('This rubrique can only be deleted while the dossier is in preparation.');
            }

            if ($lockedRubrique->documents()->exists()) {
                $this->unprocessable('You cannot delete a rubrique that already contains documents.');
            }

            $lockedRubrique->delete();
        });

        return response()->json([
            'message' => 'Rubrique deleted successfully.',
        ], 200);
    }

    public function attachDocuments(AttachDocumentsRequest $request, Rubrique $rubrique): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $dossier = $rubrique->dossier;

        if (! $dossier) {
            return response()->json([
                'message' => 'Parent dossier not found.',
            ], 404);
        }

        if (! $this->canPrepareDossiers($user) || ! $this->canManagePreparationDossier($user, $dossier)) {
            return response()->json([
                'message' => 'You are not allowed to attach documents to this rubrique.',
            ], 403);
        }

        if ($dossier->isFrozen()) {
            return response()->json([
                'message' => 'This dossier is frozen and cannot be modified.',
            ], 422);
        }

        if (! $this->isPreparationPhase($dossier)) {
            return response()->json([
                'message' => 'Documents can only be attached while the dossier is in preparation.',
            ], 422);
        }

        $documentIds = collect($request->validated('document_ids'))
            ->map(fn ($id) => (int) $id)
            ->values();

        DB::transaction(function () use ($rubrique, $dossier, $user, $documentIds) {
            /** @var Rubrique $lockedRubrique */
            $lockedRubrique = Rubrique::query()
                ->whereKey($rubrique->id)
                ->lockForUpdate()
                ->firstOrFail();

            /** @var Dossier $lockedDossier */
            $lockedDossier = Dossier::query()
                ->whereKey($dossier->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $this->canPrepareDossiers($user) || ! $this->canManagePreparationDossier($user, $lockedDossier)) {
                $this->forbidden('You are not allowed to attach documents to this rubrique.');
            }

            if ($lockedDossier->isFrozen()) {
                $this->unprocessable('This dossier is frozen and cannot be modified.');
            }

            if (! $this->isPreparationPhase($lockedDossier)) {
                $this->unprocessable('Documents can only be attached while the dossier is in preparation.');
            }

            $documents = Document::query()
                ->whereIn('id', $documentIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($documents->count() !== $documentIds->count()) {
                $this->unprocessable('One or more selected documents were not found.');
            }

            foreach ($documentIds as $documentId) {
                /** @var Document $document */
                $document = $documents->get($documentId);

                if ((int) $document->user_id !== (int) $user->id && ! $this->hasRole($user, UserRole::ADMIN)) {
                    $this->forbidden('One or more selected documents do not belong to you.');
                }

                if ($document->status !== DocumentStatus::VALIDATED) {
                    $this->unprocessable('Only validated documents can be attached to a rubrique.');
                }

                if ($document->rubrique_id !== null && (int) $document->rubrique_id !== (int) $lockedRubrique->id) {
                    $this->unprocessable('One or more selected documents are already attached to another rubrique.');
                }
            }

            foreach ($documentIds as $documentId) {
                /** @var Document $document */
                $document = $documents->get($documentId);

                $document->dossier_id = $lockedDossier->id;
                $document->rubrique_id = $lockedRubrique->id;
                $document->decision_status = DocumentDecisionStatus::PENDING;
                $document->decision_by = null;
                $document->decision_at = null;
                $document->decision_note = null;
                $document->save();
            }

            $lockedRubrique->refreshStatusFromDocuments();
            $lockedDossier->updateTotal();
        });

        return response()->json([
            'message' => 'Document(s) attached successfully.',
            'rubrique' => $rubrique->fresh(['documents']),
        ], 200);
    }

    public function detachDocument(Request $request, Rubrique $rubrique, Document $document): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $dossier = $rubrique->dossier;

        if (! $dossier) {
            return response()->json([
                'message' => 'Parent dossier not found.',
            ], 404);
        }

        if (! $this->canPrepareDossiers($user) || ! $this->canManagePreparationDossier($user, $dossier)) {
            return response()->json([
                'message' => 'You are not allowed to detach documents from this rubrique.',
            ], 403);
        }

        if ($dossier->isFrozen()) {
            return response()->json([
                'message' => 'This dossier is frozen and cannot be modified.',
            ], 422);
        }

        if (! $this->isPreparationPhase($dossier)) {
            return response()->json([
                'message' => 'Documents can only be detached while the dossier is in preparation.',
            ], 422);
        }

        if ((int) $document->rubrique_id !== (int) $rubrique->id) {
            return response()->json([
                'message' => 'This document does not belong to this rubrique.',
            ], 422);
        }

        DB::transaction(function () use ($rubrique, $dossier, $document, $user) {
            /** @var Rubrique $lockedRubrique */
            $lockedRubrique = Rubrique::query()
                ->whereKey($rubrique->id)
                ->lockForUpdate()
                ->firstOrFail();

            /** @var Dossier $lockedDossier */
            $lockedDossier = Dossier::query()
                ->whereKey($dossier->id)
                ->lockForUpdate()
                ->firstOrFail();

            /** @var Document $lockedDocument */
            $lockedDocument = Document::query()
                ->whereKey($document->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $this->canPrepareDossiers($user) || ! $this->canManagePreparationDossier($user, $lockedDossier)) {
                $this->forbidden('You are not allowed to detach documents from this rubrique.');
            }

            if ($lockedDossier->isFrozen()) {
                $this->unprocessable('This dossier is frozen and cannot be modified.');
            }

            if (! $this->isPreparationPhase($lockedDossier)) {
                $this->unprocessable('Documents can only be detached while the dossier is in preparation.');
            }

            if ((int) $lockedDocument->rubrique_id !== (int) $lockedRubrique->id) {
                $this->unprocessable('This document does not belong to this rubrique.');
            }

            $lockedDocument->dossier_id = null;
            $lockedDocument->rubrique_id = null;
            $lockedDocument->decision_status = DocumentDecisionStatus::PENDING;
            $lockedDocument->decision_by = null;
            $lockedDocument->decision_at = null;
            $lockedDocument->decision_note = null;
            $lockedDocument->save();

            $lockedRubrique->refreshStatusFromDocuments();
            $lockedDossier->updateTotal();
        });

        return response()->json([
            'message' => 'Document detached successfully.',
            'rubrique' => $rubrique->fresh(['documents']),
        ], 200);
    }

    public function rejectAll(Request $request, Rubrique $rubrique): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $dossier = $rubrique->dossier;

        if (! $dossier) {
            return response()->json([
                'message' => 'Parent dossier not found.',
            ], 404);
        }

        if (! $this->canDecideRubrique($user, $dossier)) {
            return response()->json([
                'message' => $this->resolveDecisionForbiddenMessage($user, $dossier),
            ], 403);
        }

        if ($dossier->isFrozen()) {
            return response()->json([
                'message' => 'This dossier is frozen and cannot be modified.',
            ], 422);
        }

        if (! $this->isDecisionWorkflowStatus($dossier)) {
            return response()->json([
                'message' => 'A rubrique can only be rejected while the dossier is under review or in escalation.',
            ], 422);
        }

        $validated = $request->validate([
            'decision_note' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($rubrique, $dossier, $user, $validated) {
            /** @var Rubrique $lockedRubrique */
            $lockedRubrique = Rubrique::query()
                ->whereKey($rubrique->id)
                ->lockForUpdate()
                ->firstOrFail();

            /** @var Dossier $lockedDossier */
            $lockedDossier = Dossier::query()
                ->whereKey($dossier->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $this->canDecideRubrique($user, $lockedDossier)) {
                $this->forbidden($this->resolveDecisionForbiddenMessage($user, $lockedDossier));
            }

            if ($lockedDossier->isFrozen()) {
                $this->unprocessable('This dossier is frozen and cannot be modified.');
            }

            if (! $this->isDecisionWorkflowStatus($lockedDossier)) {
                $this->unprocessable('A rubrique can only be rejected while the dossier is under review or in escalation.');
            }

            $documents = Document::query()
                ->where('rubrique_id', $lockedRubrique->id)
                ->lockForUpdate()
                ->get();

            if ($documents->isEmpty()) {
                $this->unprocessable('You cannot reject an empty rubrique.');
            }

            $lockedRubrique->setRelation('documents', $documents);
            $lockedRubrique->rejectWholeRubrique(
                $user->id,
                $validated['decision_note'] ?? null
            );

            $lockedDossier->updateTotal();
        });

        return response()->json([
            'message' => 'Entire rubrique has been rejected.',
            'rubrique' => $rubrique->fresh(['documents']),
        ], 200);
    }

    private function canPrepareDossiers(User $user): bool
    {
        return $this->hasRole($user, UserRole::AGENT, UserRole::CLAIMS_MANAGER, UserRole::ADMIN);
    }

    private function canManagePreparationDossier(User $user, Dossier $dossier): bool
    {
        if ($this->hasRole($user, UserRole::ADMIN)) {
            return true;
        }

        return $this->hasRole($user, UserRole::AGENT, UserRole::CLAIMS_MANAGER)
            && (int) $dossier->created_by === (int) $user->id;
    }

    private function canDecideRubrique(User $user, Dossier $dossier): bool
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

    private function isPreparationPhase(Dossier $dossier): bool
    {
        return in_array($dossier->status, [
            DossierStatus::RECEIVED,
            DossierStatus::IN_PROGRESS,
            DossierStatus::AWAITING_COMPLEMENT,
        ], true);
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

    private function resolveDecisionForbiddenMessage(User $user, Dossier $dossier): string
    {
        if ($this->hasRole($user, UserRole::ADMIN)) {
            return 'You are not allowed to reject this rubrique.';
        }

        if ($dossier->status === DossierStatus::IN_ESCALATION) {
            return 'Only the supervisor can modify rubrique decisions during escalation.';
        }

        if ($this->isReturnedFromSupervisor($dossier)) {
            return 'Rubrique decisions are locked after a supervisor return. You can only process the dossier or escalate it again.';
        }

        if ($dossier->status === DossierStatus::UNDER_REVIEW) {
            return 'You are not allowed to reject this rubrique.';
        }

        return 'Rubrique decisions are not allowed in the current dossier workflow state.';
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