<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Ciclo;

class CicloSeeder extends Seeder
{
    public function run(): void
    {
        Ciclo::truncate();

        // Ciclos del 1 al 8
        $ciclos = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

        foreach ($ciclos as $nombre) {
            Ciclo::create(['nombre' => $nombre]);
        }
    }
}