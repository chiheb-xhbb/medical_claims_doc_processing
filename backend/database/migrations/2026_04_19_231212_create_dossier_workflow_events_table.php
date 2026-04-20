<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dossier_workflow_events', function (Blueprint $table) {
            $table->id();

            $table->foreignId('dossier_id')->constrained('dossiers')->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('event_type', 100);
            $table->string('from_status', 100)->nullable();
            $table->string('to_status', 100)->nullable();

            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->text('note')->nullable();
            $table->json('meta')->nullable();

            // Append-only history: keep only created_at, no updated_at.
            $table->timestamp('created_at')->useCurrent();

            $table->index(
                ['dossier_id', 'created_at'],
                'dossier_workflow_events_dossier_created_idx'
            );
            $table->index('event_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dossier_workflow_events');
    }
};