<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dossiers', function (Blueprint $table) {
            $table->string('awaiting_complement_source', 50)
                ->nullable()
                ->after('returned_to_preparation_note');

            $table->foreignId('awaiting_complement_by')
                ->nullable()
                ->after('awaiting_complement_source')
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('awaiting_complement_at')
                ->nullable()
                ->after('awaiting_complement_by');

            $table->text('awaiting_complement_note')
                ->nullable()
                ->after('awaiting_complement_at');
        });
    }

    public function down(): void
    {
        Schema::table('dossiers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('awaiting_complement_by');
            $table->dropColumn([
                'awaiting_complement_source',
                'awaiting_complement_at',
                'awaiting_complement_note',
            ]);
        });
    }
};