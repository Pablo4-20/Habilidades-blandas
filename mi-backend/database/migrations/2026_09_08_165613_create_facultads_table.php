<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('facultades', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->enum('tipo', ['Facultad', 'Extensión'])->default('Facultad');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('facultades');
    }
};