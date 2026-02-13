<?php

namespace App\Jobs;

use App\Enums\DocumentStatus;
use App\Models\AiRequest;
use App\Models\Document;
use App\Models\Extraction;
use App\Services\AIService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProcessDocumentJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $backoff = 10;
    public $uniqueFor = 60;

    public function __construct(
        public int $documentId
    ) {}

    public function uniqueId(): string
    {
        return (string) $this->documentId;
    }

    public function handle(): void
    {
        $document = Document::findOrFail($this->documentId);

        if ($document->status === DocumentStatus::PROCESSED) {
            return;
        }

        if ($document->extractions()->where('version', 1)->exists()) {
            $document->update(['status' => DocumentStatus::PROCESSED]);
            return;
        }

        $response = app(AIService::class)->process($document->file_path);

        DB::transaction(function () use ($document, $response) {
            $document->update(['status' => DocumentStatus::PROCESSING]);

            $aiRequest = AiRequest::create([
                'request_id' => (string) Str::uuid(),
                'document_id' => $document->id,
                'doc_type_sent' => $response['meta']['doc_type'] ?? null,
                'http_status' => 200,
                'status' => 'SUCCESS',
                'processing_time_ms' => $response['meta']['processing_time_ms'] ?? null,
                'error_message' => null,
            ]);

            Extraction::create([
                'document_id' => $document->id,
                'ai_request_id' => $aiRequest->id,
                'version' => 1,
                'result_json' => $response,
            ]);

            $document->update(['status' => DocumentStatus::PROCESSED]);
        });
    }

    public function failed(\Throwable $exception): void
    {
        $document = Document::find($this->documentId);

        if (!$document) {
            return;
        }

        $document->update(['status' => DocumentStatus::FAILED]);

        AiRequest::create([
            'request_id' => (string) Str::uuid(),
            'document_id' => $document->id,
            'doc_type_sent' => null,
            'http_status' => 500,
            'status' => 'FAILED',
            'processing_time_ms' => null,
            'error_message' => $exception->getMessage(),
        ]);
    }
}