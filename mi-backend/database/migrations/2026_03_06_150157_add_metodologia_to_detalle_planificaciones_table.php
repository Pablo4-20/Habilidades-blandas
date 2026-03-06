<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('detalle_planificaciones', function (Blueprint $table) {
            $table->string('metodologia')->nullable()->after('habilidad_blanda_id');
        });
    }

    public function down(): void
    {
        Schema::table('detalle_planificaciones', function (Blueprint $table) {
            $table->dropColumn('metodologia');
        });
    }
};