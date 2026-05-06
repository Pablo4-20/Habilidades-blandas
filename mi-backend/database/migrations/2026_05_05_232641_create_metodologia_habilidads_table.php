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
    Schema::create('metodologias_habilidades', function (Blueprint $table) {
        $table->id();
        $table->foreignId('habilidad_blanda_id')->constrained('habilidades_blandas')->onDelete('cascade');
        $table->string('descripcion');
        $table->timestamps();

        // Evita duplicados exactos en base de datos
        $table->unique(['habilidad_blanda_id', 'descripcion']); 
    });
}
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('metodologia_habilidads');
    }
};
