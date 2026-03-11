<?php

namespace App\Jobs;

use App\Enums\DocumentStatus;
use App\Models\AiRequest;
use App\Models\Document;
use App\Models\Extraction;
use App\Services\AIService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
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
     * Maximum number of retry attempts for transient failures.
     */
    public int $tries = 3;

    /**
     * Delay before retrying a transient failure.
     */
    public int $backoff = 10;

    /**
     * Maximum execution time in seconds before the job is considered stuck.
     */
    public int $timeout = 120;

    /**
     * Keep the uniqueness lock longer than the job timeout
     * to reduce accidental duplicate processing.
     */
    public int $uniqueFor = 300;

    /**
     * Initial extraction version created by OCR.
     */
    private const EXTRACTION_VERSION = 1;

    /**
     * Tracks elapsed time for audit/debug purposes.
     */
    private float $startTime;

    public function __construct(
        public int $documentId
    ) {
        $this->startTime = microtime(true);
    }

    /**
     * Prevent duplicate concurrent jobs for the same document.
     */
    public function uniqueId(): string
    {
        return (string) $this->documentId;
    }

    /**
     * Execute the OCR/extraction job.
     */
    public function handle(): void
    {
        $this->startTime = microtime(true);

        $document = Document::find($this->documentId);

        if (!$document) {
            Log::warning('ProcessDocumentJob: Document not found', [
                'document_id' => $this->documentId,
            ]);
            return;
        }

        // Never regress a document that is already finalized.
        if ($document->status === DocumentStatus::VALIDATED) {
            Log::info('ProcessDocumentJob: Skipped because document is already validated', [
                'document_id' => $this->documentId,
            ]);
            return;
        }

        // Avoid reprocessing a document that is already complete.
        if ($document->status === DocumentStatus::PROCESSED) {
            Log::info('ProcessDocumentJob: Skipped because document is already processed', [
                'document_id' => $this->documentId,
            ]);
            return;
        }

        // Extra idempotence guard in case version 1 already exists.
        $existingExtraction = Extraction::where('document_id', $this->documentId)
            ->where('version', self::EXTRACTION_VERSION)
            ->exists();

        if ($existingExtraction) {
            Log::info('ProcessDocumentJob: Skipped because extraction v1 already exists', [
                'document_id' => $this->documentId,
            ]);
            return;
        }

        // Mark the document as processing and clear any previous error message.
        $document->update([
            'status' => DocumentStatus::PROCESSING,
            'error_message' => null,
        ]);

        Log::info('ProcessDocumentJob: Starting processing', [
            'document_id' => $this->documentId,
            'attempt' => $this->attempts(),
            'doc_type' => $document->doc_type,
        ]);

        try {
            $result = app(AIService::class)->process(
                $document->file_path,
                $document->doc_type
            );
        } catch (\InvalidArgumentException $e) {
            // Permanent input/client error: do not retry.
            Log::warning('ProcessDocumentJob: Permanent failure, no retry', [
                'document_id' => $this->documentId,
                'error' => $e->getMessage(),
            ]);

            $this->fail($e);
            return;
        }

        $processingTimeMs = $this->getElapsedTimeMs();

        DB::transaction(function () use ($document, $result, $processingTimeMs) {
            $aiRequest = AiRequest::create([
                'request_id' => $result['meta']['request_id'] ?? (string) Str::uuid(),
                'document_id' => $document->id,
                'doc_type_sent' => $result['meta']['doc_type'] ?? $document->doc_type,
                'http_status' => 200,
                'status' => 'SUCCESS',
                'processing_time_ms' => $result['meta']['processing_time_ms'] ?? $processingTimeMs,
                'error_message' => null,
            ]);

            Extraction::create([
                'document_id' => $document->id,
                'ai_request_id' => $aiRequest->id,
                'version' => self::EXTRACTION_VERSION,
                'result_json' => $result,
            ]);

            $document->update([
                'status' => DocumentStatus::PROCESSED,
                'error_message' => null,
            ]);
        });

        $extractedFields = array_keys(array_filter(
            $result['fields'] ?? [],
            fn ($value) => $value !== null
        ));

        Log::info('ProcessDocumentJob: Success', [
            'document_id' => $this->documentId,
            'request_id' => $result['meta']['request_id'] ?? 'unknown',
            'processing_time_ms' => $result['meta']['processing_time_ms'] ?? $processingTimeMs,
            'fields_extracted' => $extractedFields,
            'warnings_count' => count($result['warnings'] ?? []),
        ]);
    }

    /**
     * Handle final failure after retries are exhausted
     * or after a manual fail() on permanent errors.
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
            'exception_class' => get_class($exception),
        ]);

        $document = Document::find($this->documentId);

        if (!$document) {
            Log::warning('ProcessDocumentJob: Document not found in failed()', [
                'document_id' => $this->documentId,
            ]);
            return;
        }

        // Never overwrite a document that is already successfully finalized.
        if (in_array($document->status, [DocumentStatus::PROCESSED, DocumentStatus::VALIDATED], true)) {
            return;
        }

        $safeErrorMessage = mb_substr($exception->getMessage(), 0, 1000);

        $document->update([
            'status' => DocumentStatus::FAILED,
            'error_message' => $safeErrorMessage,
        ]);

        AiRequest::create([
            'request_id' => (string) Str::uuid(),
            'document_id' => $document->id,
            'doc_type_sent' => $document->doc_type,
            'http_status' => $exception instanceof \InvalidArgumentException ? 400 : 500,
            'status' => 'FAILED',
            'processing_time_ms' => $processingTimeMs,
            'error_message' => $safeErrorMessage,
        ]);
    }

    /**
     * Compute elapsed time since the job started.
     */
    private function getElapsedTimeMs(): int
    {
        return (int) ((microtime(true) - $this->startTime) * 1000);
    }
}