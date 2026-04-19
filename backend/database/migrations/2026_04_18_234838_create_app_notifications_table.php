<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_notifications', function (Blueprint $table) {
            $table->id();

            // Recipient and actor
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();

            // Optional workflow references
            $table->foreignId('dossier_id')->nullable()->constrained('dossiers')->nullOnDelete();
            $table->foreignId('rubrique_id')->nullable()->constrained('rubriques')->nullOnDelete();
            $table->foreignId('document_id')->nullable()->constrained('documents')->nullOnDelete();

            // Notification content
            $table->string('type', 100);
            $table->string('title', 255);
            $table->text('message');
            $table->string('action_url')->nullable();

            // Read state
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();

            // Extra structured context
            $table->json('meta')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'is_read', 'created_at'], 'app_notifications_user_read_created_idx');
            $table->index('dossier_id');
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_notifications');
    }
};