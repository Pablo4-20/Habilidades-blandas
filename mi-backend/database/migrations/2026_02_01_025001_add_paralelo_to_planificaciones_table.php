<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('planificaciones', function (Blueprint $table) {
            // Agregamos la columna paralelo, por defecto 'A' para no romper datos viejos
            $table->string('paralelo', 5)->default('A')->after('docente_id');
        });
    }

    public function down()
    {
        Schema::table('planificaciones', function (Blueprint $table) {
            $table->dropColumn('paralelo');
        });
    }
};