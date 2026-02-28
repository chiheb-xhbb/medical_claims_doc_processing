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
    // 1. Added $docType to the parameters with a default value
    public function store(UploadedFile $file, ?int $userId = null, string $docType = 'medical_invoice'): Document
    {
        $extension = $file->getClientOriginalExtension();
        $filename = Str::uuid() . '.' . $extension;

        $datePath = 'documents/' . now()->format('Y/m');
        $fullPath = $datePath . '/' . $filename;

        // Write the file to the disk first
        Storage::disk('local')->putFileAs($datePath, $file, $filename);

        try {
            // Try to save to the database
            return DB::transaction(function () use ($file, $fullPath, $userId, $docType) {
                $document = Document::create([
                    'user_id' => $userId,
                    'original_filename' => $file->getClientOriginalName(),
                    'file_path' => $fullPath,
                    'mime_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                    'doc_type' => $docType, // 2. Save the doc_type to the database!
                    'status' => DocumentStatus::UPLOADED,
                ]);

                ProcessDocumentJob::dispatch($document->id)->afterCommit();

                return $document;
            });
        } catch (\Exception $e) {
            // 3. ARCHITECTURE FIX: If the database transaction fails, 
            // we delete the physical file so we don't leak storage space.
            Storage::disk('local')->delete($fullPath);
            
            throw $e; // Re-throw the error so Laravel knows it failed
        }
    }
}