<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\HabilidadBlanda;

class HabilidadBlandaSeeder extends Seeder
{
    public function run(): void
    {
        // 1. DICCIONARIO GLOBAL (Banco de Habilidades)
        // Usamos las claves como 'nombre' y el valor como 'descripcion' (o sugerencias)
       

        // 2. CARGA MASIVA SIMPLE
        // Ya no recorremos materias ($mapa), solo guardamos las habilidades para que existan.
        foreach ($habilidades as $nombre => $descripcion) {
            HabilidadBlanda::firstOrCreate(
                ['nombre' => $nombre], // Buscamos por nombre para no duplicar
                ['descripcion' => $descripcion] // Si no existe, guardamos esto
            );
        }
    }
}