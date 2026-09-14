<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('carreras', function (Blueprint $table) {
            // Eliminamos las columnas anteriores si existen
            if (Schema::hasColumn('carreras', 'facultad')) {
                $table->dropColumn('facultad');
            }
            if (Schema::hasColumn('carreras', 'extension')) {
                $table->dropColumn('extension');
            }
            
            // Agregamos la clave foránea
            $table->foreignId('facultad_id')->nullable()->constrained('facultades')->nullOnDelete();
        });
    }

    public function down()
    {
        Schema::table('carreras', function (Blueprint $table) {
            $table->dropForeign(['facultad_id']);
            $table->dropColumn('facultad_id');
        });
    }
};