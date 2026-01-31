<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('matriculas', function (Blueprint $table) {
            // Agregamos la columna paralelo, por defecto 'A'
            $table->string('paralelo', 5)->default('A')->after('ciclo_id');
        });
    }

    public function down()
    {
        Schema::table('matriculas', function (Blueprint $table) {
            $table->dropColumn('paralelo');
        });
    }
};