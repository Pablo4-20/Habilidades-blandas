<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estudiantes', function (Blueprint $table) {
            $table->id();
            $table->string('cedula', 10)->unique();
            $table->string('nombres');
            $table->string('apellidos');
            $table->string('email')->unique()->nullable(); 
            
            // 👇 CAMBIO IMPORTANTE: Agregamos ->nullable()
            $table->string('carrera')->nullable();      
            $table->string('ciclo_actual')->nullable(); 
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estudiantes');
    }
};