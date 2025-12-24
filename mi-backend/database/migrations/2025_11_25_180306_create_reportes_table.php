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
        Schema::create('reportes', function (Blueprint $table) {
            $table->id();
            
            // Relación con la Planificación (Materia + Docente + Parcial)
            $table->foreignId('planificacion_id')->constrained('planificaciones')->onDelete('cascade');
            
            // Contenido del reporte
            $table->text('conclusion_progreso'); // Análisis del docente
            $table->date('fecha_generacion');
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reportes');
    }
};