<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dossiers', function (Blueprint $table) {
            $table->foreignId('returned_to_preparation_by')
                ->nullable()
                ->after('processed_by')
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('returned_to_preparation_at')
                ->nullable()
                ->after('returned_to_preparation_by');

            $table->text('returned_to_preparation_note')
                ->nullable()
                ->after('returned_to_preparation_at');
        });
    }

    public function down(): void
    {
        Schema::table('dossiers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('returned_to_preparation_by');
            $table->dropColumn([
                'returned_to_preparation_at',
                'returned_to_preparation_note',
            ]);
        });
    }
};