<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dossiers', function (Blueprint $table) {
            $table->foreignId('escalated_by')
                ->nullable()
                ->after('processed_at')
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('escalated_at')
                ->nullable()
                ->after('escalated_by');

            $table->text('escalation_reason')
                ->nullable()
                ->after('escalated_at');

            $table->string('chef_decision_type')
                ->nullable()
                ->after('escalation_reason');

            $table->foreignId('chef_decision_by')
                ->nullable()
                ->after('chef_decision_type')
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('chef_decision_at')
                ->nullable()
                ->after('chef_decision_by');

            $table->text('chef_decision_note')
                ->nullable()
                ->after('chef_decision_at');
        });
    }

    public function down(): void
    {
        Schema::table('dossiers', function (Blueprint $table) {
            $table->dropForeign(['escalated_by']);
            $table->dropForeign(['chef_decision_by']);

            $table->dropColumn([
                'escalated_by',
                'escalated_at',
                'escalation_reason',
                'chef_decision_type',
                'chef_decision_by',
                'chef_decision_at',
                'chef_decision_note',
            ]);
        });
    }
};