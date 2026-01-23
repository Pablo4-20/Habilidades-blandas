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
                'cedula' => '1752504975',
                'nombres' => 'Miguel',
                'apellidos' => 'Andrade',
                'email' => 'miguel.andrade@est.ueb.edu.ec',
                'carrera' => 'Software',
                // 'email_verified_at' => now(), // <--- ESTA LÍNEA SE ELIMINA
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'cedula' => '1103796544',
                'nombres' => 'Lorena',
                'apellidos' => 'Benavidez',
                'email' => 'lorena.benavidez@est.ueb.edu.ec',
                'carrera' => 'Software',
                // 'email_verified_at' => now(), // <--- ESTA LÍNEA SE ELIMINA
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'cedula' => '1752504801',
                'nombres' => 'Joel',
                'apellidos' => 'Diaz',
                'email' => 'joel.diaz@est.ueb.edu.ec',
                'carrera' => 'Software',
                // 'email_verified_at' => now(), // <--- ESTA LÍNEA SE ELIMINA
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}