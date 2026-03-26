<?php

namespace App\Http\Controllers\Api;

use App\Enums\DocumentDecisionStatus;
use App\Enums\DocumentStatus;
use App\Enums\DossierStatus;
use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Dossier;
use App\Models\Rubrique;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RubriqueController extends Controller
{
    public function store(Request $request, Dossier $dossier): JsonResponse
    {
        $user = $request->user();

        if ((int) $dossier->created_by !== (int) $user->id) {
            return response()->json([
                'message' => 'You are not allowed to add rubriques to this dossier.',
            ], 403);
        }

        if ($dossier->isFrozen()) {
            return response()->json([
                'message' => 'This dossier is frozen and cannot be modified.',
            ], 422);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $rubrique = DB::transaction(function () use ($dossier, $user, $validated) {
            $lockedDossier = Dossier::query()
                ->whereKey($dossier->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ((int) $lockedDossier->created_by !== (int) $user->id) {
                $this->forbidden('You are not allowed to add rubriques to this dossier.');
            }

            if ($lockedDossier->isFrozen()) {
                $this->unprocessable('This dossier is frozen and cannot be modified.');
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
        $user = $request->user();
        $dossier = $rubrique->dossier;

        if (! $dossier) {
            return response()->json([
                'message' => 'Parent dossier not found.',
            ], 404);
        }

        if ((int) $dossier->created_by !== (int) $user->id) {
            return response()->json([
                'message' => 'You are not allowed to update this rubrique.',
            ], 403);
        }

        if ($dossier->isFrozen()) {
            return response()->json([
                'message' => 'This dossier is frozen and cannot be modified.',
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
        ]);
    }

    public function destroy(Request $request, Rubrique $rubrique): JsonResponse
    {
        $user = $request->user();
        $dossier = $rubrique->dossier;

        if (! $dossier) {
            return response()->json([
                'message' => 'Parent dossier not found.',
            ], 404);
        }

        if ((int) $dossier->created_by !== (int) $user->id) {
            return response()->json([
                'message' => 'You are not allowed to delete this rubrique.',
            ], 403);
        }

        if ($dossier->isFrozen()) {
            return response()->json([
                'message' => 'This dossier is frozen and cannot be modified.',
            ], 422);
        }

        DB::transaction(function () use ($rubrique, $dossier, $user) {
            $lockedRubrique = Rubrique::query()
                ->whereKey($rubrique->id)
                ->lockForUpdate()
                ->firstOrFail();

            $lockedDossier = Dossier::query()
                ->whereKey($dossier->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ((int) $lockedDossier->created_by !== (int) $user->id) {
                $this->forbidden('You are not allowed to delete this rubrique.');
            }

            if ($lockedDossier->isFrozen()) {
                $this->unprocessable('This dossier is frozen and cannot be modified.');
            }

            if ($lockedRubrique->documents()->exists()) {
                $this->unprocessable('You cannot delete a rubrique that already contains documents.');
            }

            $lockedRubrique->delete();
        });

        return response()->json([
            'message' => 'Rubrique deleted successfully.',
        ]);
    }

    public function attachDocuments(Request $request, Rubrique $rubrique): JsonResponse
    {
        $user = $request->user();
        $dossier = $rubrique->dossier;

        if (! $dossier) {
            return response()->json([
                'message' => 'Parent dossier not found.',
            ], 404);
        }

        if ((int) $dossier->created_by !== (int) $user->id) {
            return response()->json([
                'message' => 'You are not allowed to attach documents to this rubrique.',
            ], 403);
        }

        if ($dossier->isFrozen()) {
            return response()->json([
                'message' => 'This dossier is frozen and cannot be modified.',
            ], 422);
        }

        $validated = $request->validate([
            'document_ids' => ['required', 'array', 'min:1'],
            'document_ids.*' => ['integer', 'distinct', 'exists:documents,id'],
        ]);

        $documentIds = collect($validated['document_ids'])
            ->map(fn ($id) => (int) $id)
            ->values();

        DB::transaction(function () use ($rubrique, $dossier, $user, $documentIds) {
            $lockedRubrique = Rubrique::query()
                ->whereKey($rubrique->id)
                ->lockForUpdate()
                ->firstOrFail();

            $lockedDossier = Dossier::query()
                ->whereKey($dossier->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ((int) $lockedDossier->created_by !== (int) $user->id) {
                $this->forbidden('You are not allowed to attach documents to this rubrique.');
            }

            if ($lockedDossier->isFrozen()) {
                $this->unprocessable('This dossier is frozen and cannot be modified.');
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
                $document = $documents->get($documentId);

                if ((int) $document->user_id !== (int) $user->id) {
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
        ]);
    }

    public function detachDocument(Request $request, Rubrique $rubrique, Document $document): JsonResponse
    {
        $user = $request->user();
        $dossier = $rubrique->dossier;

        if (! $dossier) {
            return response()->json([
                'message' => 'Parent dossier not found.',
            ], 404);
        }

        if ((int) $dossier->created_by !== (int) $user->id) {
            return response()->json([
                'message' => 'You are not allowed to detach documents from this rubrique.',
            ], 403);
        }

        if ($dossier->isFrozen()) {
            return response()->json([
                'message' => 'This dossier is frozen and cannot be modified.',
            ], 422);
        }

        if ((int) $document->rubrique_id !== (int) $rubrique->id) {
            return response()->json([
                'message' => 'This document does not belong to this rubrique.',
            ], 422);
        }

        DB::transaction(function () use ($rubrique, $dossier, $document, $user) {
            $lockedRubrique = Rubrique::query()
                ->whereKey($rubrique->id)
                ->lockForUpdate()
                ->firstOrFail();

            $lockedDossier = Dossier::query()
                ->whereKey($dossier->id)
                ->lockForUpdate()
                ->firstOrFail();

            $lockedDocument = Document::query()
                ->whereKey($document->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ((int) $lockedDossier->created_by !== (int) $user->id) {
                $this->forbidden('You are not allowed to detach documents from this rubrique.');
            }

            if ($lockedDossier->isFrozen()) {
                $this->unprocessable('This dossier is frozen and cannot be modified.');
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
        ]);
    }

    public function rejectAll(Request $request, Rubrique $rubrique): JsonResponse
    {
        $user = $request->user();
        $dossier = $rubrique->dossier;

        if (! $dossier) {
            return response()->json([
                'message' => 'Parent dossier not found.',
            ], 404);
        }

        if ((int) $dossier->created_by !== (int) $user->id) {
            return response()->json([
                'message' => 'You are not allowed to reject this rubrique.',
            ], 403);
        }

        if ($dossier->isFrozen()) {
            return response()->json([
                'message' => 'This dossier is frozen and cannot be modified.',
            ], 422);
        }

        $validated = $request->validate([
            'decision_note' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($rubrique, $dossier, $user, $validated) {
            $lockedRubrique = Rubrique::query()
                ->whereKey($rubrique->id)
                ->lockForUpdate()
                ->firstOrFail();

            $lockedDossier = Dossier::query()
                ->whereKey($dossier->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ((int) $lockedDossier->created_by !== (int) $user->id) {
                $this->forbidden('You are not allowed to reject this rubrique.');
            }

            if ($lockedDossier->isFrozen()) {
                $this->unprocessable('This dossier is frozen and cannot be modified.');
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
        });

        return response()->json([
            'message' => 'Entire rubrique has been rejected.',
            'rubrique' => $rubrique->fresh(['documents']),
        ]);
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