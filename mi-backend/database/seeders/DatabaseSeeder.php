<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            // 1. Catálogos Maestros (Deben crearse primero)
            CarreraSeeder::class,
            CicloSeeder::class,
            UnidadCurricularSeeder::class,

            // 2. Usuarios y Habilidades Globales
            UsuarioSeeder::class,
            //HabilidadBlandaSeeder::class, // Ahora es global y no depende de materias

            // 3. Estudiantes
           // EstudianteSeeder::class,

            // 4. Asignaturas
            // IMPORTANTE: Lo dejamos comentado temporalmente.
            // Si lo ejecutas ahora fallará porque tu seeder antiguo intenta guardar
            // texto (ej: "Software") en campos que ahora son IDs numéricos.
             AsignaturaSeeder::class, 
        ]);
    }
}