<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Planificacion;
use App\Models\Asignacion;
use App\Models\Asignatura;
use App\Models\PeriodoAcademico;
use App\Models\DetalleMatricula;
use App\Models\Matricula;
use App\Models\Evaluacion;
use App\Models\Reporte;
use App\Models\HabilidadBlanda;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReporteGeneralController extends Controller
{
    public function index(Request $request)
    {
        try {
            $request->validate(['periodo' => 'required']);
            
            $periodoObj = PeriodoAcademico::where('nombre', $request->periodo)->first();
            if (!$periodoObj) return response()->json(['message' => 'Periodo no encontrado'], 404);

            // 1. OBTENER ASIGNACIONES (BASE)
            $asignacionesQuery = Asignacion::with(['asignatura.carrera', 'asignatura.ciclo', 'docente'])
                ->where('periodo', $request->periodo)
                ->join('asignaturas', 'asignaciones.asignatura_id', '=', 'asignaturas.id')
                ->select('asignaciones.*') 
                ->orderBy('asignaturas.nombre');

            if ($request->has('carrera') && $request->carrera !== 'Todas') {
                $asignacionesQuery->whereHas('asignatura.carrera', function($q) use ($request) {
                    $q->where('nombre', 'like', '%' . $request->carrera . '%');
                });
            }

            $asignaciones = $asignacionesQuery->get();

            $carreras = $asignaciones->map(fn($a) => $a->asignatura->carrera->nombre ?? null)->filter()->unique()->implode(', ');
            $info = [
                'carrera' => $carreras ?: 'General',
                'periodo' => $request->periodo
            ];

            $filas = [];

            foreach ($asignaciones as $asignacion) {
                if (!$asignacion->asignatura) continue;

                $nombreDocente = $asignacion->docente ? ($asignacion->docente->nombres . ' ' . $asignacion->docente->apellidos) : 'Sin Asignar';
                $nombreCiclo = $asignacion->asignatura->ciclo->nombre ?? 'N/A';
                
                // 2. BUSCAR PLANIFICACIONES
                $planes = Planificacion::with(['detalles.habilidad'])
                    ->where('asignatura_id', $asignacion->asignatura_id)
                    ->where('docente_id', $asignacion->docente_id)
                    ->where('periodo_academico', $request->periodo)
                    ->get();

                // SI NO HAY PLANES (PENDIENTE)
                if ($planes->isEmpty()) {
                    $filas[] = [
                        'asignatura' => $asignacion->asignatura->nombre,
                        'ciclo' => $nombreCiclo,
                        'docente' => $nombreDocente,
                        'habilidad' => 'Sin Planificar',
                        'estado' => 'Pendiente',
                        'progreso' => 0,
                        'promedio' => 0,
                        'conclusion' => 'Docente no ha planificado.',
                        'detalle_estudiantes' => [], // Sin estudiantes
                        'sort_asignatura' => $asignacion->asignatura->nombre,
                        'sort_parcial' => 0
                    ];
                    continue;
                }

                // OBTENER ESTUDIANTES DEL CURSO
                $estudiantes = $this->_getEstudiantes($asignacion->asignatura_id, $periodoObj->id);
                $totalEstudiantes = $estudiantes->count();
                $idsEstudiantes = $estudiantes->pluck('id');

                foreach ($planes as $plan) {
                    $nombreAsignaturaPlan = $asignacion->asignatura->nombre . ' (P' . $plan->parcial . ')';

                    if ($plan->detalles->isEmpty()) continue;

                    foreach ($plan->detalles as $detalle) {
                        // Nombre Habilidad
                        $nombreHabilidad = 'No definida';
                        if ($detalle->habilidad) $nombreHabilidad = $detalle->habilidad->nombre;
                        elseif ($detalle->habilidad_blanda_id) {
                            $hab = HabilidadBlanda::find($detalle->habilidad_blanda_id);
                            if ($hab) $nombreHabilidad = $hab->nombre;
                        }

                        // Evaluaciones
                        $evaluaciones = Evaluacion::where('planificacion_id', $plan->id)
                            ->whereIn('estudiante_id', $idsEstudiantes)
                            ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id)
                            ->get();

                        // --- DETALLE DE ESTUDIANTES Y PROMEDIO ---
                        $listaEstudiantes = [];
                        $sumaNotas = 0;
                        $countNotas = 0;

                        $estudiantesOrdenados = $estudiantes->sortBy(fn($e) => $e->apellidos . ' ' . $e->nombres);

                        foreach ($estudiantesOrdenados as $est) {
                            $nota = $evaluaciones->where('estudiante_id', $est->id)->first();
                            $valorNota = $nota ? $nota->nivel : 0;
                            
                            if ($valorNota > 0) {
                                $sumaNotas += $valorNota;
                                $countNotas++;
                            }

                            $listaEstudiantes[] = [
                                'nombre' => $est->apellidos . ' ' . $est->nombres,
                                'nota' => $valorNota > 0 ? $valorNota : '-' // Guion si no tiene nota
                            ];
                        }

                        $promedioCurso = $countNotas > 0 ? round($sumaNotas / $countNotas, 2) : 0;

                        // Datos Reporte (Observación)
                        $reporteDB = Reporte::where('planificacion_id', $plan->id)
                            ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id)
                            ->first();
                        
                        $tieneConclusion = $reporteDB && !empty($reporteDB->conclusion_progreso);
                        $evaluadosCount = $evaluaciones->count();

                        // Estado
                        $progreso = 25; $estado = 'Planificado';
                        if ($evaluadosCount > 0) { $progreso = 50; $estado = 'En Proceso'; }
                        if ($totalEstudiantes > 0 && $evaluadosCount >= $totalEstudiantes && $tieneConclusion) {
                            $progreso = 100; $estado = 'Completado';
                        }

                        $filas[] = [
                            'asignatura' => $nombreAsignaturaPlan,
                            'ciclo' => $nombreCiclo,
                            'docente' => $nombreDocente,
                            'habilidad' => $nombreHabilidad,
                            'estado' => $estado,
                            'progreso' => $progreso,
                            'promedio' => $promedioCurso,
                            'conclusion' => $reporteDB ? $reporteDB->conclusion_progreso : 'Sin observaciones',
                            'detalle_estudiantes' => $listaEstudiantes, // AQUÍ VA LA LISTA COMPLETA
                            'sort_asignatura' => $asignacion->asignatura->nombre,
                            'sort_parcial' => $plan->parcial
                        ];
                    }
                }
            }

            // Ordenar: Asignatura -> Parcial
            $filasOrdenadas = collect($filas)->sortBy([
                ['sort_asignatura', 'asc'],
                ['sort_parcial', 'asc']
            ])->values();

            return response()->json(['info' => $info, 'filas' => $filasOrdenadas]);

        } catch (\Exception $e) {
            Log::error('Error Reporte: ' . $e->getMessage());
            return response()->json(['message' => 'Error interno'], 500);
        }
    }

    // --- HELPER PARA OBTENER ESTUDIANTES ---
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