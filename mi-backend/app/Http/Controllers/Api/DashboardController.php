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
        $user = $request->user();
        
        // 1. Get Active Period
        $periodoActivo = PeriodoAcademico::where('activo', true)->first();
        
        // Default values if no active period exists
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
        // COORDINATOR VIEW (Filtered by Career)
        // ==========================================
        if ($user->rol === 'coordinador') {
            
            // A. Assignments (Academic Load) for the period
            $queryAsignaciones = Asignacion::with('asignatura')
                ->where('periodo', $nombrePeriodo);

            // Filter by career if coordinator has one assigned
            if ($user->carrera_id) {
                $queryAsignaciones->whereHas('asignatura', function($q) use ($user) {
                    $q->where('carrera_id', $user->carrera_id);
                });
            }
            $asignaciones = $queryAsignaciones->get();
            $totalCargas = $asignaciones->count();

            // B. Planning (Based on filtered subjects)
            $idsAsignaturas = $asignaciones->pluck('asignatura_id');
            
            $totalPlanificaciones = Planificacion::where('periodo_academico', $nombrePeriodo)
                ->whereIn('asignatura_id', $idsAsignaturas)
                ->count();

            // C. Compliance (Goal: 2 plans per subject -> Partial 1 & 2)
            $metaEsperada = $totalCargas * 2; 
            $cumplimiento = ($metaEsperada > 0) ? round(($totalPlanificaciones / $metaEsperada) * 100, 1) : 0;

            // D. Final Reports (Generated acts)
            $reportesFinalizados = Reporte::whereHas('planificacion', function($q) use ($nombrePeriodo, $idsAsignaturas) {
                $q->where('periodo_academico', $nombrePeriodo)
                  ->whereIn('asignatura_id', $idsAsignaturas);
            })->count();

            // E. Active Students
            $queryAlumnos = Matricula::where('periodo_id', $idPeriodo)->where('estado', 'Activo');
            
            if ($user->carrera_id) {
                $nombreCarrera = $user->carrera->nombre ?? '';
                if ($nombreCarrera) {
                    $queryAlumnos->whereHas('estudiante', function($q) use ($nombreCarrera) {
                        $q->where('carrera', $nombreCarrera);
                    });
                }
            }
            $totalAlumnos = $queryAlumnos->count();
            
            $stats = [
                'asignaciones'    => $totalCargas,
                'planificaciones' => $totalPlanificaciones,
                'cumplimiento'    => $cumplimiento,
                'reportes'        => $reportesFinalizados,
                'alumnos_activos' => $totalAlumnos
            ];
        }

        // ==========================================
        // TEACHER VIEW (Personal Data)
        // ==========================================
        elseif ($user->rol === 'docente') {
            
            // My Subjects
            $misAsignaciones = Asignacion::where('docente_id', $user->id)
                ->where('periodo', $nombrePeriodo)
                ->count();
            
            // My Planning
            $misPlanes = Planificacion::where('docente_id', $user->id)
                ->where('periodo_academico', $nombrePeriodo)
                ->count();

            // My Students (Approximate: count unique enrollments in my courses)
            $misEstudiantes = DetalleMatricula::whereHas('asignacion', function($q) use ($user, $nombrePeriodo) {
                    $q->where('docente_id', $user->id)->where('periodo', $nombrePeriodo);
                })
                ->orWhereIn('asignatura_id', function($q) use ($user, $nombrePeriodo) {
                    $q->select('asignatura_id')
                      ->from('asignaciones')
                      ->where('docente_id', $user->id)
                      ->where('periodo', $nombrePeriodo);
                })
                ->where('estado_materia', 'Cursando')
                ->distinct('matricula_id')
                ->count('matricula_id');

            $stats = [
                'mis_materias' => $misAsignaciones,
                'mis_planes'   => $misPlanes,
                'mis_alumnos'  => $misEstudiantes
            ];
        }

        // ==========================================
        // ADMIN VIEW (Global Data)
        // ==========================================
        else {
            $stats = [
                'usuarios'    => User::count(),
                'estudiantes' => Estudiante::count(),
                'asignaturas' => Asignatura::count(),
                'habilidades' => HabilidadBlanda::count(),
                'periodos'    => PeriodoAcademico::count()
            ];
        }

        return response()->json($stats);
    }
}