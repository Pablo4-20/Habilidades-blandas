<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Carrera;

class CarreraSeeder extends Seeder
{
    public function run(): void
    {
        // Limpiamos la tabla antes de llenar (opcional, pero útil)
        Carrera::truncate();

        $carreras = [
            'Software', 
            'Tecnologías de la Información'
        ];
        
        foreach ($carreras as $nombre) {
            Carrera::create(['nombre' => $nombre]);
        }
    }
}