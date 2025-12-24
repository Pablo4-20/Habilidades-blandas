<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planificaciones', function (Blueprint $table) {
            $table->id();
            
            // Relaciones
            $table->foreignId('docente_id')->constrained('users');
            $table->foreignId('asignatura_id')->constrained('asignaturas');
            
            // Datos del periodo
            $table->string('periodo_academico');
            $table->enum('parcial', ['1', '2']); 

            $table->timestamps();

            // Regla para evitar duplicados (Materia + Periodo + Parcial)
            $table->unique(['asignatura_id', 'parcial', 'periodo_academico'], 'unica_plan_parcial');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planificaciones');
    }
};