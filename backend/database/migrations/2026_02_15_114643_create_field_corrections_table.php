<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('field_corrections', function (Blueprint $table) {
            $table->id();

            // Link to documents table
            $table->foreignId('document_id')
                  ->constrained()
                  ->cascadeOnDelete();

            // Name of the corrected field (e.g., total_amount, invoice_date)
            $table->string('field_name');

            // Original AI value
            $table->text('original_value')->nullable();

            // User corrected value (required)
            $table->text('corrected_value')->nullable();

            // User who made the correction (optional)
            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained()
                  ->nullOnDelete();

            $table->timestamps();

            // Optimize queries by document and field
            $table->index(['document_id', 'field_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('field_corrections');
    }
};
