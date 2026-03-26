<?php

namespace App\Http\Controllers\Api;

use App\Enums\DocumentDecisionStatus;
use App\Enums\DocumentStatus;
use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Dossier;
use App\Models\Rubrique;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DocumentDecisionController extends Controller
{
    public function accept(Request $request, Document $document): JsonResponse
    {
        $user = $request->user();
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

        if ((int) $dossier->created_by !== (int) $user->id) {
            return response()->json([
                'message' => 'You are not allowed to accept this document.',
            ], 403);
        }

        if ($dossier->isFrozen()) {
            return response()->json([
                'message' => 'This dossier is frozen and cannot be modified.',
            ], 422);
        }

        if ($document->status !== DocumentStatus::VALIDATED) {
            return response()->json([
                'message' => 'Only validated documents can be accepted.',
            ], 422);
        }

        $validated = $request->validate([
            'decision_note' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($document, $user, $validated) {
            $lockedDocument = Document::query()
                ->whereKey($document->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedDocument->rubrique_id) {
                $this->unprocessable('This document is not attached to any rubrique.');
            }

            $lockedRubrique = Rubrique::query()
                ->whereKey($lockedDocument->rubrique_id)
                ->lockForUpdate()
                ->firstOrFail();

            $lockedDossier = Dossier::query()
                ->whereKey($lockedRubrique->dossier_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ((int) $lockedDossier->created_by !== (int) $user->id) {
                $this->forbidden('You are not allowed to accept this document.');
            }

            if ($lockedDossier->isFrozen()) {
                $this->unprocessable('This dossier is frozen and cannot be modified.');
            }

            if ($lockedDocument->status !== DocumentStatus::VALIDATED) {
                $this->unprocessable('Only validated documents can be accepted.');
            }

            $lockedDocument->decision_status = DocumentDecisionStatus::ACCEPTED;
            $lockedDocument->decision_by = $user->id;
            $lockedDocument->decision_at = now();
            $lockedDocument->decision_note = $validated['decision_note'] ?? null;
            $lockedDocument->save();

            $lockedRubrique->refreshStatusFromDocuments();
            $lockedDossier->updateTotal();
        });

        return response()->json([
            'message' => 'Document accepted successfully.',
            'document' => $document->fresh(['rubrique']),
        ]);
    }

    public function reject(Request $request, Document $document): JsonResponse
    {
        $user = $request->user();
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

        if ((int) $dossier->created_by !== (int) $user->id) {
            return response()->json([
                'message' => 'You are not allowed to reject this document.',
            ], 403);
        }

        if ($dossier->isFrozen()) {
            return response()->json([
                'message' => 'This dossier is frozen and cannot be modified.',
            ], 422);
        }

        if ($document->status !== DocumentStatus::VALIDATED) {
            return response()->json([
                'message' => 'Only validated documents can be rejected.',
            ], 422);
        }

        $validated = $request->validate([
            'decision_note' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($document, $user, $validated) {
            $lockedDocument = Document::query()
                ->whereKey($document->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedDocument->rubrique_id) {
                $this->unprocessable('This document is not attached to any rubrique.');
            }

            $lockedRubrique = Rubrique::query()
                ->whereKey($lockedDocument->rubrique_id)
                ->lockForUpdate()
                ->firstOrFail();

            $lockedDossier = Dossier::query()
                ->whereKey($lockedRubrique->dossier_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ((int) $lockedDossier->created_by !== (int) $user->id) {
                $this->forbidden('You are not allowed to reject this document.');
            }

            if ($lockedDossier->isFrozen()) {
                $this->unprocessable('This dossier is frozen and cannot be modified.');
            }

            if ($lockedDocument->status !== DocumentStatus::VALIDATED) {
                $this->unprocessable('Only validated documents can be rejected.');
            }

            $lockedDocument->decision_status = DocumentDecisionStatus::REJECTED;
            $lockedDocument->decision_by = $user->id;
            $lockedDocument->decision_at = now();
            $lockedDocument->decision_note = $validated['decision_note'] ?? null;
            $lockedDocument->save();

            $lockedRubrique->refreshStatusFromDocuments();
            $lockedDossier->updateTotal();
        });

        return response()->json([
            'message' => 'Document rejected successfully.',
            'document' => $document->fresh(['rubrique']),
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