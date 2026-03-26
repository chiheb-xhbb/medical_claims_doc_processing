<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->foreignId('rubrique_id')
                ->nullable()
                ->after('dossier_id')
                ->constrained('rubriques')
                ->nullOnDelete();

            $table->string('decision_status')
                ->default('PENDING')
                ->after('rubrique_id')
                ->index();

            $table->foreignId('decision_by')
                ->nullable()
                ->after('decision_status')
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('decision_at')
                ->nullable()
                ->after('decision_by');

            $table->text('decision_note')
                ->nullable()
                ->after('decision_at');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropForeign(['rubrique_id']);
            $table->dropForeign(['decision_by']);
            $table->dropIndex(['decision_status']);

            $table->dropColumn([
                'rubrique_id',
                'decision_status',
                'decision_by',
                'decision_at',
                'decision_note',
            ]);
        });
    }
};