<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   public function up()
{
    Schema::create('matriculas', function (Blueprint $table) {
        $table->id();
        $table->foreignId('estudiante_id')->constrained('estudiantes')->onDelete('cascade');
        // Ojo: Asegúrate de que tu tabla de periodos se llame 'periodos_academicos' o ajusta aquí
        $table->foreignId('periodo_id')->constrained('periodos_academicos'); 
        $table->foreignId('ciclo_id')->constrained('ciclos');
        $table->string('estado')->default('Activo'); // Activo, Retirado, Finalizado
        $table->date('fecha_matricula')->default(now());
        $table->timestamps();

        // Regla de oro: Un estudiante solo puede tener UNA matrícula por periodo
        $table->unique(['estudiante_id', 'periodo_id']); 
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('matriculas');
    }
};
