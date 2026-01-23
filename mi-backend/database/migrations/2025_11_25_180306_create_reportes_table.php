<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reportes', function (Blueprint $table) {
            $table->id();
            
            // Relación con la Planificación
            $table->foreignId('planificacion_id')->constrained('planificaciones')->onDelete('cascade');
            
            // CORRECCIÓN AQUÍ: El nombre de la tabla es 'habilidades_blandas'
            $table->foreignId('habilidad_blanda_id')->constrained('habilidades_blandas')->onDelete('cascade');
            
            $table->text('conclusion_progreso'); 
            $table->date('fecha_generacion');
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reportes');
    }
};