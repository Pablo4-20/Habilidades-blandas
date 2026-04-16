<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('carrera_habilidad_blanda', function (Blueprint $table) {
            $table->id();
            
            // Llaves foráneas a tus tablas existentes
            $table->foreignId('carrera_id')
                  ->constrained('carreras')
                  ->onDelete('cascade');
                  
            $table->foreignId('habilidad_blanda_id')
                  ->constrained('habilidades_blandas')
                  ->onDelete('cascade');
                  
            $table->timestamps();
            
            // Restricción para evitar que se asigne la misma habilidad dos veces a una misma carrera
            $table->unique(['carrera_id', 'habilidad_blanda_id'], 'carrera_habilidad_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('carrera_habilidad_blanda');
    }
};