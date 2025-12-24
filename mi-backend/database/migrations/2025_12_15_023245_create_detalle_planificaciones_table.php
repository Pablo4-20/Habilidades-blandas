<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('detalle_planificaciones', function (Blueprint $table) {
            $table->id();
            
            // Relación con el Padre (Planificación)
            $table->foreignId('planificacion_id')
                  ->constrained('planificaciones')
                  ->onDelete('cascade'); 
            
            // Relación con Habilidades (Catálogo Global)
            $table->foreignId('habilidad_blanda_id')
                  ->constrained('habilidades_blandas')
                  ->onDelete('cascade');
            
            $table->text('actividades'); 
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detalle_planificaciones');
    }
};