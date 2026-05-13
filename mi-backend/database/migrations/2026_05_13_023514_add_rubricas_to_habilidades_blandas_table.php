<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('habilidades_blandas', function (Blueprint $table) {
            $table->text('nivel_1')->nullable()->after('descripcion');
            $table->text('nivel_2')->nullable()->after('nivel_1');
            $table->text('nivel_3')->nullable()->after('nivel_2');
            $table->text('nivel_4')->nullable()->after('nivel_3');
            $table->text('nivel_5')->nullable()->after('nivel_4');
        });
    }

    public function down(): void
    {
        Schema::table('habilidades_blandas', function (Blueprint $table) {
            $table->dropColumn(['nivel_1', 'nivel_2', 'nivel_3', 'nivel_4', 'nivel_5']);
        });
    }
};