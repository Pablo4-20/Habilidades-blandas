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
    Schema::table('detalle_planificaciones', function (Blueprint $table) {
        // Agregamos el campo tipo texto, puede ser nulo por si acaso
        $table->text('resultado_aprendizaje')->nullable()->after('actividades');
    });
}
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('detalle_planificaciones', function (Blueprint $table) {
            //
        });
    }
};
