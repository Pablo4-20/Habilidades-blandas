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
            'cedula' => '0000000001',
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
        ['email' => 'car.software@ueb.edu.ec'],
        [
            'cedula' => '0000000002',
            'nombres' => 'Coordinador-Software',
            'apellidos' => 'Sofftware',
            'password' => Hash::make('0000000002'),
            'rol' => 'coordinador',
            'carrera_id' => $idSoftware, 
            'email_verified_at' => now(),
            'must_change_password' => false,
            'created_at' => now(), 
            'updated_at' => now(),
        ]
    );
    DB::table('users')->updateOrInsert(
            ['email' => 'car.tecnologias@ueb.edu.ec'],
            [
                'cedula' => '0000000003',
                'nombres' => 'Coordinador-Tecnologías de la Información',
                'apellidos' => 'Tecnologías de la Información',
                'password' => Hash::make('0000000003'),
                'rol' => 'coordinador',
                'carrera_id' => $idTic, 
                'email_verified_at' => now(),
                'must_change_password' => false,
                'created_at' => now(), 
                'updated_at' => now(),
            ]
        );
    // 3. DOCENTE
    DB::table('users')->updateOrInsert(
        ['email' => 'mbonilla@ueb.edu.ec'],
        [
            'cedula' => '1802628568',
            'nombres' => 'MONICA ELIZABETH',
            'apellidos' => 'BONILLA MANOBANDA',
            'password' => Hash::make('1802628568'),
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