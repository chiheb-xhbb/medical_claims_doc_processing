<?php

namespace App\Services;

use App\Enums\DocumentStatus;
use App\Jobs\ProcessDocumentJob;
use App\Models\Document;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentService
{
    public function store(UploadedFile $file, ?int $userId = null, string $docType = 'medical_invoice'): Document
    {
        $extension = $file->getClientOriginalExtension();
        $filename = Str::uuid() . '.' . $extension;

        $datePath = 'documents/' . now()->format('Y/m');
        $fullPath = $datePath . '/' . $filename;

        // Store the physical file first so we never create a DB record
        // that points to a file which does not actually exist.
        $storedPath = Storage::disk('local')->putFileAs($datePath, $file, $filename);

        // Extra safety check in case storage returns an unexpected value.
        if (!$storedPath) {
            throw new \RuntimeException('Failed to store uploaded file.');
        }

        // Verify that the file really exists on disk before inserting into DB.
        if (!Storage::disk('local')->exists($fullPath)) {
            throw new \RuntimeException('Uploaded file was not found after storage.');
        }

        try {
            return DB::transaction(function () use ($file, $fullPath, $userId, $docType) {
                $document = Document::create([
                    'user_id' => $userId,
                    'original_filename' => $file->getClientOriginalName(),
                    'file_path' => $fullPath,
                    'mime_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                    'doc_type' => $docType,
                    'status' => DocumentStatus::UPLOADED,
                ]);

                // Dispatch the OCR/extraction job only after the DB transaction commits successfully.
                ProcessDocumentJob::dispatch($document->id)->afterCommit();

                return $document;
            });
        } catch (\Throwable $e) {
            // If the database transaction fails, remove the stored file
            // to avoid leaving orphan files on disk.
            Storage::disk('local')->delete($fullPath);

            throw $e;
        }
    }
}