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
    Schema::create('asignaturas', function (Blueprint $table) {
        $table->id();
        $table->string('nombre'); // Solo el nombre, ej: Programación Web II
        
        // Relaciones con los nuevos catálogos
        $table->foreignId('carrera_id')->constrained('carreras');
        $table->foreignId('ciclo_id')->constrained('ciclos');
        $table->foreignId('unidad_curricular_id')->constrained('unidades_curriculares');

        $table->timestamps();

        // Evitar duplicar la misma materia en la misma carrera
        $table->unique(['nombre', 'carrera_id']);
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asignaturas');
    }
};
