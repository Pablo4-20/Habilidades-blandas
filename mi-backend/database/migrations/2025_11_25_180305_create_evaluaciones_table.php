<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluaciones', function (Blueprint $table) {
            $table->id();
            
            $table->foreignId('planificacion_id')->constrained('planificaciones')->onDelete('cascade');
            $table->foreignId('estudiante_id')->constrained('estudiantes')->onDelete('cascade');
            
            // --- CORRECCIÓN AQUÍ ---
            // Cambiamos 'habilidad_blandas' (viejo) por 'habilidades_blandas' (nuevo)
            $table->foreignId('habilidad_blanda_id')
                  ->nullable()
                  ->constrained('habilidades_blandas') // <--- CAMBIO CRUCIAL
                  ->onDelete('cascade'); 

            $table->enum('parcial', ['1', '2']);
            $table->integer('nivel');
            $table->text('observacion')->nullable();
            
            $table->timestamps();
            
            // Regla única
            $table->unique(
                ['planificacion_id', 'estudiante_id', 'habilidad_blanda_id', 'parcial'], 
                'unica_evaluacion_por_habilidad'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluaciones');
    }
};