<?php

namespace App\Http\Controllers\Api;

use App\Enums\DocumentStatus;
use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\FieldCorrection;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DocumentValidationController extends Controller
{
    /**
     * Validate a document, record field corrections,
     * and create a new validated extraction version.
     */
    public function validateDocument(Request $request, Document $document)
    {
        // Only the owner can validate the document for now.
        if ($document->user_id !== auth()->id()) {
            abort(403, 'Unauthorized validation attempt.');
        }

        // Fast pre-check before entering the transaction.
        if ($document->status !== DocumentStatus::PROCESSED) {
            return response()->json([
                'message' => 'Document not eligible for validation.',
                'current_status' => $document->status->value,
            ], 400);
        }

        $validated = $request->validate([
            'fields' => ['required', 'array'],
            'fields.invoice_date' => ['nullable', 'string'],
            'fields.provider_name' => ['nullable', 'string'],
            'fields.total_ttc' => ['nullable', 'numeric'],
        ]);

        try {
            return DB::transaction(function () use ($validated, $document) {
                // Lock the document row first to prevent concurrent validation.
                $document = Document::whereKey($document->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                // Re-check status inside the transaction after the lock.
                if ($document->status !== DocumentStatus::PROCESSED) {
                    return response()->json([
                        'message' => 'Document not eligible for validation.',
                        'current_status' => $document->status->value,
                    ], 400);
                }

                $allowedFields = ['invoice_date', 'provider_name', 'total_ttc'];

                // Lock the latest extraction so version creation stays consistent.
                $latestExtraction = $document->extractions()
                    ->lockForUpdate()
                    ->latest('version')
                    ->first();

                if (!$latestExtraction) {
                    return response()->json([
                        'message' => 'No extraction found for this document.',
                    ], 404);
                }

                if (!$latestExtraction->ai_request_id) {
                    throw new \RuntimeException('Extraction has no ai_request_id; cannot create a new version safely.');
                }

                $originalFields = $latestExtraction->result_json['fields'] ?? [];

                $inputFields = array_intersect_key(
                    $validated['fields'],
                    array_flip($allowedFields)
                );

                $newFields = array_merge($originalFields, $inputFields);

                $warnings = [];

                // Business rule: validate and normalize invoice date.
                $invoiceDate = $newFields['invoice_date'] ?? null;
                if ($invoiceDate) {
                    $formats = ['Y-m-d', 'd/m/Y', 'Y/m/d'];
                    $parsedDate = null;

                    foreach ($formats as $format) {
                        try {
                            $date = Carbon::createFromFormat($format, $invoiceDate);

                            if ($date && $date->format($format) === $invoiceDate) {
                                $parsedDate = $date;
                                break;
                            }
                        } catch (\Exception $e) {
                            // Try the next format.
                        }
                    }

                    if (!$parsedDate) {
                        throw ValidationException::withMessages([
                            'fields.invoice_date' => [
                                'Supported formats: YYYY-MM-DD, DD/MM/YYYY, YYYY/MM/DD',
                            ],
                        ]);
                    }

                    // Normalize to ISO format for consistency.
                    $newFields['invoice_date'] = $parsedDate->format('Y-m-d');

                    if ($parsedDate->isFuture()) {
                        $warnings[] = 'Invoice date is in the future.';
                    }
                }

                // Business rule: amount must be strictly positive.
                $totalTTC = $newFields['total_ttc'] ?? null;
                if (!is_null($totalTTC) && $totalTTC <= 0) {
                    throw ValidationException::withMessages([
                        'fields.total_ttc' => ['Amount must be positive.'],
                    ]);
                }

                // Business rule: flag unusually high amounts.
                if (!is_null($totalTTC) && $totalTTC > 10000) {
                    $warnings[] = 'High amount detected: requires supervisor review.';
                }

                // Record only fields that actually changed.
                foreach ($allowedFields as $fieldName) {
                    $oldValue = $originalFields[$fieldName] ?? null;
                    $newValue = $newFields[$fieldName] ?? null;

                    $changed = ($fieldName === 'total_ttc' && is_numeric($oldValue) && is_numeric($newValue))
                        ? ((float) $oldValue !== (float) $newValue)
                        : ($oldValue != $newValue);

                    if ($changed) {
                        FieldCorrection::create([
                            'document_id' => $document->id,
                            'field_name' => $fieldName,
                            'original_value' => is_null($oldValue) ? null : (string) $oldValue,
                            'corrected_value' => is_null($newValue) ? null : (string) $newValue,
                            'user_id' => auth()->id(),
                        ]);
                    }
                }

                // Create a new extraction version instead of modifying the raw AI one.
                $newVersion = $latestExtraction->version + 1;

                $newResultJson = $latestExtraction->result_json;
                $newResultJson['fields'] = $newFields;
                $newResultJson['meta'] = array_merge(
                    $newResultJson['meta'] ?? [],
                    [
                        'validated' => true,
                        'validated_at' => now()->toISOString(),
                        'validated_by' => auth()->id(),
                        'source' => 'human_validation',
                    ]
                );

                $newExtraction = $document->extractions()->create([
                    'ai_request_id' => $latestExtraction->ai_request_id,
                    'version' => $newVersion,
                    'result_json' => $newResultJson,
                ]);

                // Once validated, the document becomes immutable in the workflow.
                $document->update([
                    'status' => DocumentStatus::VALIDATED,
                    'error_message' => null,
                    'validated_by' => auth()->id(),
                    'validated_at' => now(),
                ]);

                return response()->json([
                    'message' => 'Document validated successfully.',
                    'warnings' => $warnings,
                    'document' => [
                        'id' => $document->id,
                        'status' => $document->status->value,
                        'validated_by' => $document->validated_by,
                        'validated_at' => $document->validated_at,
                    ],
                    'latest_extraction' => array_merge(
                        ['version' => $newExtraction->version],
                        $newExtraction->result_json
                    ),
                ], 200);
            });
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Validation failed.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}