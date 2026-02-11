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
                
                // 2. CÁLCULO DE CUMPLIMIENTO EXACTO
                $totalItemsAvance = 0; 
                $sumaPorcentajes = 0;  
                
                foreach ($asignaciones as $asig) {
                    // Usamos el helper corregido que respeta paralelos si es necesario
                    $estudiantes = $this->_getEstudiantes($asig->asignatura_id, $idPeriodo, $asig->paralelo);
                    $totalEstudiantes = $estudiantes->count();
                    $idsEstudiantes = $estudiantes->pluck('id');

                    $planes = Planificacion::with('detalles')
                        ->where('asignatura_id', $asig->asignatura_id)
                        ->where('docente_id', $asig->docente_id)
                        ->where('periodo_academico', $nombrePeriodo)
                        ->get();

                    if ($planes->isEmpty()) {
                        $totalItemsAvance++;
                        $sumaPorcentajes += 0;
                        continue;
                    }

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

                $cumplimiento = ($totalItemsAvance > 0) 
                    ? round($sumaPorcentajes / $totalItemsAvance, 1) 
                    : 0;

                $reportesFinalizados = 0; 

                $queryAlumnos = Matricula::where('periodo_id', $idPeriodo)->where('estado', 'Activo');
                if (!empty($user->carrera_id)) {
                    $carreraNombre = \App\Models\Carrera::where('id', $user->carrera_id)->value('nombre');
                    if ($carreraNombre) {
                        $queryAlumnos->whereHas('estudiante', fn($q) => $q->where('carrera', $carreraNombre));
                    }
                }
                $totalAlumnos = $queryAlumnos->count();
                
                $stats = [
                    'asignaciones' => $totalCargas, 
                    'planificaciones' => $totalItemsAvance, 
                    'cumplimiento' => $cumplimiento, 
                    'reportes' => $reportesFinalizados, 
                    'alumnos_activos' => $totalAlumnos
                ];
            }

            // ==========================================
            // VISTA DOCENTE (CORREGIDO)
            // ==========================================
            elseif ($user->rol === 'docente') {
                
                $misAsignaciones = Asignacion::where('docente_id', $user->id)
                    ->where('periodo', $nombrePeriodo)->get();
                $misMateriasCount = $misAsignaciones->count();
                
                $misPlanes = Planificacion::where('docente_id', $user->id)
                    ->where('periodo_academico', $nombrePeriodo)->count();

                // CÁLCULO REAL DE ALUMNOS (Manuales + Automáticos)
                $estudiantesUnicos = collect();
                
                foreach ($misAsignaciones as $asig) {
                    // Obtenemos los estudiantes de cada materia asignada, respetando su paralelo
                    $listaClase = $this->_getEstudiantes($asig->asignatura_id, $idPeriodo, $asig->paralelo);
                    // Los agregamos a la colección general
                    $estudiantesUnicos = $estudiantesUnicos->concat($listaClase);
                }

                // Contamos solo los IDs únicos (si un alumno está en 2 materias, cuenta como 1 persona)
                $misEstudiantes = $estudiantesUnicos->unique('id')->count();

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

    // ==========================================
    // HELPER CORREGIDO: Lógica híbrida Manual + Automático
    // ==========================================
    private function _getEstudiantes($asignaturaId, $periodoId, $paralelo = null)
    {
        $asignatura = Asignatura::with(['carrera', 'ciclo'])->find($asignaturaId);
        if (!$asignatura) return collect();

        // 1. Estudiantes Manuales (DetalleMatricula)
        // Filtramos por paralelo SOLO si el registro manual tiene ese dato guardado.
        $estudiantesDirectos = DetalleMatricula::where('asignatura_id', $asignaturaId)
            ->where('estado_materia', '!=', 'Baja')
            ->whereHas('matricula', function($q) use ($periodoId) {
                $q->where('periodo_id', $periodoId)->where('estado', 'Activo');
            })
            ->get()
            ->filter(function($detalle) use ($paralelo) {
                // Si el detalle tiene paralelo específico, debe coincidir.
                // Si no tiene (null), asumimos que es válido para compatibilidad.
                if ($paralelo && !empty($detalle->paralelo)) {
                    return $detalle->paralelo === $paralelo;
                }
                return true;
            })
            ->map(fn($d) => optional($d->matricula)->estudiante)
            ->filter();

        // 2. Estudiantes Automáticos (Por Ciclo/Carrera)
        // Excluimos los que ya tienen registro manual para no duplicar
        $idsConRegistro = DetalleMatricula::where('asignatura_id', $asignaturaId)
            ->whereHas('matricula', fn($q) => $q->where('periodo_id', $periodoId))
            ->pluck('matricula_id');

        $estudiantesCiclo = collect();
        if ($asignatura->ciclo_id) {
            $query = Matricula::where('periodo_id', $periodoId)
                ->where('ciclo_id', $asignatura->ciclo_id)
                ->where('estado', 'Activo')
                ->whereNotIn('id', $idsConRegistro);
            
            // Aquí sí aplicamos el filtro estricto de paralelo de la materia
            if ($paralelo) {
                $query->where('paralelo', $paralelo);
            }

            $estudiantesCiclo = $query->whereHas('estudiante', function($q) use ($asignatura) {
                    if ($asignatura->carrera) {
                        $q->where('carrera', $asignatura->carrera->nombre);
                    }
                })
                ->with('estudiante')
                ->get()
                ->map(fn($m) => $m->estudiante)
                ->filter();
        }

        return $estudiantesDirectos->concat($estudiantesCiclo)->unique('id');
    }
}