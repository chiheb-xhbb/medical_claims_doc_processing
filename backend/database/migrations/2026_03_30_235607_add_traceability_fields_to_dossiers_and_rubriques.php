<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dossiers', function (Blueprint $table) {
            $table->foreignId('submitted_by')
                ->nullable()
                ->after('submitted_at')
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('processed_by')
                ->nullable()
                ->after('submitted_by')
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('processed_at')
                ->nullable()
                ->after('processed_by');
        });

        Schema::table('rubriques', function (Blueprint $table) {
            $table->foreignId('rejected_by')
                ->nullable()
                ->after('created_by')
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('rejected_at')
                ->nullable()
                ->after('rejected_by');
        });
    }

    public function down(): void
    {
        Schema::table('rubriques', function (Blueprint $table) {
            $table->dropForeign(['rejected_by']);
            $table->dropColumn([
                'rejected_by',
                'rejected_at',
            ]);
        });

        Schema::table('dossiers', function (Blueprint $table) {
            $table->dropForeign(['submitted_by']);
            $table->dropForeign(['processed_by']);
            $table->dropColumn([
                'submitted_by',
                'processed_by',
                'processed_at',
            ]);
        });
    }
};