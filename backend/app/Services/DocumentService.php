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
    public function store(UploadedFile $file, ?int $userId = null): Document
    {
        $extension = $file->getClientOriginalExtension();
        $filename = Str::uuid() . '.' . $extension;

        $datePath = 'documents/' . now()->format('Y/m');
        $fullPath = $datePath . '/' . $filename;

        Storage::disk('local')->putFileAs($datePath, $file, $filename);

        return DB::transaction(function () use ($file, $fullPath, $userId) {
            $document = Document::create([
                'user_id' => $userId,
                'original_filename' => $file->getClientOriginalName(),
                'file_path' => $fullPath,
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
                'status' => DocumentStatus::UPLOADED,
            ]);

            ProcessDocumentJob::dispatch($document->id)->afterCommit();

            return $document;
        });
    }
}