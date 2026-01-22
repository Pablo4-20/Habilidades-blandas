<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Asignatura;
use App\Models\Asignacion;
use App\Models\Planificacion;
use App\Models\Estudiante;
use App\Models\HabilidadBlanda;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        
        // 1. Obtener Periodo Activo
        $periodoActivo = DB::table('periodos_academicos')->where('activo', true)->value('nombre');

        if (!$periodoActivo) {
            return response()->json(['message' => 'No hay periodo activo'], 404);
        }

        $stats = [];

        // --- ADMIN ---
        if ($user->rol === 'admin') {
            $stats = [
                'usuarios'    => User::count(),
                'estudiantes' => Estudiante::count(),
                'asignaturas' => Asignatura::count(),
                'habilidades' => HabilidadBlanda::count(),
            ];
        }

        // --- COORDINADOR (LÓGICA CORREGIDA 75%) ---
        if ($user->rol === 'coordinador') {
            
            // A. TOTAL REAL: Usamos 'asignaciones', NO 'planificaciones'.
            // Esto asegura que si tienes 4 materias, el divisor sea 4.
            $asignaciones = Asignacion::where('periodo', $periodoActivo)->get();
            $totalCargas = $asignaciones->count();

            $sumaPuntos = 0;
            $totalPlanificaciones = 0;
            $reportesFinalizados = 0;

            foreach ($asignaciones as $asig) {
                // B. Buscar Planificación de esta carga específica
                $plan = Planificacion::where('asignatura_id', $asig->asignatura_id)
                    ->where('docente_id', $asig->docente_id)
                    ->where('periodo_academico', $periodoActivo)
                    ->first();

                if ($plan) {
                    $totalPlanificaciones++; // Contamos planes existentes

                    // C. Verificar si tiene Notas (Evaluaciones)
                    $tieneNotas = DB::table('evaluaciones')
                        ->where('planificacion_id', $plan->id)
                        ->exists();

                    if ($tieneNotas) {
                        $sumaPuntos += 100; // Materia completada
                        $reportesFinalizados++;
                    } else {
                        $sumaPuntos += 50;  // Materia solo planificada
                    }
                } else {
                    $sumaPuntos += 0; // Materia sin tocar (0%)
                }
            }

            // D. PROMEDIO EXACTO
            // Ejemplo: (100 + 100 + 100 + 0) / 4 = 75
            $cumplimiento = ($totalCargas > 0) ? round($sumaPuntos / $totalCargas) : 0;

            $stats = [
                'asignaciones'    => $totalCargas,
                'planificaciones' => $totalPlanificaciones,
                'cumplimiento'    => $cumplimiento, 
                'reportes'        => $reportesFinalizados
            ];
        }

        // --- DOCENTE ---
        if ($user->rol === 'docente') {
            $misAsignaciones = Asignacion::where('docente_id', $user->id)
                ->where('periodo', $periodoActivo)
                ->get();
            
            $misMateriasCount = $misAsignaciones->count();

            $misPlanes = Planificacion::where('docente_id', $user->id)
                ->where('periodo_academico', $periodoActivo)
                ->count();

            // Estudiantes aproximados
            // Si no tienes tabla matrículas, puedes hacer un count de todos los estudiantes o poner 0
            $misAlumnos = Estudiante::count(); 

            $stats = [
                'mis_materias' => $misMateriasCount,
                'mis_planes'   => $misPlanes,
                'mis_alumnos'  => $misAlumnos
            ];
        }

        return response()->json($stats);
    }
}