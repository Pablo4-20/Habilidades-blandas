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
            //HabilidadBlandaSeeder::class, 
            
            // 3. Estudiantes
           // EstudianteSeeder::class,

            // 4. Asignaturas
           
             //AsignaturaSeeder::class, 
        ]);
    }
}