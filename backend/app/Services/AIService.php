<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class AIService
{
    protected string $fastApiUrl;

    public function __construct()
    {
        $this->fastApiUrl = config('services.fastapi.url', 'http://127.0.0.1:8001');
    }

    /**
     * Process document via FastAPI OCR service.
     *
     * @param string $filePath Path to file in storage
     * @param string|null $docType Document type
     * @return array FastAPI response payload
     *
     * @throws \InvalidArgumentException Permanent client/input errors (4xx)
     * @throws \RuntimeException Transient server/service errors or invalid responses
     */
    public function process(string $filePath, ?string $docType = null): array
    {
        $fullPath = Storage::disk('local')->path($filePath);

        if (!file_exists($fullPath)) {
            throw new \RuntimeException("File not found: {$filePath}");
        }

        Log::info('AIService: Calling FastAPI', [
            'file_path' => $filePath,
            'doc_type' => $docType,
            'file_size' => filesize($fullPath),
        ]);

        $fileHandle = fopen($fullPath, 'r');

        if ($fileHandle === false) {
            throw new \RuntimeException("Unable to open file for reading: {$filePath}");
        }

        try {
            $response = Http::timeout(30)
                ->attach('file', $fileHandle, basename($filePath))
                ->post($this->fastApiUrl . '/process', [
                    'doc_type' => $docType ?? 'medical_invoice',
                ]);

            if ($response->successful()) {
                $data = $response->json();

                if (!is_array($data)) {
                    throw new \RuntimeException('FastAPI returned an invalid JSON response.');
                }

                Log::info('AIService: FastAPI success', [
                    'request_id' => $data['meta']['request_id'] ?? 'unknown',
                    'processing_time_ms' => $data['meta']['processing_time_ms'] ?? 0,
                    'fields_extracted' => array_keys(
                        array_filter($data['fields'] ?? [], fn ($value) => $value !== null)
                    ),
                ]);

                return $data;
            }

            // Safely handle non-JSON or unexpected error bodies.
            $errorBody = $response->json();
            $errorMessage = (is_array($errorBody) && isset($errorBody['meta']['error']))
                ? $errorBody['meta']['error']
                : $response->body();

            Log::error('AIService: FastAPI HTTP error', [
                'status' => $response->status(),
                'error' => $errorMessage,
            ]);

            // 4xx = permanent input/client error -> do not retry
            if ($response->status() >= 400 && $response->status() < 500) {
                throw new \InvalidArgumentException(
                    "FastAPI rejected the document (HTTP {$response->status()}): {$errorMessage}"
                );
            }

            // 5xx = server/service issue -> retry allowed
            throw new \RuntimeException(
                "FastAPI service error (HTTP {$response->status()}): {$errorMessage}"
            );
        } catch (ConnectionException $e) {
            Log::error('AIService: FastAPI connection failed', [
                'error' => $e->getMessage(),
            ]);

            throw new \RuntimeException('FastAPI service unavailable: ' . $e->getMessage(), 0, $e);
        } catch (\Throwable $e) {
            Log::error('AIService: Unexpected error', [
                'error' => $e->getMessage(),
                'file' => $filePath,
            ]);

            throw $e;
        } finally {
            // Always close the file handle to avoid resource leaks.
            if (is_resource($fileHandle)) {
                fclose($fileHandle);
            }
        }
    }
}