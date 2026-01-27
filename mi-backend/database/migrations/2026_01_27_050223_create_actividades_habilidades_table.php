<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('actividades_habilidades', function (Blueprint $table) {
            $table->id();
            // Relación con la tabla de habilidades existente
            $table->foreignId('habilidad_blanda_id')
                  ->constrained('habilidades_blandas')
                  ->onDelete('cascade');
            
            $table->text('descripcion'); // Ej: "Debates y mesas redondas"
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('actividades_habilidades');
    }
};