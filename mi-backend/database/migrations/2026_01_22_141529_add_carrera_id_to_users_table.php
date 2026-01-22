<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
{
    Schema::table('users', function (Blueprint $table) {
        // Puede ser nulo porque el Admin o Docente quizá no necesiten carrera específica
        $table->foreignId('carrera_id')->nullable()->constrained('carreras');
    });
}

public function down(): void
{
    Schema::table('users', function (Blueprint $table) {
        $table->dropForeign(['carrera_id']);
        $table->dropColumn('carrera_id');
    });
}
};
