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
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ProcessDocumentJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Number of retry attempts
     */
    public int $tries = 3;

    /**
     * Seconds to wait before retrying
     */
    public int $backoff = 10;

    /**
     * Unique lock duration in seconds
     */
    public int $uniqueFor = 60;

    /**
     * Extraction version constant
     */
    private const EXTRACTION_VERSION = 1;

    /**
     * Job start time for processing duration tracking
     */
    private float $startTime;

    public function __construct(
        public int $documentId
    ) {
        $this->startTime = microtime(true);
    }

    /**
     * Unique identifier for preventing concurrent duplicate jobs
     */
    public function uniqueId(): string
    {
        return (string) $this->documentId;
    }

    /**
     * Execute the job
     */
    public function handle(): void
    {
        $this->startTime = microtime(true);
        
        $document = Document::find($this->documentId);

        if (!$document) {
            Log::warning('ProcessDocumentJob: Document not found', ['id' => $this->documentId]);
            return;
        }

        // Idempotence guard: already processed
        if ($document->status === DocumentStatus::PROCESSED) {
            Log::info('ProcessDocumentJob: Already processed', ['id' => $this->documentId]);
            return;
        }

        // Idempotence guard: extraction already exists
        $existingExtraction = Extraction::where('document_id', $this->documentId)
            ->where('version', self::EXTRACTION_VERSION)
            ->exists();

        if ($existingExtraction) {
            Log::info('ProcessDocumentJob: Extraction v1 already exists', ['id' => $this->documentId]);
            $document->update(['status' => DocumentStatus::PROCESSED]);
            return;
        }

        // Update status to PROCESSING (commit immediately for real-time tracking)
        $document->update(['status' => DocumentStatus::PROCESSING]);

        Log::info('ProcessDocumentJob: Starting processing', [
            'document_id' => $this->documentId,
            'attempt' => $this->attempts(),
            'doc_type' => $document->doc_type
        ]);

        // Call FastAPI (exception triggers retry mechanism)
        $result = app(AIService::class)->process(
            $document->file_path,
            $document->doc_type
        );

        // Calculate processing time
        $processingTimeMs = $this->getElapsedTimeMs();

        // Store results atomically
        DB::transaction(function () use ($document, $result, $processingTimeMs) {
            // Create AI request audit record
            $aiRequest = AiRequest::create([
                'request_id' => $result['meta']['request_id'] ?? (string) Str::uuid(),
                'document_id' => $document->id,
                'doc_type_sent' => $result['meta']['doc_type'] ?? 'unknown',
                'http_status' => 200,
                'status' => 'SUCCESS',
                'processing_time_ms' => $result['meta']['processing_time_ms'] ?? $processingTimeMs,
                'error_message' => null,
            ]);

            // Create extraction record with full result
            Extraction::create([
                'document_id' => $document->id,
                'ai_request_id' => $aiRequest->id,
                'version' => self::EXTRACTION_VERSION,
                'result_json' => $result,
            ]);

            // Update document status to PROCESSED
            $document->update(['status' => DocumentStatus::PROCESSED]);
        });

        // Log success with extracted fields info
        $extractedFields = array_keys(array_filter(
            $result['fields'] ?? [],
            fn($v) => $v !== null
        ));

        Log::info('ProcessDocumentJob: Success', [
            'document_id' => $this->documentId,
            'request_id' => $result['meta']['request_id'] ?? 'unknown',
            'processing_time_ms' => $result['meta']['processing_time_ms'] ?? $processingTimeMs,
            'fields_extracted' => $extractedFields,
            'warnings_count' => count($result['warnings'] ?? [])
        ]);
    }

    /**
     * Handle job failure after all retries exhausted
     */
    public function failed(\Throwable $exception): void
    {
        $processingTimeMs = $this->getElapsedTimeMs();

        Log::error('ProcessDocumentJob: Job failed permanently', [
            'document_id' => $this->documentId,
            'attempts' => $this->attempts(),
            'max_tries' => $this->tries,
            'processing_time_ms' => $processingTimeMs,
            'error' => $exception->getMessage(),
            'exception_class' => get_class($exception)
        ]);

        $document = Document::find($this->documentId);

        if (!$document) {
            Log::warning('ProcessDocumentJob: Document not found in failed()', [
                'id' => $this->documentId
            ]);
            return;
        }

        // Update document status to FAILED
        $document->update(['status' => DocumentStatus::FAILED]);

        // Create failure audit record
        AiRequest::create([
            'request_id' => (string) Str::uuid(),
            'document_id' => $document->id,
            'doc_type_sent' => $document->doc_type,
            'http_status' => 500,
            'status' => 'FAILED',
            'processing_time_ms' => $processingTimeMs,
            'error_message' => mb_substr($exception->getMessage(), 0, 1000),
        ]);
    }

    /**
     * Calculate elapsed time since job start
     */
    private function getElapsedTimeMs(): int
    {
        return (int) ((microtime(true) - $this->startTime) * 1000);
    }
}