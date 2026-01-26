<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reportes', function (Blueprint $table) {
            // Agregamos la columna para el coordinador, puede ser nula
            $table->text('observacion_coordinador')->nullable()->after('conclusion_progreso');
        });
    }

    public function down(): void
    {
        Schema::table('reportes', function (Blueprint $table) {
            $table->dropColumn('observacion_coordinador');
        });
    }
};