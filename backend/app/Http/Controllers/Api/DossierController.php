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

        $search = trim((string) $request->query('search', ''));
        $status = trim((string) $request->query('status', ''));
        $fromDate = trim((string) $request->query('from_date', ''));
        $toDate = trim((string) $request->query('to_date', ''));
        $sortBy = trim((string) $request->query('sort_by', 'created_at'));
        $sortDirection = strtolower(trim((string) $request->query('sort_direction', 'desc')));
        $perPage = max(1, min((int) $request->query('per_page', 10), 50));

        $allowedStatuses = array_map(
            fn (DossierStatus $case) => $case->value,
            DossierStatus::cases()
        );
        $allowedSortFields = ['numero_dossier', 'status', 'montant_total', 'created_at'];
        $allowedSortDirections = ['asc', 'desc'];

        if (! in_array($sortBy, $allowedSortFields, true)) {
            $sortBy = 'created_at';
        }

        if (! in_array($sortDirection, $allowedSortDirections, true)) {
            $sortDirection = 'desc';
        }

        $query = Dossier::query()
            ->withCount(['rubriques', 'documents']);

        if ($this->hasRole($user, UserRole::AGENT)) {
            $query->where('created_by', $user->id);
        } elseif ($this->hasRole($user, UserRole::GESTIONNAIRE)) {
            $query->whereIn('status', [
                DossierStatus::TO_VALIDATE->value,
                DossierStatus::PROCESSED->value,
            ]);
        } elseif (! $this->hasRole($user, UserRole::ADMIN)) {
            return response()->json([
                'message' => 'You are not allowed to view dossiers.',
            ], 403);
        }

        $query
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($subQuery) use ($search) {
                    $subQuery->where('numero_dossier', 'like', "%{$search}%")
                        ->orWhere('assured_identifier', 'like', "%{$search}%");
                });
            })
            ->when(in_array($status, $allowedStatuses, true), function ($q) use ($status) {
                $q->where('status', $status);
            })
            ->when($fromDate !== '', function ($q) use ($fromDate) {
                $q->whereDate('created_at', '>=', $fromDate);
            })
            ->when($toDate !== '', function ($q) use ($toDate) {
                $q->whereDate('created_at', '<=', $toDate);
            });

        $query
            ->orderBy($sortBy, $sortDirection)
            ->orderBy('id', $sortDirection);

        $dossiers = $query
            ->paginate($perPage)
            ->appends($request->query());

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
        ])->fresh(['creator', 'submitter', 'processor']);

        return response()->json([
            'message' => 'Dossier created successfully.',
            'dossier' => $this->formatDossierDetail($dossier),
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
            'submitter',
            'processor',
            'rubriques.creator',
            'rubriques.rejector',
            'rubriques.documents.extractions',
            'rubriques.documents.validator',
            'rubriques.documents.decisionMaker',
        ]);

        return response()->json([
            'dossier' => $this->formatDossierDetail($dossier),
            'rubriques' => $dossier->rubriques
                ->map(fn ($rubrique) => $this->formatRubriqueDetail($rubrique))
                ->values(),
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

        $dossier = $dossier->fresh(['creator', 'submitter', 'processor']);

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
                'message' => 'Only dossiers in RECEIVED status can be deleted.',
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
        $dossier->submitted_by = $user->id;
        $dossier->save();

        $dossier = $dossier->fresh(['creator', 'submitter', 'processor']);

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
        $dossier->processed_by = $user->id;
        $dossier->processed_at = now();
        $dossier->save();

        $dossier = $dossier->fresh(['creator', 'submitter', 'processor']);

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
            'submitted_by' => $dossier->submitted_by,
            'submitted_at' => $dossier->submitted_at,
            'processed_by' => $dossier->processed_by,
            'processed_at' => $dossier->processed_at,
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
            'submitted_by' => $dossier->submitted_by,
            'processed_by' => $dossier->processed_by,

            'submitted_at' => $dossier->submitted_at,
            'processed_at' => $dossier->processed_at,

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

            'created_at' => $dossier->created_at,
            'updated_at' => $dossier->updated_at,
        ];
    }

    private function formatRubriqueDetail($rubrique): array
    {
        return [
            'id' => $rubrique->id,
            'title' => $rubrique->title,
            'status' => $rubrique->status?->value ?? $rubrique->status,
            'notes' => $rubrique->notes,

            'created_by' => $rubrique->created_by,
            'rejected_by' => $rubrique->rejected_by,
            'rejected_at' => $rubrique->rejected_at,

            'creator' => $rubrique->creator ? [
                'id' => $rubrique->creator->id,
                'name' => $rubrique->creator->name,
                'email' => $rubrique->creator->email,
            ] : null,

            'rejector' => $rubrique->rejector ? [
                'id' => $rubrique->rejector->id,
                'name' => $rubrique->rejector->name,
                'email' => $rubrique->rejector->email,
            ] : null,

            'documents' => $this->formatRubriqueDocuments($rubrique->documents),
            'created_at' => $rubrique->created_at,
            'updated_at' => $rubrique->updated_at,
        ];
    }

    private function formatRubriqueDocuments($documents): array
    {
        return collect($documents)
            ->map(function ($document) {
                $payload = $document->toArray();
                $payload['status'] = $document->status?->value ?? $document->status;
                $payload['decision_status'] = $document->decision_status?->value ?? $document->decision_status;

                return $payload;
            })
            ->values()
            ->all();
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
