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
    Schema::create('detalle_matriculas', function (Blueprint $table) {
        $table->id();
        $table->foreignId('matricula_id')->constrained('matriculas')->onDelete('cascade');
        $table->foreignId('asignatura_id')->constrained('asignaturas');
        $table->string('estado_materia')->default('Cursando'); // Cursando, Aprobado, Reprobado
        $table->decimal('nota_final', 5, 2)->nullable(); // Para el futuro
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('detalle_matriculas');
    }
};
