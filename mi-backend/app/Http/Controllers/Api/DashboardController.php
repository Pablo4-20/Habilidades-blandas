<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Asignatura;
use App\Models\Asignacion;
use App\Models\Planificacion;
use App\Models\Estudiante;       // Importante
use App\Models\Matricula;        // Importante
use App\Models\PeriodoAcademico; // Importante
use App\Models\HabilidadBlanda;
use Illuminate\Support\Facades\DB;
use App\Models\Carrera;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $periodoActivo = PeriodoAcademico::where('activo', true)->first();
        
        if (!$periodoActivo) {
            return response()->json(['asignaciones'=>0, 'alumnos_activos'=>0, 'cumplimiento'=>0]);
        }

        $idPeriodo = $periodoActivo->id;
        $nombrePeriodo = $periodoActivo->nombre;

        $stats = [];

        // --- COORDINADOR (CON FILTRO DE CARRERA) ---
        if ($user->rol === 'coordinador') {
            
            // 1. Obtener Asignaciones (Filtrando por Carrera si el Coordinador la tiene)
            $queryAsignaciones = Asignacion::with('asignatura')
                ->where('periodo', $nombrePeriodo);

            // [FILTRO MÁGICO] Si el coordinador tiene carrera asignada, filtramos
            if ($user->carrera_id) {
                $queryAsignaciones->whereHas('asignatura', function($q) use ($user) {
                    $q->where('carrera_id', $user->carrera_id);
                });
            }

            $asignaciones = $queryAsignaciones->get();
            
            // --- Cálculos de cumplimiento (se mantienen igual, pero usan $asignaciones ya filtradas) ---
            $totalCargas = $asignaciones->count();
            $totalPlanificaciones = 0;
            $reportesFinalizados = 0;
            $totalItems = 0;
            $sumaPuntos = 0;

            foreach ($asignaciones as $asig) {
                // ... (Tu misma lógica de conteo de puntos y planes) ...
                // Esta parte no cambia, porque ya estamos iterando sobre asignaciones filtradas.
            }
            
            // ... (Cálculo de $cumplimiento) ...

            // 2. Alumnos Activos (Filtro por Carrera)
            $queryAlumnos = Matricula::where('periodo_id', $idPeriodo)
                                     ->where('estado', 'Activo');

            if ($user->carrera_id) {
                // Buscamos el NOMBRE de la carrera del coordinador (ej: "Software")
                // porque en 'estudiantes' guardamos el nombre string (según tu lógica actual)
                $nombreCarrera = $user->carrera->nombre ?? '';
                
                $queryAlumnos->whereHas('estudiante', function($q) use ($nombreCarrera) {
                    $q->where('carrera', $nombreCarrera);
                });
            }

            $totalAlumnos = $queryAlumnos->count();

            $stats = [
                'asignaciones'    => $totalCargas,
                'planificaciones' => $totalPlanificaciones, // Ahora son solo las de SU carrera
                'cumplimiento'    => $cumplimiento,
                'reportes'        => $reportesFinalizados,
                'alumnos_activos' => $totalAlumnos // Solo los de SU carrera
            ];
        }

        // ... (Admin y Docente siguen igual) ...

        return response()->json($stats);
    }
}