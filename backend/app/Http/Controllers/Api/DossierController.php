<?php

namespace App\Http\Controllers\Api;

use App\Enums\DossierStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDossierRequest;
use App\Http\Requests\UpdateDossierRequest;
use App\Models\Dossier;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DossierController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $query = Dossier::query()
            ->withCount(['rubriques', 'documents']);

        if ($this->hasRole($user, UserRole::AGENT)) {
            // Agent sees all dossiers created by themselves, whatever the status.
            $query->where('created_by', $user->id);
        } elseif ($this->hasRole($user, UserRole::GESTIONNAIRE)) {
            // Gestionnaire sees dossiers relevant for review/history.
            $query->whereIn('status', [
                DossierStatus::TO_VALIDATE->value,
                DossierStatus::PROCESSED->value,
                DossierStatus::EXPORTED->value,
            ]);
        } elseif (! $this->hasRole($user, UserRole::ADMIN)) {
            return response()->json([
                'message' => 'You are not allowed to view dossiers.',
            ], 403);
        }

        $dossiers = $query
            ->latest()
            ->paginate(10);

        $dossiers->getCollection()->transform(function (Dossier $dossier) {
            return $this->formatDossierSummary($dossier);
        });

        return response()->json($dossiers, 200);
    }

    public function store(StoreDossierRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $this->canPrepareDossiers($user)) {
            return response()->json([
                'message' => 'You are not allowed to create dossiers.',
            ], 403);
        }

        $validated = $request->validated();

        $dossier = Dossier::create([
            'assured_identifier' => $validated['assured_identifier'],
            'episode_description' => $validated['episode_description'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'created_by' => $user->id,
            'status' => DossierStatus::RECEIVED,
        ]);

        return response()->json([
            'message' => 'Dossier created successfully.',
            'dossier' => $this->formatDossierDetail($dossier->fresh()),
            'requested_total' => $dossier->getRequestedTotal(),
            'current_total' => $dossier->getCurrentTotal(),
            'display_total' => $dossier->getDisplayTotal(),
        ], 201);
    }

    public function show(Request $request, Dossier $dossier): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $this->canViewDossier($user, $dossier)) {
            return response()->json([
                'message' => 'You are not allowed to view this dossier.',
            ], 403);
        }

        $dossier->load([
            'creator',
            'rubriques.creator',
            'rubriques.documents.extractions',
            'rubriques.documents.decisionMaker',
        ]);

        return response()->json([
            'dossier' => $this->formatDossierDetail($dossier),
            'rubriques' => $dossier->rubriques,
            'requested_total' => $dossier->getRequestedTotal(),
            'current_total' => $dossier->getCurrentTotal(),
            'display_total' => $dossier->getDisplayTotal(),
        ], 200);
    }

    public function update(UpdateDossierRequest $request, Dossier $dossier): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $this->canManageOwnDossier($user, $dossier)) {
            return response()->json([
                'message' => 'You are not allowed to update this dossier.',
            ], 403);
        }

        if ($dossier->isFrozen()) {
            return response()->json([
                'message' => 'Cannot update a frozen dossier.',
                'current_status' => $dossier->status->value,
            ], 422);
        }

        $validated = $request->validated();

        $dossier->update([
            'episode_description' => array_key_exists('episode_description', $validated)
                ? $validated['episode_description']
                : $dossier->episode_description,
            'notes' => array_key_exists('notes', $validated)
                ? $validated['notes']
                : $dossier->notes,
        ]);

        $dossier->refresh();

        return response()->json([
            'message' => 'Dossier updated successfully.',
            'dossier' => $this->formatDossierDetail($dossier),
            'requested_total' => $dossier->getRequestedTotal(),
            'current_total' => $dossier->getCurrentTotal(),
            'display_total' => $dossier->getDisplayTotal(),
        ], 200);
    }

    public function destroy(Request $request, Dossier $dossier): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $this->canManageOwnDossier($user, $dossier)) {
            return response()->json([
                'message' => 'You are not allowed to delete this dossier.',
            ], 403);
        }

        if (! $dossier->canBeDeleted()) {
            return response()->json([
                'message' => 'Cannot delete this dossier in its current status.',
                'current_status' => $dossier->status->value,
            ], 422);
        }

        $dossier->delete();

        return response()->json([
            'message' => 'Dossier deleted successfully.',
        ], 200);
    }

    public function submit(Request $request, Dossier $dossier): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $this->canPrepareDossiers($user) || ! $this->canManageOwnDossier($user, $dossier)) {
            return response()->json([
                'message' => 'You are not allowed to submit this dossier.',
            ], 403);
        }

        if ($dossier->isFrozen()) {
            return response()->json([
                'message' => 'This dossier is frozen and cannot be submitted.',
            ], 422);
        }

        if (! $dossier->canBeSubmitted()) {
            return response()->json([
                'message' => 'This dossier is not ready to be submitted.',
            ], 422);
        }

        $dossier->status = DossierStatus::TO_VALIDATE;
        $dossier->submitted_at = now();
        $dossier->save();

        $dossier->refresh();

        return response()->json([
            'message' => 'Dossier submitted successfully.',
            'dossier' => $this->formatDossierDetail($dossier),
            'requested_total' => $dossier->getRequestedTotal(),
            'current_total' => $dossier->getCurrentTotal(),
            'display_total' => $dossier->getDisplayTotal(),
        ], 200);
    }

    public function process(Request $request, Dossier $dossier): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $this->canReviewDossiers($user)) {
            return response()->json([
                'message' => 'You are not allowed to process this dossier.',
            ], 403);
        }

        if ($dossier->isFrozen()) {
            return response()->json([
                'message' => 'This dossier is already frozen.',
            ], 422);
        }

        if (! $dossier->canBeProcessed()) {
            return response()->json([
                'message' => 'This dossier cannot be processed yet.',
            ], 422);
        }

        $dossier->status = DossierStatus::PROCESSED;
        $dossier->montant_total = $dossier->getCurrentTotal();
        $dossier->save();

        $dossier->refresh();

        return response()->json([
            'message' => 'Dossier processed successfully.',
            'dossier' => $this->formatDossierDetail($dossier),
            'requested_total' => $dossier->getRequestedTotal(),
            'current_total' => $dossier->getCurrentTotal(),
            'display_total' => $dossier->getDisplayTotal(),
        ], 200);
    }

    private function formatDossierSummary(Dossier $dossier): array
    {
        return [
            'id' => $dossier->id,
            'numero_dossier' => $dossier->numero_dossier,
            'assured_identifier' => $dossier->assured_identifier,
            'status' => $dossier->status->value,
            'montant_total' => $dossier->montant_total,
            'display_total' => $dossier->getDisplayTotal(),
            'rubriques_count' => $dossier->rubriques_count ?? 0,
            'documents_count' => $dossier->documents_count ?? 0,
            'created_by' => $dossier->created_by,
            'created_at' => $dossier->created_at,
            'updated_at' => $dossier->updated_at,
        ];
    }

    private function formatDossierDetail(Dossier $dossier): array
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
            'submitted_at' => $dossier->submitted_at,
            'created_at' => $dossier->created_at,
            'updated_at' => $dossier->updated_at,
        ];
    }

    private function canPrepareDossiers(User $user): bool
    {
        return $this->hasRole($user, UserRole::AGENT, UserRole::ADMIN);
    }

    private function canReviewDossiers(User $user): bool
    {
        return $this->hasRole($user, UserRole::GESTIONNAIRE, UserRole::ADMIN);
    }

    private function canManageOwnDossier(User $user, Dossier $dossier): bool
    {
        if ($this->hasRole($user, UserRole::ADMIN)) {
            return true;
        }

        return $this->hasRole($user, UserRole::AGENT)
            && (int) $dossier->created_by === (int) $user->id;
    }

    private function canViewDossier(User $user, Dossier $dossier): bool
    {
        if ($this->hasRole($user, UserRole::ADMIN)) {
            return true;
        }

        if ($this->hasRole($user, UserRole::AGENT)) {
            return (int) $dossier->created_by === (int) $user->id;
        }

        if ($this->hasRole($user, UserRole::GESTIONNAIRE)) {
            return in_array($dossier->status->value, [
                DossierStatus::TO_VALIDATE->value,
                DossierStatus::PROCESSED->value,
                DossierStatus::EXPORTED->value,
            ], true);
        }

        return false;
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
}