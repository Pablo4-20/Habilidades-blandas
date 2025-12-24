<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Carrera;
use App\Models\Ciclo;
use App\Models\UnidadCurricular;

class CatalogoController extends Controller
{
    public function getCarreras() {
        return Carrera::all();
    }

    public function getCiclos() {
        return Ciclo::all();
    }

    public function getUnidades() {
        return UnidadCurricular::all();
    }
}