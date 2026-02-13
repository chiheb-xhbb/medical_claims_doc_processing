<?php

namespace App\Services;

class AIService
{
    public function process(string $filePath): array
    {
        return [
            'meta' => [
                'doc_type' => 'pharmacy_invoice',
                'request_id' => \Str::uuid(),
                'processing_time_ms' => 250,
            ],
            'fields' => [
                'invoice_date' => '2026-02-12',
                'provider_name' => 'Pharmacie Centrale',
                'total_ttc' => 180.50,
            ],
            'confidence' => [
                'invoice_date' => 0.95,
                'provider_name' => 0.98,
                'total_ttc' => 0.92,
            ],
            'warnings' => [],
            'errors' => [],
        ];
    }
}