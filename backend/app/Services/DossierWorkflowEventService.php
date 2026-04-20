<?php

namespace App\Services;

use App\Models\Dossier;
use App\Models\DossierWorkflowEvent;
use App\Models\User;
use BackedEnum;
use Illuminate\Support\Facades\Log;

class DossierWorkflowEventService
{
    /**
     * Records one immutable workflow event.
     * Failure is logged but never re-thrown, so workflow transitions stay primary.
     */
    public function record(
        Dossier $dossier,
        ?User $actor,
        string $eventType,
        ?string $fromStatus,
        ?string $toStatus,
        string $title,
        ?string $description = null,
        ?string $note = null,
        array $meta = []
    ): void {
        try {
            DossierWorkflowEvent::create([
                'dossier_id' => $dossier->id,
                'actor_id' => $actor?->id,
                'event_type' => $eventType,
                'from_status' => $fromStatus,
                'to_status' => $toStatus,
                'title' => $title,
                'description' => $description,
                'note' => $note,
                'meta' => [
                    // Keep a stable minimal context on every row.
                    'numero_dossier' => $dossier->numero_dossier,
                    'actor_role' => $this->normalizeEnumValue($actor?->role),
                    ...$meta,
                ],
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error('DossierWorkflowEventService: failed to record workflow event.', [
                'dossier_id' => $dossier->id,
                'event_type' => $eventType,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function recordCreation(Dossier $dossier, ?User $actor): void
    {
        $this->record(
            dossier: $dossier,
            actor: $actor,
            eventType: 'DOSSIER_CREATED',
            fromStatus: null,
            toStatus: $this->normalizeEnumValue($dossier->status),
            title: 'Case file created',
            description: "Case file {$dossier->numero_dossier} was created."
        );
    }

    public function recordSubmission(
        Dossier $dossier,
        ?User $actor,
        string $fromStatus,
        string $toStatus
    ): void {
        $this->record(
            dossier: $dossier,
            actor: $actor,
            eventType: 'DOSSIER_SUBMITTED_FOR_REVIEW',
            fromStatus: $fromStatus,
            toStatus: $toStatus,
            title: 'Case file submitted for review',
            description: "Case file {$dossier->numero_dossier} was submitted for review."
        );
    }

    public function recordResubmission(
        Dossier $dossier,
        ?User $actor,
        string $fromStatus,
        string $toStatus
    ): void {
        $this->record(
            dossier: $dossier,
            actor: $actor,
            eventType: 'DOSSIER_RESUBMITTED_FOR_REVIEW',
            fromStatus: $fromStatus,
            toStatus: $toStatus,
            title: 'Case file resubmitted for review',
            description: "Case file {$dossier->numero_dossier} was resubmitted for review."
        );
    }

    public function recordReturnToPreparation(
        Dossier $dossier,
        ?User $actor,
        string $fromStatus,
        string $toStatus,
        ?string $note = null
    ): void {
        $this->record(
            dossier: $dossier,
            actor: $actor,
            eventType: 'DOSSIER_RETURNED_TO_PREPARATION',
            fromStatus: $fromStatus,
            toStatus: $toStatus,
            title: 'Case file returned to preparation',
            description: "Case file {$dossier->numero_dossier} was returned to preparation.",
            note: $note
        );
    }

    public function recordEscalation(
        Dossier $dossier,
        ?User $actor,
        string $fromStatus,
        string $toStatus,
        ?string $note = null
    ): void {
        $this->record(
            dossier: $dossier,
            actor: $actor,
            eventType: 'DOSSIER_ESCALATED',
            fromStatus: $fromStatus,
            toStatus: $toStatus,
            title: 'Case file escalated',
            description: "Case file {$dossier->numero_dossier} was escalated for hierarchical review.",
            note: $note
        );
    }

    public function recordSupervisorApproval(
        Dossier $dossier,
        ?User $actor,
        string $fromStatus,
        string $toStatus,
        ?string $note = null
    ): void {
        $this->record(
            dossier: $dossier,
            actor: $actor,
            eventType: 'SUPERVISOR_APPROVED_ESCALATION',
            fromStatus: $fromStatus,
            toStatus: $toStatus,
            title: 'Escalation approved',
            description: "Supervisor approved escalation for case file {$dossier->numero_dossier}.",
            note: $note
        );
    }

    public function recordSupervisorReturn(
        Dossier $dossier,
        ?User $actor,
        string $fromStatus,
        string $toStatus,
        ?string $note = null
    ): void {
        $this->record(
            dossier: $dossier,
            actor: $actor,
            eventType: 'SUPERVISOR_RETURNED_TO_CLAIMS_MANAGER',
            fromStatus: $fromStatus,
            toStatus: $toStatus,
            title: 'Case file returned to claims manager',
            description: "Supervisor returned case file {$dossier->numero_dossier} to the claims manager.",
            note: $note
        );
    }

    public function recordSupervisorComplement(
        Dossier $dossier,
        ?User $actor,
        string $fromStatus,
        string $toStatus,
        ?string $note = null
    ): void {
        $this->record(
            dossier: $dossier,
            actor: $actor,
            eventType: 'SUPERVISOR_REQUESTED_COMPLEMENT',
            fromStatus: $fromStatus,
            toStatus: $toStatus,
            title: 'Complement requested',
            description: "Supervisor requested complement for case file {$dossier->numero_dossier}.",
            note: $note
        );
    }

    public function recordProcessing(
        Dossier $dossier,
        ?User $actor,
        string $fromStatus,
        string $toStatus
    ): void {
        $this->record(
            dossier: $dossier,
            actor: $actor,
            eventType: 'DOSSIER_PROCESSED',
            fromStatus: $fromStatus,
            toStatus: $toStatus,
            title: 'Case file processed',
            description: "Case file {$dossier->numero_dossier} was processed."
        );
    }

    /**
     * Safely converts enums or plain strings to one stable string value.
     */
    private function normalizeEnumValue(mixed $value): ?string
    {
        if ($value instanceof BackedEnum) {
            return (string) $value->value;
        }

        if ($value === null) {
            return null;
        }

        return (string) $value;
    }
}