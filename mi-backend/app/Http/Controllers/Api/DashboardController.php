<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Asignatura;
use App\Models\Asignacion;
use App\Models\Planificacion;
use App\Models\Estudiante;
use App\Models\Matricula;
use App\Models\PeriodoAcademico;
use App\Models\HabilidadBlanda;
use App\Models\Reporte;
use App\Models\DetalleMatricula;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            
            // 1. Obtener Periodo Activo
            $periodoActivo = PeriodoAcademico::where('activo', true)->first();
            
            if (!$periodoActivo) {
                return response()->json([
                    'usuarios' => 0, 'estudiantes' => 0, 'asignaturas' => 0, 'habilidades' => 0,
                    'asignaciones' => 0, 'planificaciones' => 0, 'cumplimiento' => 0, 'reportes' => 0,
                    'mis_materias' => 0, 'mis_planes' => 0, 'mis_alumnos' => 0
                ]);
            }

            $nombrePeriodo = $periodoActivo->nombre;
            $idPeriodo = $periodoActivo->id;
            $stats = [];

            // ==========================================
            // VISTA COORDINADOR
            // ==========================================
            if ($user->rol === 'coordinador') {
                $queryAsignaciones = Asignacion::with('asignatura')->where('periodo', $nombrePeriodo);
                
                // Filtro seguro por carrera
                if (!empty($user->carrera_id)) {
                    $queryAsignaciones->whereHas('asignatura', function($q) use ($user) {
                        $q->where('carrera_id', $user->carrera_id);
                    });
                }
                
                $asignaciones = $queryAsignaciones->get();
                $totalCargas = $asignaciones->count();
                $idsAsignaturas = $asignaciones->pluck('asignatura_id')->toArray();
                
                $totalPlanificaciones = 0;
                if (!empty($idsAsignaturas)) {
                    $totalPlanificaciones = Planificacion::where('periodo_academico', $nombrePeriodo)
                        ->whereIn('asignatura_id', $idsAsignaturas)->count();
                }

                $metaEsperada = $totalCargas * 2; 
                $cumplimiento = ($metaEsperada > 0) ? round(($totalPlanificaciones / $metaEsperada) * 100, 1) : 0;

                // Ahora sí funcionará porque agregaste planificacion() al modelo Reporte
                $reportesFinalizados = 0;
                if (!empty($idsAsignaturas)) {
                    $reportesFinalizados = Reporte::whereHas('planificacion', function($q) use ($nombrePeriodo, $idsAsignaturas) {
                        $q->where('periodo_academico', $nombrePeriodo)
                          ->whereIn('asignatura_id', $idsAsignaturas);
                    })->count();
                }

                $queryAlumnos = Matricula::where('periodo_id', $idPeriodo)->where('estado', 'Activo');
                if (!empty($user->carrera_id) && $user->carrera) {
                    $nombreCarrera = $user->carrera->nombre;
                    $queryAlumnos->whereHas('estudiante', fn($q) => $q->where('carrera', $nombreCarrera));
                }
                $totalAlumnos = $queryAlumnos->count();
                
                $stats = [
                    'asignaciones' => $totalCargas, 'planificaciones' => $totalPlanificaciones,
                    'cumplimiento' => $cumplimiento, 'reportes' => $reportesFinalizados, 'alumnos_activos' => $totalAlumnos
                ];
            }

            // ==========================================
            // VISTA DOCENTE (Lógica Corregida)
            // ==========================================
            elseif ($user->rol === 'docente') {
                
                // 1. Mis Materias
                $misAsignaciones = Asignacion::where('docente_id', $user->id)
                    ->where('periodo', $nombrePeriodo)
                    ->get();
                $misMateriasCount = $misAsignaciones->count();
                
                // 2. Mis Planificaciones
                $misPlanes = Planificacion::where('docente_id', $user->id)
                    ->where('periodo_academico', $nombrePeriodo)
                    ->count();

                // 3. Mis Estudiantes (Lógica robusta)
                // Obtenemos los IDs de las asignaturas que dicta este docente
                $misAsignaturasIds = $misAsignaciones->pluck('asignatura_id')->toArray();

                $misEstudiantes = 0;
                if (!empty($misAsignaturasIds)) {
                    // Contamos matrículas únicas en esas asignaturas, ignorando bajas
                    $misEstudiantes = DetalleMatricula::whereIn('asignatura_id', $misAsignaturasIds)
                        ->where('estado_materia', '!=', 'Baja')
                        ->distinct('matricula_id') // Importante: cuenta personas, no registros
                        ->count('matricula_id');
                }

                $stats = [
                    'mis_materias' => $misMateriasCount,
                    'mis_planes'   => $misPlanes,
                    'mis_alumnos'  => $misEstudiantes
                ];
            }

            // ==========================================
            // VISTA ADMIN
            // ==========================================
            else {
                $stats = [
                    'usuarios' => User::count(), 'estudiantes' => Estudiante::count(),
                    'asignaturas' => Asignatura::count(), 'habilidades' => HabilidadBlanda::count(),
                    'periodos' => PeriodoAcademico::count()
                ];
            }

            return response()->json($stats);

        } catch (\Exception $e) {
            \Log::error('Error Dashboard: ' . $e->getMessage());
            return response()->json(['message' => 'Error interno', 'error' => $e->getMessage()], 500);
        }
    }
}