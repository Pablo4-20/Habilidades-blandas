<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\UnidadCurricular;

class UnidadCurricularSeeder extends Seeder
{
    public function run(): void
    {
        UnidadCurricular::truncate();

        $unidades = [
            'Unidad Básica', 
            'Unidad Profesional', 
            'Unidad de Integración Curricular'
        ];

        foreach ($unidades as $nombre) {
            UnidadCurricular::create(['nombre' => $nombre]);
        }
    }
}