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
        Schema::table('estudiantes', function (Blueprint $table) {
            // Eliminamos la columna ciclo_actual si existe
            if (Schema::hasColumn('estudiantes', 'ciclo_actual')) {
                $table->dropColumn('ciclo_actual');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('estudiantes', function (Blueprint $table) {
            // Si revertimos, la volvemos a crear (opcional)
            $table->string('ciclo_actual')->nullable();
        });
    }
};