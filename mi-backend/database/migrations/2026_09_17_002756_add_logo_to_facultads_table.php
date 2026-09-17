<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // CORREGIDO: "facultades" en lugar de "facultads"
        Schema::table('facultades', function (Blueprint $table) {
            if (!Schema::hasColumn('facultades', 'logo')) {
                $table->string('logo')->nullable()->after('tipo');
            }
        });
    }

    public function down()
    {
        // CORREGIDO: "facultades" en lugar de "facultads"
        Schema::table('facultades', function (Blueprint $table) {
            if (Schema::hasColumn('facultades', 'logo')) {
                $table->dropColumn('logo');
            }
        });
    }
};