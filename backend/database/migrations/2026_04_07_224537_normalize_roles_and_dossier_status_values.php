<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('dossiers')->where('status', 'TO_VALIDATE')->update(['status' => 'UNDER_REVIEW']);
        DB::table('dossiers')->where('status', 'EN_DEROGATION')->update(['status' => 'IN_ESCALATION']);
        DB::table('dossiers')->where('status', 'COMPLEMENT_ATTENDU')->update(['status' => 'AWAITING_COMPLEMENT']);
        DB::table('dossiers')->where('status', 'RECU')->update(['status' => 'RECEIVED']);

        DB::table('users')->where('role', 'GESTIONNAIRE')->update(['role' => 'CLAIMS_MANAGER']);
        DB::table('users')->where('role', 'CHEF_HIERARCHIQUE')->update(['role' => 'SUPERVISOR']);
    }

    public function down(): void
    {
        DB::table('dossiers')->where('status', 'UNDER_REVIEW')->update(['status' => 'TO_VALIDATE']);
        DB::table('dossiers')->where('status', 'IN_ESCALATION')->update(['status' => 'EN_DEROGATION']);
        DB::table('dossiers')->where('status', 'AWAITING_COMPLEMENT')->update(['status' => 'COMPLEMENT_ATTENDU']);
        DB::table('dossiers')->where('status', 'RECEIVED')->update(['status' => 'RECU']);

        DB::table('users')->where('role', 'CLAIMS_MANAGER')->update(['role' => 'GESTIONNAIRE']);
        DB::table('users')->where('role', 'SUPERVISOR')->update(['role' => 'CHEF_HIERARCHIQUE']);
    }
};