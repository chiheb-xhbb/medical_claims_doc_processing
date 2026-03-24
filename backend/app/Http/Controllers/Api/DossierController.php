<?php

namespace App\Http\Controllers\Api;

use App\Enums\DocumentStatus;
use App\Enums\DossierStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\AttachDocumentsRequest;
use App\Http\Requests\StoreDossierRequest;
use App\Http\Requests\UpdateDossierRequest;
use App\Models\Document;
use App\Models\Dossier;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DossierController extends Controller
{
    public function index(): JsonResponse
    {
        $dossiers = Dossier::where('created_by', auth()->id())
            ->withCount('documents')
            ->latest()
            ->paginate(10);

        return response()->json($dossiers, 200);
    }

    public function store(StoreDossierRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $dossier = Dossier::create([
            'assured_identifier' => $validated['assured_identifier'],
            'episode_description' => $validated['episode_description'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'created_by' => auth()->id(),
            'status' => DossierStatus::RECU,
        ]);

        return response()->json([
            'message' => 'Dossier created successfully.',
            'dossier' => [
                'id' => $dossier->id,
                'numero_dossier' => $dossier->numero_dossier,
                'assured_identifier' => $dossier->assured_identifier,
                'status' => $dossier->status->value,
                'montant_total' => $dossier->montant_total,
                'episode_description' => $dossier->episode_description,
                'notes' => $dossier->notes,
                'created_by' => $dossier->created_by,
                'created_at' => $dossier->created_at,
                'updated_at' => $dossier->updated_at,
            ],
        ], 201);
    }

    public function show(Dossier $dossier): JsonResponse
    {
        if ($dossier->created_by !== auth()->id()) {
            abort(403, 'Unauthorized access to this dossier.');
        }

        $dossier->load([
            'documents' => function ($query) {
                $query->latest();
            }
        ]);

        return response()->json([
            'dossier' => [
                'id' => $dossier->id,
                'numero_dossier' => $dossier->numero_dossier,
                'assured_identifier' => $dossier->assured_identifier,
                'status' => $dossier->status->value,
                'montant_total' => $dossier->montant_total,
                'display_total' => $dossier->getDisplayTotal(),
                'episode_description' => $dossier->episode_description,
                'notes' => $dossier->notes,
                'created_by' => $dossier->created_by,
                'validated_by' => $dossier->validated_by,
                'validated_at' => $dossier->validated_at,
                'submitted_at' => $dossier->submitted_at,
                'created_at' => $dossier->created_at,
                'updated_at' => $dossier->updated_at,
            ],
            'documents' => $dossier->documents,
        ], 200);
    }

    public function update(UpdateDossierRequest $request, Dossier $dossier): JsonResponse
    {
        if ($dossier->created_by !== auth()->id()) {
            abort(403, 'Unauthorized access to this dossier.');
        }

        if ($dossier->isTotalFrozen()) {
            return response()->json([
                'message' => 'Cannot update a frozen dossier.',
                'current_status' => $dossier->status->value,
            ], 400);
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

        return response()->json([
            'message' => 'Dossier updated successfully.',
            'dossier' => [
                'id' => $dossier->id,
                'numero_dossier' => $dossier->numero_dossier,
                'assured_identifier' => $dossier->assured_identifier,
                'status' => $dossier->status->value,
                'montant_total' => $dossier->montant_total,
                'display_total' => $dossier->getDisplayTotal(),
                'episode_description' => $dossier->episode_description,
                'notes' => $dossier->notes,
                'updated_at' => $dossier->updated_at,
            ],
        ], 200);
    }

    public function destroy(Dossier $dossier): JsonResponse
    {
        if ($dossier->created_by !== auth()->id()) {
            abort(403, 'Unauthorized access to this dossier.');
        }

        if (! $dossier->canBeDeleted()) {
            return response()->json([
                'message' => 'Cannot delete this dossier in its current status.',
                'current_status' => $dossier->status->value,
            ], 400);
        }

        $dossier->delete();

        return response()->json([
            'message' => 'Dossier deleted successfully.',
        ], 200);
    }

    public function attachDocuments(AttachDocumentsRequest $request, Dossier $dossier): JsonResponse
    {
        if ($dossier->created_by !== auth()->id()) {
            abort(403, 'Unauthorized access to this dossier.');
        }

        if ($dossier->isTotalFrozen()) {
            return response()->json([
                'message' => 'Cannot attach documents to a frozen dossier.',
                'current_status' => $dossier->status->value,
            ], 400);
        }

        $validated = $request->validated();

        try {
            return DB::transaction(function () use ($validated, $dossier) {
                $dossier = Dossier::whereKey($dossier->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($dossier->created_by !== auth()->id()) {
                    abort(403, 'Unauthorized access to this dossier.');
                }

                if ($dossier->isTotalFrozen()) {
                    return response()->json([
                        'message' => 'Cannot attach documents to a frozen dossier.',
                        'current_status' => $dossier->status->value,
                    ], 400);
                }

                $documentsToAttach = [];
                $attachedCount = 0;

                // First we lock and validate everything.
                foreach ($validated['document_ids'] as $documentId) {
                    $document = Document::whereKey($documentId)
                        ->lockForUpdate()
                        ->firstOrFail();

                    if ($document->user_id !== auth()->id()) {
                        abort(403, 'Unauthorized access to one or more documents.');
                    }

                    if ($document->status !== DocumentStatus::VALIDATED) {
                        return response()->json([
                            'message' => 'Only VALIDATED documents can be attached to a dossier.',
                            'document_id' => $document->id,
                            'current_status' => $document->status->value,
                        ], 400);
                    }

                    if (! is_null($document->dossier_id) && $document->dossier_id !== $dossier->id) {
                        return response()->json([
                            'message' => 'One or more documents are already attached to another dossier.',
                            'document_id' => $document->id,
                            'current_dossier_id' => $document->dossier_id,
                        ], 400);
                    }

                    $documentsToAttach[] = $document;
                }

                // Then we attach them.
                foreach ($documentsToAttach as $document) {
                    if ($document->dossier_id !== $dossier->id) {
                        $document->update([
                            'dossier_id' => $dossier->id,
                        ]);

                        $attachedCount++;
                    }
                }

                $dossier->updateTotal();
                $dossier->refresh();

                return response()->json([
                    'message' => 'Documents attached successfully.',
                    'attached_count' => $attachedCount,
                    'dossier' => [
                        'id' => $dossier->id,
                        'numero_dossier' => $dossier->numero_dossier,
                        'status' => $dossier->status->value,
                        'montant_total' => $dossier->montant_total,
                        'display_total' => $dossier->getDisplayTotal(),
                    ],
                ], 200);
            });
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Failed to attach documents.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}