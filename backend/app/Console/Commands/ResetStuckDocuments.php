<?php

namespace App\Console\Commands;

use App\Enums\DocumentStatus;
use App\Models\Document;
use Illuminate\Console\Command;

class ResetStuckDocuments extends Command
{
    /**
     * Example usage:
     * php artisan documents:reset-stuck
     * php artisan documents:reset-stuck --minutes=15
     */
    protected $signature = 'documents:reset-stuck {--minutes=10}';

    /**
     * Command description shown in artisan list.
     */
    protected $description = 'Mark documents stuck in PROCESSING for too long as FAILED';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $minutes = (int) $this->option('minutes');

        $stuckDocuments = Document::where('status', DocumentStatus::PROCESSING->value)
            ->where('updated_at', '<', now()->subMinutes($minutes))
            ->get();

        if ($stuckDocuments->isEmpty()) {
            $this->info('No stuck documents found.');

            return self::SUCCESS;
        }

        foreach ($stuckDocuments as $document) {
            $document->update([
                'status' => DocumentStatus::FAILED->value,
                'error_message' => "Processing timeout after {$minutes} minutes.",
            ]);

            $this->info("Document #{$document->id} marked as FAILED.");
        }

        $this->info("Total reset: {$stuckDocuments->count()} document(s).");

        return self::SUCCESS;
    }
}