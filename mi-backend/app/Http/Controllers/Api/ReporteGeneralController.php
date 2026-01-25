<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Planificacion;
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

            // 1. QUERY GENERAL
            $planesQuery = Planificacion::with(['asignatura.carrera', 'asignatura.ciclo', 'detalles.habilidad', 'docente'])
                ->where('periodo_academico', $request->periodo)
                ->join('asignaturas', 'planificaciones.asignatura_id', '=', 'asignaturas.id')
                ->select('planificaciones.*')
                ->orderBy('asignaturas.nombre');

            if ($request->has('carrera') && $request->carrera !== 'Todas') {
                $planesQuery->whereHas('asignatura.carrera', function($q) use ($request) {
                    $q->where('nombre', 'like', '%' . $request->carrera . '%');
                });
            }

            $planes = $planesQuery->get();

            // Metadatos
            $carreras = $planes->map(fn($p) => $p->asignatura->carrera->nombre ?? null)->filter()->unique()->implode(', ');
            $info = [
                'carrera' => $carreras ?: 'General',
                'periodo' => $request->periodo,
                'docente' => 'Reporte Consolidado'
            ];

            $filas = [];

            foreach ($planes as $plan) {
                // 2. Estudiantes (Validación de Asignatura)
                if (!$plan->asignatura) continue; 

                $estudiantes = $this->_getEstudiantes($plan->asignatura_id, $periodoObj->id);
                $totalEstudiantes = $estudiantes->count();
                $idsEstudiantes = $estudiantes->pluck('id');

                $nombreDocente = $plan->docente ? ($plan->docente->nombres . ' ' . $plan->docente->apellidos) : 'Sin Asignar';
                $nombreAsignatura = $plan->asignatura->nombre . ' (P' . $plan->parcial . ')';
                $nombreCiclo = $plan->asignatura->ciclo->nombre ?? 'N/A';
                
                // Conversión manual de ciclo simple
                $ciclo = str_replace(['Ciclo', 'CICLO'], '', $nombreCiclo);

                foreach ($plan->detalles as $detalle) {
                    
                    // 3. Nombre Habilidad (Prioridad: Relación -> Manual)
                    $nombreHabilidad = 'No definida';
                    if ($detalle->habilidad && $detalle->habilidad->nombre) {
                        $nombreHabilidad = $detalle->habilidad->nombre;
                    } elseif ($detalle->habilidad_blanda_id) {
                        $hab = HabilidadBlanda::find($detalle->habilidad_blanda_id);
                        if ($hab) $nombreHabilidad = $hab->nombre;
                    }

                    // 4. Evaluaciones (CORRECCIÓN CRÍTICA: USAR SOLO LA COLUMNA QUE EXISTE)
                    // Usamos 'habilidad_blanda_id' que es la columna original de la tabla.
                    $evaluaciones = Evaluacion::where('planificacion_id', $plan->id)
                        ->whereIn('estudiante_id', $idsEstudiantes)
                        ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id) 
                        ->get();

                    // 5. Cálculos
                    $evaluadosCount = $evaluaciones->count();
                    $progreso = ($totalEstudiantes > 0) ? round(($evaluadosCount / $totalEstudiantes) * 100) : 0;
                    
                    $estado = 'Sin Planificar';
                    if ($progreso >= 100) $estado = 'Completado';
                    elseif ($progreso > 0) $estado = 'En Proceso';
                    elseif ($totalEstudiantes == 0) $estado = 'Sin Estudiantes';
                    else $estado = 'Planificado';

                    $conteos = [1=>0, 2=>0, 3=>0, 4=>0, 5=>0];
                    foreach ($evaluaciones as $eval) { 
                        if (isset($eval->nivel) && $eval->nivel >= 1 && $eval->nivel <= 5) {
                            $conteos[$eval->nivel]++; 
                        }
                    }

                    $reporteDB = Reporte::where('planificacion_id', $plan->id)
                        ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id)
                        ->first();

                    $filas[] = [
                        'asignatura' => $nombreAsignatura,
                        'ciclo'      => $ciclo,
                        'docente'    => $nombreDocente,
                        'habilidad'  => $nombreHabilidad,
                        'n1' => $conteos[1],
                        'n2' => $conteos[2],
                        'n3' => $conteos[3],
                        'n4' => $conteos[4],
                        'n5' => $conteos[5],
                        'progreso'   => $progreso,
                        'estado'     => $estado,
                        'conclusion' => $reporteDB ? $reporteDB->conclusion_progreso : 'Sin observaciones'
                    ];
                }
            }

            return response()->json(['info' => $info, 'filas' => $filas]);

        } catch (\Exception $e) {
            Log::error('Error ReporteGeneral: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error interno al generar reporte',
                'error_detail' => $e->getMessage()
            ], 500);
        }
    }

    // --- HELPER PRIVADO ---
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