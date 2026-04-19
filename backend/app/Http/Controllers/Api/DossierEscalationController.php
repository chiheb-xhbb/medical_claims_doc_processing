<?php

namespace App\Http\Controllers\Api;

use App\Enums\DocumentDecisionStatus;
use App\Enums\DossierStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\ChefApproveRequest;
use App\Http\Requests\ChefComplementRequest;
use App\Http\Requests\ChefReturnRequest;
use App\Http\Requests\EscalateDossierRequest;
use App\Models\Dossier;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DossierEscalationController extends Controller
{
    public function __construct(
        private NotificationService $notificationService
    ) {
    }

    public function escalate(EscalateDossierRequest $request, Dossier $dossier): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $this->canEscalateDossiers($user)) {
            return response()->json([
                'message' => 'You are not allowed to escalate this case file.',
            ], 403);
        }

        $updatedDossier = DB::transaction(function () use ($dossier, $user, $request) {
            /** @var Dossier $lockedDossier */
            $lockedDossier = Dossier::query()
                ->whereKey($dossier->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $this->canEscalateDossiers($user)) {
                $this->forbidden('You are not allowed to escalate this case file.');
            }

            if ($lockedDossier->isFrozen()) {
                $this->unprocessable('This case file is frozen and cannot be escalated.');
            }

            if ($lockedDossier->status !== DossierStatus::UNDER_REVIEW) {
                $this->unprocessable('Only case files in UNDER_REVIEW status can be escalated.');
            }

            if ($this->hasPendingDecisionDocuments($lockedDossier)) {
                $this->unprocessable('All document decisions must be completed before escalation.');
            }

            $lockedDossier->status = DossierStatus::IN_ESCALATION;
            $lockedDossier->escalated_by = $user->id;
            $lockedDossier->escalated_at = now();
            $lockedDossier->escalation_reason = $request->validated('escalation_reason');

            $lockedDossier->chef_decision_type = null;
            $lockedDossier->chef_decision_by = null;
            $lockedDossier->chef_decision_at = null;
            $lockedDossier->chef_decision_note = null;

            $lockedDossier->awaiting_complement_source = null;
            $lockedDossier->awaiting_complement_by = null;
            $lockedDossier->awaiting_complement_at = null;
            $lockedDossier->awaiting_complement_note = null;

            $lockedDossier->save();

            $fresh = $lockedDossier->fresh([
                'creator',
                'submitter',
                'processor',
                'escalator',
                'chefDecisionMaker',
                'returnedToPreparationBy',
                'awaitingComplementBy',
            ]);

            // Notify all active supervisors after this transaction commits.
            DB::afterCommit(function () use ($user, $fresh) {
                $this->notificationService->notifySupervisors(
                    actor: $user,
                    dossier: $fresh,
                    type: 'DOSSIER_ESCALATED',
                    title: 'Case file escalated for review',
                    message: "Case file {$fresh->numero_dossier} has been escalated and requires your review."
                );
            });

            return $fresh;
        });

        return response()->json([
            'message' => 'Case file escalated successfully.',
            'dossier' => $this->formatDossierPayload($updatedDossier),
            'requested_total' => $updatedDossier->getRequestedTotal(),
            'current_total' => $updatedDossier->getCurrentTotal(),
            'display_total' => $updatedDossier->getDisplayTotal(),
        ], 200);
    }

    public function approveDerogation(ChefApproveRequest $request, Dossier $dossier): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $this->canChefReviewDossiers($user)) {
            return response()->json([
                'message' => 'You are not allowed to approve this case file.',
            ], 403);
        }

        $updatedDossier = DB::transaction(function () use ($dossier, $user, $request) {
            /** @var Dossier $lockedDossier */
            $lockedDossier = Dossier::query()
                ->whereKey($dossier->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $this->canChefReviewDossiers($user)) {
                $this->forbidden('You are not allowed to approve this case file.');
            }

            if ($lockedDossier->isFrozen()) {
                $this->unprocessable('This case file is already frozen.');
            }

            if ($lockedDossier->status !== DossierStatus::IN_ESCALATION) {
                $this->unprocessable('Only case files in IN_ESCALATION status can be approved by the supervisor.');
            }

            if ($this->hasPendingDecisionDocuments($lockedDossier)) {
                $this->unprocessable('All document decisions must be completed before final approval.');
            }

            $lockedDossier->status = DossierStatus::PROCESSED;
            $lockedDossier->montant_total = $lockedDossier->getCurrentTotal();
            $lockedDossier->processed_by = $user->id;
            $lockedDossier->processed_at = now();

            $lockedDossier->chef_decision_type = 'APPROVED';
            $lockedDossier->chef_decision_by = $user->id;
            $lockedDossier->chef_decision_at = now();
            $lockedDossier->chef_decision_note = $request->validated('decision_note');

            $lockedDossier->awaiting_complement_source = null;
            $lockedDossier->awaiting_complement_by = null;
            $lockedDossier->awaiting_complement_at = null;
            $lockedDossier->awaiting_complement_note = null;

            $lockedDossier->save();

            return $lockedDossier->fresh([
                'creator',
                'submitter',
                'processor',
                'escalator',
                'chefDecisionMaker',
                'returnedToPreparationBy',
                'awaitingComplementBy',
            ]);
        });

        return response()->json([
            'message' => 'Escalation approved. Case file is now processed.',
            'dossier' => $this->formatDossierPayload($updatedDossier),
            'requested_total' => $updatedDossier->getRequestedTotal(),
            'current_total' => $updatedDossier->getCurrentTotal(),
            'display_total' => $updatedDossier->getDisplayTotal(),
        ], 200);
    }

    public function returnToGestionnaire(ChefReturnRequest $request, Dossier $dossier): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $this->canChefReviewDossiers($user)) {
            return response()->json([
                'message' => 'You are not allowed to return this case file.',
            ], 403);
        }

        $updatedDossier = DB::transaction(function () use ($dossier, $user, $request) {
            /** @var Dossier $lockedDossier */
            $lockedDossier = Dossier::query()
                ->whereKey($dossier->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $this->canChefReviewDossiers($user)) {
                $this->forbidden('You are not allowed to return this case file.');
            }

            if ($lockedDossier->isFrozen()) {
                $this->unprocessable('This case file is already frozen.');
            }

            if ($lockedDossier->status !== DossierStatus::IN_ESCALATION) {
                $this->unprocessable('Only case files in IN_ESCALATION status can be returned to the Claims Manager.');
            }

            $lockedDossier->status = DossierStatus::UNDER_REVIEW;

            $lockedDossier->chef_decision_type = 'RETURNED';
            $lockedDossier->chef_decision_by = $user->id;
            $lockedDossier->chef_decision_at = now();
            $lockedDossier->chef_decision_note = $request->validated('decision_note');

            $lockedDossier->awaiting_complement_source = null;
            $lockedDossier->awaiting_complement_by = null;
            $lockedDossier->awaiting_complement_at = null;
            $lockedDossier->awaiting_complement_note = null;

            $lockedDossier->save();

            $fresh = $lockedDossier->fresh([
                'creator',
                'submitter',
                'processor',
                'escalator',
                'chefDecisionMaker',
                'returnedToPreparationBy',
                'awaitingComplementBy',
            ]);

            // Notify all active claims managers after commit.
            DB::afterCommit(function () use ($user, $fresh) {
                $this->notificationService->notifyAllClaimsManagers(
                    actor: $user,
                    dossier: $fresh,
                    type: 'DOSSIER_RETURNED_TO_CLAIMS_MANAGER',
                    title: 'Case file returned to review',
                    message: "Case file {$fresh->numero_dossier} was returned by the supervisor and requires your attention."
                );
            });

            return $fresh;
        });

        return response()->json([
            'message' => 'Case file returned to the Claims Manager successfully.',
            'dossier' => $this->formatDossierPayload($updatedDossier),
            'requested_total' => $updatedDossier->getRequestedTotal(),
            'current_total' => $updatedDossier->getCurrentTotal(),
            'display_total' => $updatedDossier->getDisplayTotal(),
        ], 200);
    }

    public function requestComplement(ChefComplementRequest $request, Dossier $dossier): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $this->canChefReviewDossiers($user)) {
            return response()->json([
                'message' => 'You are not allowed to request complement for this case file.',
            ], 403);
        }

        $updatedDossier = DB::transaction(function () use ($dossier, $user, $request) {
            /** @var Dossier $lockedDossier */
            $lockedDossier = Dossier::query()
                ->whereKey($dossier->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $this->canChefReviewDossiers($user)) {
                $this->forbidden('You are not allowed to request complement for this case file.');
            }

            if ($lockedDossier->isFrozen()) {
                $this->unprocessable('This case file is already frozen.');
            }

            if ($lockedDossier->status !== DossierStatus::IN_ESCALATION) {
                $this->unprocessable('Only case files in IN_ESCALATION status can receive a complement request.');
            }

            $decisionNote = $request->validated('decision_note');

            $lockedDossier->status = DossierStatus::AWAITING_COMPLEMENT;

            $lockedDossier->chef_decision_type = 'COMPLEMENT_REQUESTED';
            $lockedDossier->chef_decision_by = $user->id;
            $lockedDossier->chef_decision_at = now();
            $lockedDossier->chef_decision_note = $decisionNote;

            $lockedDossier->awaiting_complement_source = 'SUPERVISOR_COMPLEMENT_REQUEST';
            $lockedDossier->awaiting_complement_by = $user->id;
            $lockedDossier->awaiting_complement_at = now();
            $lockedDossier->awaiting_complement_note = $decisionNote;

            $lockedDossier->save();

            $fresh = $lockedDossier->fresh([
                'creator',
                'submitter',
                'processor',
                'escalator',
                'chefDecisionMaker',
                'returnedToPreparationBy',
                'awaitingComplementBy',
            ]);

            // Notify the preparation owner (dossier creator) after commit.
            DB::afterCommit(function () use ($user, $fresh) {
                $this->notificationService->notifyPreparationOwner(
                    dossier: $fresh,
                    actor: $user,
                    type: 'DOSSIER_COMPLEMENT_REQUESTED',
                    title: 'Complement requested for your case file',
                    message: "The supervisor requested a complement for case file {$fresh->numero_dossier}."
                );
            });

            return $fresh;
        });

        return response()->json([
            'message' => 'Complement requested successfully.',
            'dossier' => $this->formatDossierPayload($updatedDossier),
            'requested_total' => $updatedDossier->getRequestedTotal(),
            'current_total' => $updatedDossier->getCurrentTotal(),
            'display_total' => $updatedDossier->getDisplayTotal(),
        ], 200);
    }

    private function canEscalateDossiers(User $user): bool
    {
        return $this->hasRole($user, UserRole::CLAIMS_MANAGER, UserRole::ADMIN);
    }

    private function canChefReviewDossiers(User $user): bool
    {
        return $this->hasRole($user, UserRole::SUPERVISOR, UserRole::ADMIN);
    }

    private function hasPendingDecisionDocuments(Dossier $dossier): bool
    {
        return $dossier->documents()
            ->where('documents.decision_status', DocumentDecisionStatus::PENDING->value)
            ->exists();
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

    private function formatDossierPayload(Dossier $dossier): array
    {
        return [
            'id' => $dossier->id,
            'numero_dossier' => $dossier->numero_dossier,
            'assured_identifier' => $dossier->assured_identifier,
            'status' => $dossier->status->value,
            'montant_total' => $dossier->montant_total,
            'episode_description' => $dossier->episode_description,
            'notes' => $dossier->notes,

            'created_by' => $dossier->created_by,
            'submitted_by' => $dossier->submitted_by,
            'processed_by' => $dossier->processed_by,
            'escalated_by' => $dossier->escalated_by,
            'chef_decision_by' => $dossier->chef_decision_by,
            'returned_to_preparation_by' => $dossier->returned_to_preparation_by,
            'awaiting_complement_by' => $dossier->awaiting_complement_by,

            'submitted_at' => $dossier->submitted_at,
            'processed_at' => $dossier->processed_at,
            'escalated_at' => $dossier->escalated_at,
            'escalation_reason' => $dossier->escalation_reason,
            'chef_decision_type' => $dossier->chef_decision_type,
            'chef_decision_at' => $dossier->chef_decision_at,
            'chef_decision_note' => $dossier->chef_decision_note,
            'returned_to_preparation_at' => $dossier->returned_to_preparation_at,
            'returned_to_preparation_note' => $dossier->returned_to_preparation_note,
            'awaiting_complement_source' => $dossier->awaiting_complement_source,
            'awaiting_complement_at' => $dossier->awaiting_complement_at,
            'awaiting_complement_note' => $dossier->awaiting_complement_note,

            'creator' => $dossier->creator ? [
                'id' => $dossier->creator->id,
                'name' => $dossier->creator->name,
                'email' => $dossier->creator->email,
            ] : null,

            'submitter' => $dossier->submitter ? [
                'id' => $dossier->submitter->id,
                'name' => $dossier->submitter->name,
                'email' => $dossier->submitter->email,
            ] : null,

            'processor' => $dossier->processor ? [
                'id' => $dossier->processor->id,
                'name' => $dossier->processor->name,
                'email' => $dossier->processor->email,
            ] : null,

            'escalator' => $dossier->escalator ? [
                'id' => $dossier->escalator->id,
                'name' => $dossier->escalator->name,
                'email' => $dossier->escalator->email,
            ] : null,

            'chef_decision_maker' => $dossier->chefDecisionMaker ? [
                'id' => $dossier->chefDecisionMaker->id,
                'name' => $dossier->chefDecisionMaker->name,
                'email' => $dossier->chefDecisionMaker->email,
            ] : null,

            'returned_to_preparation_user' => $dossier->returnedToPreparationBy ? [
                'id' => $dossier->returnedToPreparationBy->id,
                'name' => $dossier->returnedToPreparationBy->name,
                'email' => $dossier->returnedToPreparationBy->email,
            ] : null,

            'awaiting_complement_user' => $dossier->awaitingComplementBy ? [
                'id' => $dossier->awaitingComplementBy->id,
                'name' => $dossier->awaitingComplementBy->name,
                'email' => $dossier->awaitingComplementBy->email,
            ] : null,

            'created_at' => $dossier->created_at,
            'updated_at' => $dossier->updated_at,
        ];
    }
}