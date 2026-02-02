<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('planificaciones', function (Blueprint $table) {
            // 1. Eliminamos la restricción antigua que causaba el conflicto
            // El nombre 'unica_plan_parcial' viene de tu archivo create_planificaciones_table.php
            $table->dropUnique('unica_plan_parcial');

            // 2. Creamos la nueva regla incluyendo el 'paralelo'
            // Ahora la combinación única es: Materia + Parcial + Periodo + PARALELO
            $table->unique(['asignatura_id', 'parcial', 'periodo_academico', 'paralelo'], 'unica_plan_completa');
        });
    }

    public function down()
    {
        Schema::table('planificaciones', function (Blueprint $table) {
            $table->dropUnique('unica_plan_completa');
            $table->unique(['asignatura_id', 'parcial', 'periodo_academico'], 'unica_plan_parcial');
        });
    }
};