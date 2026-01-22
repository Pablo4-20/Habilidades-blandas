<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EstudianteSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('estudiantes')->insert([
            [
                'cedula' => '0201111111', // <--- Cédula ficticia 1
                'nombres' => 'Miguel', 
                'apellidos' => 'Andrade', 
                'carrera' => 'Software', 
                'email' => 'miguel.andrade@est.ueb.edu.ec',
                'email_verified_at' => now(), // <--- ESTO LOS MARCA COMO VERIFICADOS
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'cedula' => '0202222222', // <--- Cédula ficticia 2
                'nombres' => 'Lorena', 
                'apellidos' => 'Benavidez', 
                'carrera' => 'Software',
                'email' => 'lorena.benavidez@est.ueb.edu.ec',
                'email_verified_at' => now(), // <--- ESTO LOS MARCA COMO VERIFICADOS
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'cedula' => '0203333333', // <--- Cédula ficticia 3
                'nombres' => 'Joel', 
                'apellidos' => 'Diaz', 
                'carrera' => 'Software', 
                'email' => 'joel.diaz@est.ueb.edu.ec',
                'email_verified_at' => now(), // <--- ESTO LOS MARCA COMO VERIFICADOS
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}