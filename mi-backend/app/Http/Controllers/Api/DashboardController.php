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
use App\Models\Evaluacion;
use App\Models\DetalleMatricula;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            
            // 1. Obtener Periodo Activo
            $periodoActivo = PeriodoAcademico::where('activo', true)->first();
            if (!$periodoActivo) {
                // Si no hay activo, tomamos el último creado para que no se rompa
                $periodoActivo = PeriodoAcademico::latest()->first();
            }
            
            if (!$periodoActivo) {
                return response()->json([
                    'usuarios' => 0, 'estudiantes' => 0, 'asignaturas' => 0,
                    'cumplimiento' => 0, 'reportes' => 0, 'mis_materias' => 0
                ]);
            }

            $nombrePeriodo = $periodoActivo->nombre;
            $idPeriodo = $periodoActivo->id;
            $stats = [];

            // ==========================================
            // VISTA COORDINADOR
            // ==========================================
            if ($user->rol === 'coordinador') {
                
                // 1. Asignaciones de la carrera del coordinador
                $queryAsignaciones = Asignacion::with('asignatura')->where('periodo', $nombrePeriodo);
                
                if (!empty($user->carrera_id)) {
                    $queryAsignaciones->whereHas('asignatura', function($q) use ($user) {
                        $q->where('carrera_id', $user->carrera_id);
                    });
                }
                
                $asignaciones = $queryAsignaciones->get();
                $totalCargas = $asignaciones->count();
                
                // 2. CÁLCULO DE CUMPLIMIENTO EXACTO (Igual a ReporteGeneral)
                $totalItemsAvance = 0; 
                $sumaPorcentajes = 0;  
                
                foreach ($asignaciones as $asig) {
                    // Obtener estudiantes de esta materia para validar el 100%
                    $estudiantes = $this->_getEstudiantes($asig->asignatura_id, $idPeriodo);
                    $totalEstudiantes = $estudiantes->count();
                    $idsEstudiantes = $estudiantes->pluck('id');

                    // Buscar planes
                    $planes = Planificacion::with('detalles')
                        ->where('asignatura_id', $asig->asignatura_id)
                        ->where('docente_id', $asig->docente_id)
                        ->where('periodo_academico', $nombrePeriodo)
                        ->get();

                    // CASO 1: Sin planificación -> 0%
                    if ($planes->isEmpty()) {
                        $totalItemsAvance++;
                        $sumaPorcentajes += 0;
                        continue;
                    }

                    // CASO 2: Con planificación -> Analizar cada habilidad
                    foreach ($planes as $plan) {
                        if ($plan->detalles->isEmpty()) continue;

                        foreach ($plan->detalles as $detalle) {
                            $evaluacionesCount = Evaluacion::where('planificacion_id', $plan->id)
                                ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id)
                                ->whereIn('estudiante_id', $idsEstudiantes)
                                ->count();
                            
                            $reporteDB = Reporte::where('planificacion_id', $plan->id)
                                ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id)
                                ->first();
                            
                            $tieneConclusion = $reporteDB && !empty($reporteDB->conclusion_progreso);

                            // Lógica de porcentaje (25, 50, 100)
                            $progresoItem = 25; 
                            if ($evaluacionesCount > 0) $progresoItem = 50; 
                            if ($totalEstudiantes > 0 && $evaluacionesCount >= $totalEstudiantes && $tieneConclusion) {
                                $progresoItem = 100;
                            }

                            $totalItemsAvance++;
                            $sumaPorcentajes += $progresoItem;
                        }
                    }
                }

                // PROMEDIO FINAL EXACTO
                $cumplimiento = ($totalItemsAvance > 0) 
                    ? round($sumaPorcentajes / $totalItemsAvance, 1) 
                    : 0;

                // 3. Conteo de Reportes Finalizados (Aquellos al 100%)
                // Esto es solo informativo, no afecta el % principal
                $reportesFinalizados = 0; 

                // 4. Alumnos Activos de la carrera
                $queryAlumnos = Matricula::where('periodo_id', $idPeriodo)->where('estado', 'Activo');
                // Intentamos filtrar por carrera si el usuario tiene una
                if (!empty($user->carrera_id)) {
                    // Buscamos el nombre de la carrera primero
                    $carreraNombre = \App\Models\Carrera::where('id', $user->carrera_id)->value('nombre');
                    if ($carreraNombre) {
                        $queryAlumnos->whereHas('estudiante', fn($q) => $q->where('carrera', $carreraNombre));
                    }
                }
                $totalAlumnos = $queryAlumnos->count();
                
                $stats = [
                    'asignaciones' => $totalCargas, 
                    'planificaciones' => $totalItemsAvance, // Items evaluados
                    'cumplimiento' => $cumplimiento, 
                    'reportes' => $reportesFinalizados, 
                    'alumnos_activos' => $totalAlumnos
                ];
            }

            // ==========================================
            // VISTA DOCENTE
            // ==========================================
            elseif ($user->rol === 'docente') {
                
                $misAsignaciones = Asignacion::where('docente_id', $user->id)
                    ->where('periodo', $nombrePeriodo)->get();
                $misMateriasCount = $misAsignaciones->count();
                
                $misPlanes = Planificacion::where('docente_id', $user->id)
                    ->where('periodo_academico', $nombrePeriodo)->count();

                // Contar alumnos únicos
                $misAsignaturasIds = $misAsignaciones->pluck('asignatura_id')->toArray();
                $misEstudiantes = 0;
                if (!empty($misAsignaturasIds)) {
                    $misEstudiantes = DetalleMatricula::whereIn('asignatura_id', $misAsignaturasIds)
                        ->where('estado_materia', '!=', 'Baja')
                        ->distinct('matricula_id')
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
                    'usuarios' => User::count(), 
                    'estudiantes' => Estudiante::count(),
                    'asignaturas' => Asignatura::count(), 
                    'habilidades' => HabilidadBlanda::count(),
                    'periodos' => PeriodoAcademico::count()
                ];
            }

            return response()->json($stats);

        } catch (\Exception $e) {
            Log::error('Error Dashboard: ' . $e->getMessage());
            return response()->json(['message' => 'Error interno', 'error' => $e->getMessage()], 500);
        }
    }

    // Helper privado (Copiado de ReporteController para consistencia)
    private function _getEstudiantes($asignaturaId, $periodoId)
    {
        $asignatura = Asignatura::with(['carrera', 'ciclo'])->find($asignaturaId);
        if (!$asignatura) return collect();

        $manuales = DetalleMatricula::where('asignatura_id', $asignaturaId)
            ->where('estado_materia', '!=', 'Baja')
            ->whereHas('matricula', fn($q) => $q->where('periodo_id', $periodoId)->where('estado', 'Activo'))
            ->with('matricula.estudiante')->get()
            ->map(fn($d) => optional($d->matricula)->estudiante)->filter();

        $excluirIds = DetalleMatricula::where('asignatura_id', $asignaturaId)
            ->whereHas('matricula', fn($q) => $q->where('periodo_id', $periodoId))
            ->pluck('matricula_id');

        $automaticos = collect();
        if ($asignatura->ciclo_id) {
            $automaticos = Matricula::where('periodo_id', $periodoId)
                ->where('ciclo_id', $asignatura->ciclo_id)
                ->where('estado', 'Activo')
                ->whereNotIn('id', $excluirIds)
                ->whereHas('estudiante', function($q) use ($asignatura) {
                    if ($asignatura->carrera) $q->where('carrera', $asignatura->carrera->nombre);
                })
                ->with('estudiante')->get()
                ->map(fn($m) => $m->estudiante)->filter();
        }

        return $manuales->concat($automaticos)->unique('id');
    }
}