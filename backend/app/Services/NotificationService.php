<?php

namespace App\Services;

use App\Models\AppNotification;
use App\Models\Dossier;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    public function notifyUsers(array $userIds, array $payload): void
    {
        $uniqueUserIds = collect($userIds)
            ->filter(fn ($id) => ! is_null($id))
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        if ($uniqueUserIds->isEmpty()) {
            Log::warning('NotificationService: no recipients found.', [
                'type' => $payload['type'] ?? null,
                'dossier_id' => $payload['dossier_id'] ?? null,
            ]);
            return;
        }

        $rows = $uniqueUserIds->map(function (int $userId) use ($payload) {
            return [
                'user_id' => $userId,
                'actor_id' => $payload['actor_id'] ?? null,
                'dossier_id' => $payload['dossier_id'] ?? null,
                'rubrique_id' => $payload['rubrique_id'] ?? null,
                'document_id' => $payload['document_id'] ?? null,
                'type' => $payload['type'],
                'title' => $payload['title'],
                'message' => $payload['message'],
                'action_url' => $payload['action_url'] ?? null,
                'is_read' => false,
                'read_at' => null,
                'meta' => isset($payload['meta']) ? json_encode($payload['meta']) : null,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        })->all();

        try {
            AppNotification::insert($rows);
        } catch (\Throwable $e) {
            Log::error('NotificationService: failed to create notifications.', [
                'error' => $e->getMessage(),
                'type' => $payload['type'] ?? null,
                'dossier_id' => $payload['dossier_id'] ?? null,
                'recipient_count' => $uniqueUserIds->count(),
            ]);
        }
    }

    public function notifyPreparationOwner(
        Dossier $dossier,
        User $actor,
        string $type,
        string $title,
        string $message
    ): void {
        $ownerId = $dossier->created_by;

        if (! $ownerId) {
            Log::warning('NotificationService: dossier has no preparation owner.', [
                'type' => $type,
                'dossier_id' => $dossier->id,
            ]);
            return;
        }

        $this->notifyUsers([$ownerId], $this->buildPayload(
            dossier: $dossier,
            actor: $actor,
            type: $type,
            title: $title,
            message: $message,
        ));
    }

    public function notifyAllClaimsManagers(
        User $actor,
        Dossier $dossier,
        string $type,
        string $title,
        string $message
    ): void {
        $recipientIds = User::query()
            ->where('role', 'CLAIMS_MANAGER')
            ->where('is_active', true)
            ->pluck('id')
            ->all();

        $this->notifyUsers($recipientIds, $this->buildPayload(
            dossier: $dossier,
            actor: $actor,
            type: $type,
            title: $title,
            message: $message,
        ));
    }

    public function notifySupervisors(
        User $actor,
        Dossier $dossier,
        string $type,
        string $title,
        string $message
    ): void {
        $recipientIds = User::query()
            ->where('role', 'SUPERVISOR')
            ->where('is_active', true)
            ->pluck('id')
            ->all();

        $this->notifyUsers($recipientIds, $this->buildPayload(
            dossier: $dossier,
            actor: $actor,
            type: $type,
            title: $title,
            message: $message,
        ));
    }

    private function buildPayload(
        Dossier $dossier,
        User $actor,
        string $type,
        string $title,
        string $message
    ): array {
        return [
            'actor_id' => $actor->id,
            'dossier_id' => $dossier->id,
            'rubrique_id' => null,
            'document_id' => null,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'action_url' => '/dossiers/' . $dossier->id,
            'meta' => [
                'numero_dossier' => $dossier->numero_dossier,
                'dossier_status' => $dossier->status?->value ?? $dossier->status,
            ],
        ];
    }
}