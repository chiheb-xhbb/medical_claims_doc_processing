<?php

namespace App\Http\Controllers\Api;

use App\Enums\DocumentStatus;
use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\FieldCorrection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DocumentValidationController extends Controller
{
    /**
     * Validate a document and create field corrections.
     * Ensures atomic updates with transactions and records audit trail.
     */
    public function validateDocument(Request $request, Document $document)
    {
        // Step 0 — Only allow validation if the document is in PROCESSED state
        if ($document->status !== DocumentStatus::PROCESSED) {
            return response()->json([
                'message' => 'Document not eligible for validation.',
                'current_status' => $document->status->value,
            ], 400);
        }

        // Step 1 — Validate incoming fields
        $validated = $request->validate([
            'fields' => ['required', 'array'],
            'fields.invoice_date' => ['nullable', 'string'],
            'fields.provider_name' => ['nullable', 'string'],
            'fields.total_ttc' => ['nullable', 'numeric'],
        ]);

        // Step 2 — Perform all updates within a transaction for safety
        return DB::transaction(function () use ($validated, $document) {

            $allowedFields = ['invoice_date', 'provider_name', 'total_ttc'];

            // Step 2.1 — Lock the latest extraction to prevent version conflicts
            $latestExtraction = $document->extractions()
                ->lockForUpdate()
                ->latest('version')
                ->first();

            if (!$latestExtraction) {
                return response()->json([
                    'message' => 'No extraction found for this document.',
                ], 404);
            }

            // Step 2.2 — Ensure ai_request_id exists (required for versioning)
            if (!$latestExtraction->ai_request_id) {
                return response()->json([
                    'message' => 'Extraction has no ai_request_id; cannot create a new version safely.',
                ], 500);
            }

            // Step 2.3 — Prepare the merged fields (original + new)
            $originalFields = $latestExtraction->result_json['fields'] ?? [];

            $inputFields = array_intersect_key(
                $validated['fields'],
                array_flip($allowedFields)
            );

            $newFields = array_merge($originalFields, $inputFields);

            // Step 2.4 — Record only the fields that changed for audit
            foreach ($allowedFields as $fieldName) {
                $oldValue = $originalFields[$fieldName] ?? null;
                $newValue = $newFields[$fieldName] ?? null;

                // Numeric comparison for total_ttc, string comparison for others
                $changed = ($fieldName === 'total_ttc' && is_numeric($oldValue) && is_numeric($newValue))
                    ? ((float) $oldValue !== (float) $newValue)
                    : ($oldValue != $newValue);

                if ($changed) {
                    FieldCorrection::create([
                        'document_id' => $document->id,
                        'field_name' => $fieldName,
                        'original_value' => is_null($oldValue) ? null : (string) $oldValue,
                        'corrected_value' => is_null($newValue) ? null : (string) $newValue,
                        'user_id' => auth()->id(), // Null if no authentication
                    ]);
                }
            }

            // Step 2.5 — Create a new extraction version (increment version)
            $newVersion = $latestExtraction->version + 1;

            $newResultJson = $latestExtraction->result_json;
            $newResultJson['fields'] = $newFields;

            $newExtraction = $document->extractions()->create([
                'ai_request_id' => $latestExtraction->ai_request_id,
                'version' => $newVersion,
                'result_json' => $newResultJson,
            ]);

            // Step 2.6 — Update document status to VALIDATED
            $document->update([
                'status' => DocumentStatus::VALIDATED,
                'error_message' => null,
            ]);

            // Step 3 — Return the updated document and latest extraction
            return response()->json([
                'message' => 'Document validated successfully.',
                'document' => [
                    'id' => $document->id,
                    'status' => $document->status->value,
                ],
                'latest_extraction' => array_merge(
                    ['version' => $newExtraction->version],
                    $newExtraction->result_json
                ),
            ], 200);
        });
    }
}
