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
        ['email' => 'ggarcia@ueb.edu.ec'],
        [
            'cedula' => '0201618253',
            'nombres' => 'Galuth Irene',
            'apellidos' => 'García Camacho',
            'password' => Hash::make('0201618253'),
            'rol' => 'coordinador',
            'email_verified_at' => now(),
            'must_change_password' => false,
            'created_at' => now(), 
            'updated_at' => now(),
        ]
    );
    DB::table('users')->updateOrInsert(
            ['email' => 'dbarreno@ueb.edu.ec'],
            [
                'cedula' => '0602571572',
                'nombres' => 'DANILO GEOVANNY',
                'apellidos' => 'BARRENO NARANJO',
                'password' => Hash::make('0602571572'),
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