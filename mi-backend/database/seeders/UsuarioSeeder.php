<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UsuarioSeeder extends Seeder
{
    public function run(): void
{
    $idSoftware = DB::table('carreras')->where('nombre', 'Software')->value('id') ?? 1;
        
        $idTic = DB::table('carreras')
                    ->where('nombre', 'like', '%Tecnolog%') // Busca "Tecnologías de la..."
                    ->orWhere('nombre', 'TI')
                    ->value('id') ?? 2;
                    
    // 1. ADMIN
    DB::table('users')->updateOrInsert(
        ['email' => 'admin@ueb.edu.ec'],
        [
            'cedula' => '2134535673',
            'nombres' => 'Admin', // Separado
            'apellidos' => 'sistema',     // Separado
            'password' => Hash::make('password'),
            'rol' => 'admin',
            'carrera_id' => null,
            'email_verified_at' => now(),
            'must_change_password' => false,
            'created_at' => now(), 
            'updated_at' => now(),
        ]
    );

    // 2. COORDINADOR
    DB::table('users')->updateOrInsert(
        ['email' => 'coordinador@ueb.edu.ec'],
        [
            'cedula' => '0200000002',
            'nombres' => 'Galuth',
            'apellidos' => 'García',
            'password' => Hash::make('password'),
            'rol' => 'coordinador',
            'email_verified_at' => now(),
            'must_change_password' => false,
            'created_at' => now(), 
            'updated_at' => now(),
        ]
    );
    DB::table('users')->updateOrInsert(
            ['email' => 'coordinador.tic@ueb.edu.ec'],
            [
                'cedula' => '0300000003',
                'nombres' => 'Coordinador',
                'apellidos' => 'TICs',
                'password' => Hash::make('password'),
                'rol' => 'coordinador',
                'carrera_id' => $idTic, // <--- ASIGNADO A TICS
                'email_verified_at' => now(),
                'must_change_password' => false,
                'created_at' => now(), 
                'updated_at' => now(),
            ]
        );
    // 3. DOCENTE
    DB::table('users')->updateOrInsert(
        ['email' => 'docente@ueb.edu.ec'],
        [
            'cedula' => '0200000003',
            'nombres' => 'Docente',
            'apellidos' => 'Prueba',
            'password' => Hash::make('password'),
            'rol' => 'docente',
            'carrera_id' => null,
            'email_verified_at' => now(),
            'must_change_password' => false,
            'created_at' => now(), 
            'updated_at' => now(),
        ]
    );
}
}