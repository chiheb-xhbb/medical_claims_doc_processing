<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class AIService
{
    protected string $fastApiUrl;

    public function __construct()
    {
        $this->fastApiUrl = config('services.fastapi.url', 'http://127.0.0.1:8001');
    }

    /**
     * Process document via FastAPI OCR service
     * 
     * @param string $filePath Path to file in storage (e.g., "documents/2026/02/uuid.pdf")
     * @param string|null $docType Document type (e.g., "pharmacy_invoice")
     * @return array FastAPI response (contract v1 format)
     * @throws \Exception If FastAPI call fails
     */
    public function process(string $filePath, ?string $docType = null): array
    {
        $fullPath = Storage::disk('local')->path($filePath);

        if (!file_exists($fullPath)) {
            throw new \Exception("File not found: {$filePath}");
        }

        Log::info('AIService: Calling FastAPI', [
            'file_path' => $filePath,
            'doc_type' => $docType,
            'file_size' => filesize($fullPath)
        ]);

        try {
            $response = Http::timeout(30)
                ->attach(
                    'file',
                    fopen($fullPath, 'r'),
                    basename($filePath)
                )
                ->post($this->fastApiUrl . '/process', [
                    'doc_type' => $docType ?? 'unknown'
                ]);

            if ($response->successful()) {
                $data = $response->json();
                
                Log::info('AIService: FastAPI success', [
                    'request_id' => $data['meta']['request_id'] ?? 'unknown',
                    'processing_time_ms' => $data['meta']['processing_time_ms'] ?? 0,
                    'fields_extracted' => array_keys(array_filter($data['fields'] ?? [], fn($v) => $v !== null))
                ]);
                
                return $data;
            }

            // HTTP error (4xx, 5xx)
            $errorBody = $response->json();
            $errorMessage = $errorBody['meta']['error'] ?? $response->body();
            
            Log::error('AIService: FastAPI HTTP error', [
                'status' => $response->status(),
                'error' => $errorMessage
            ]);

            throw new \Exception("FastAPI error (HTTP {$response->status()}): {$errorMessage}");

        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('AIService: FastAPI connection failed', [
                'error' => $e->getMessage()
            ]);
            
            throw new \Exception('FastAPI service unavailable: ' . $e->getMessage());
            
        } catch (\Exception $e) {
            Log::error('AIService: Unexpected error', [
                'error' => $e->getMessage(),
                'file' => $filePath
            ]);
            
            throw $e;
        }
    }
}