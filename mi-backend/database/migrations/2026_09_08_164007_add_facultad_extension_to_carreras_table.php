<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::table('carreras', function (Blueprint $table) {
            // Verificamos si la columna 'facultad' NO existe antes de crearla
            if (!Schema::hasColumn('carreras', 'facultad')) {
                $table->string('facultad')->nullable()->after('nombre');
            }
            
            // Verificamos si la columna 'extension' NO existe antes de crearla
            if (!Schema::hasColumn('carreras', 'extension')) {
                $table->string('extension')->nullable()->after('facultad');
            }
        });
    }

    public function down()
    {
        Schema::table('carreras', function (Blueprint $table) {
            if (Schema::hasColumn('carreras', 'facultad')) {
                $table->dropColumn('facultad');
            }
            
            if (Schema::hasColumn('carreras', 'extension')) {
                $table->dropColumn('extension');
            }
        });
    }
};