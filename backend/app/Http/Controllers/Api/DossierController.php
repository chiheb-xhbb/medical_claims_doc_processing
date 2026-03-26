<?php

namespace App\Http\Controllers\Api;

use App\Enums\DossierStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDossierRequest;
use App\Http\Requests\UpdateDossierRequest;
use App\Models\Dossier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DossierController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $dossiers = Dossier::query()
            ->where('created_by', $request->user()->id)
            ->withCount(['rubriques', 'documents'])
            ->latest()
            ->paginate(10);

        $dossiers->getCollection()->transform(function (Dossier $dossier) {
            return $this->formatDossierSummary($dossier);
        });

        return response()->json($dossiers, 200);
    }

    public function store(StoreDossierRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $dossier = Dossier::create([
            'assured_identifier' => $validated['assured_identifier'],
            'episode_description' => $validated['episode_description'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'created_by' => $request->user()->id,
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
        if ((int) $dossier->created_by !== (int) $request->user()->id) {
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
        if ((int) $dossier->created_by !== (int) $request->user()->id) {
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
        if ((int) $dossier->created_by !== (int) $request->user()->id) {
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

    public function submit(Request $request, Dossier $dossier): JsonResponse
    {
        if ((int) $dossier->created_by !== (int) $request->user()->id) {
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
        ]);
    }

    public function process(Request $request, Dossier $dossier): JsonResponse
    {
        if ((int) $dossier->created_by !== (int) $request->user()->id) {
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
        ]);
    }
}