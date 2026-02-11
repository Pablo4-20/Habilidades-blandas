<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('detalle_matriculas', function (Blueprint $table) {
            // Añadimos la columna paralelo (nullable para no romper datos antiguos)
            $table->string('paralelo', 5)->nullable()->after('estado_materia');
        });
    }

    public function down()
    {
        Schema::table('detalle_matriculas', function (Blueprint $table) {
            $table->dropColumn('paralelo');
        });
    }
};