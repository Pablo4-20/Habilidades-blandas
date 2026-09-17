<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            // Verificamos si la columna NO existe para evitar errores
            if (!Schema::hasColumn('users', 'carrera_id')) {
                $table->unsignedBigInteger('carrera_id')->nullable();
                
                // Relacionamos con la tabla carreras
                $table->foreign('carrera_id')
                      ->references('id')
                      ->on('carreras')
                      ->onDelete('set null');
            }
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'carrera_id')) {
                $table->dropForeign(['carrera_id']);
                $table->dropColumn('carrera_id');
            }
        });
    }
};