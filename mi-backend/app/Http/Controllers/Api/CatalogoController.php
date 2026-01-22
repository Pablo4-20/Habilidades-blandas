<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Carrera;
use App\Models\Ciclo;
use App\Models\UnidadCurricular;
use Illuminate\Http\Request; // Importar Request

class CatalogoController extends Controller
{
    public function getCarreras(Request $request)
    {
        $user = $request->user();

        // Si es COORDINADOR y tiene carrera asignada, devolvemos SOLO esa.
        if ($user->rol === 'coordinador' && $user->carrera_id) {
            return Carrera::where('id', $user->carrera_id)->get();
        }

        // Si es ADMIN, devolvemos TODAS.
        return Carrera::where('estado', 'Activo')->get();
    }

    public function getCiclos() {
        return Ciclo::all();
    }

    public function getUnidades() {
        return UnidadCurricular::all();
    }
}