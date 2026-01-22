<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
{
    Schema::table('evaluaciones', function (Blueprint $table) {
        // Solo agrega la columna si NO existe
        if (!Schema::hasColumn('evaluaciones', 'habilidad_blanda_id')) {
            $table->foreignId('habilidad_blanda_id')
                  ->nullable()
                  ->after('estudiante_id')
                  ->constrained('habilidades_blandas')
                  ->onDelete('cascade');
        }
    });
}

    public function down(): void
    {
        Schema::table('evaluaciones', function (Blueprint $table) {
            $table->dropForeign(['habilidad_blanda_id']);
            $table->dropColumn('habilidad_blanda_id');
        });
    }
};