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
use App\Models\Carrera;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReporteGeneralController extends Controller
{
    // HELPER: Convertir ciclo a número para ordenamiento correcto
    private function _convertirCiclo($nombreCiclo)
    {
        preg_match('/\d+/', $nombreCiclo, $matches);
        if (!empty($matches[0])) return (int)$matches[0];

        $romanos = [
            'I' => 1, 'II' => 2, 'III' => 3, 'IV' => 4, 'V' => 5,
            'VI' => 6, 'VII' => 7, 'VIII' => 8, 'IX' => 9, 'X' => 10
        ];
        
        $limpio = strtoupper(trim(str_replace(['Ciclo', 'CICLO'], '', $nombreCiclo)));
        return $romanos[$limpio] ?? 0;
    }

    public function index(Request $request)
    {
        try {
            $request->validate(['periodo' => 'required']);
            
            $user = $request->user(); 
            
            $periodoObj = PeriodoAcademico::where('nombre', $request->periodo)->first();
            if (!$periodoObj) return response()->json(['message' => 'Periodo no encontrado'], 404);

            // 1. OBTENER ASIGNACIONES
            $asignacionesQuery = Asignacion::with(['asignatura.carrera', 'asignatura.ciclo', 'docente'])
                ->where('periodo', $request->periodo)
                ->join('asignaturas', 'asignaciones.asignatura_id', '=', 'asignaturas.id')
                ->select('asignaciones.*') 
                ->orderBy('asignaturas.nombre');

            $nombreCarreraReporte = 'General';

            if ($user->carrera_id) {
                $asignacionesQuery->whereHas('asignatura.carrera', function($q) use ($user) {
                    $q->where('id', $user->carrera_id);
                });
                $carreraObj = Carrera::find($user->carrera_id);
                $nombreCarreraReporte = $carreraObj ? $carreraObj->nombre : 'Tu Carrera';

            } elseif ($request->has('carrera') && $request->carrera !== 'Todas') {
                $asignacionesQuery->whereHas('asignatura.carrera', function($q) use ($request) {
                    $q->where('nombre', 'like', '%' . $request->carrera . '%');
                });
                $nombreCarreraReporte = $request->carrera;
            }

            $asignaciones = $asignacionesQuery->get();

            if ($nombreCarreraReporte === 'General' && $asignaciones->isNotEmpty()) {
                $nombresUnicos = $asignaciones->map(fn($a) => $a->asignatura->carrera->nombre ?? null)->filter()->unique();
                if ($nombresUnicos->count() === 1) {
                    $nombreCarreraReporte = $nombresUnicos->first();
                } elseif ($nombresUnicos->count() > 1) {
                    $nombreCarreraReporte = 'Todas las Carreras';
                }
            }

            $info = [
                'carrera' => $nombreCarreraReporte,
                'periodo' => $request->periodo
            ];

            $filas = [];

            foreach ($asignaciones as $asignacion) {
                if (!$asignacion->asignatura) continue;

                $nombreDocente = $asignacion->docente ? ($asignacion->docente->nombres . ' ' . $asignacion->docente->apellidos) : 'Sin Asignar';
                // Convertimos el ciclo a número para que el PDF agrupe bien (ej. 1, 2, 3 en vez de "Ciclo I")
                $cicloNumerico = $this->_convertirCiclo($asignacion->asignatura->ciclo->nombre ?? '');
                
                // 2. BUSCAR PLANIFICACIONES (Solo Parcial 2 o General)
                $planes = Planificacion::with(['detalles.habilidad'])
                    ->where('asignatura_id', $asignacion->asignatura_id)
                    ->where('docente_id', $asignacion->docente_id)
                    ->where('periodo_academico', $request->periodo)
                    ->where('parcial', '2') // Generalmente el reporte final es del parcial 2, o puedes quitar esto si quieres ambos
                    ->get();

                // Si no hay planes, enviamos fila vacía para que conste que no se hizo
                if ($planes->isEmpty()) {
                    $filas[] = [
                        'id_planificacion' => null,
                        'id_habilidad' => null,
                        'asignatura' => $asignacion->asignatura->nombre,
                        'carrera' => $asignacion->asignatura->carrera->nombre ?? '',
                        'ciclo' => $cicloNumerico,
                        'docente' => $nombreDocente,
                        'habilidad' => 'Sin Planificar',
                        'estado' => 'Pendiente',
                        'progreso' => 0,
                        'cumplimiento' => '0%', // REQUERIDO POR FRONTEND
                        'promedio' => 0,
                        'conclusion' => 'Docente no ha planificado.',
                        'n1'=>0, 'n2'=>0, 'n3'=>0, 'n4'=>0, 'n5'=>0, // REQUERIDO POR FRONTEND
                        'detalle_estudiantes' => [], 
                        'sort_asignatura' => $asignacion->asignatura->nombre,
                        'sort_parcial' => 0
                    ];
                    continue;
                }

                $estudiantes = $this->_getEstudiantes($asignacion->asignatura_id, $periodoObj->id);
                $totalEstudiantes = $estudiantes->count();
                $idsEstudiantes = $estudiantes->pluck('id');

                foreach ($planes as $plan) {
                    // Si tienes ambos parciales y quieres diferenciarlos, descomenta:
                    // $nombreAsignaturaPlan = $asignacion->asignatura->nombre . ' (P' . $plan->parcial . ')';
                    $nombreAsignaturaPlan = $asignacion->asignatura->nombre;

                    if ($plan->detalles->isEmpty()) continue;

                    foreach ($plan->detalles as $detalle) {
                        $nombreHabilidad = 'No definida';
                        if ($detalle->habilidad) $nombreHabilidad = $detalle->habilidad->nombre;
                        elseif ($detalle->habilidad_blanda_id) {
                            $hab = HabilidadBlanda::find($detalle->habilidad_blanda_id);
                            if ($hab) $nombreHabilidad = $hab->nombre;
                        }

                        $evaluaciones = Evaluacion::where('planificacion_id', $plan->id)
                            ->whereIn('estudiante_id', $idsEstudiantes)
                            ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id)
                            ->get();

                        // --- CÁLCULO DE ESTADÍSTICAS (LO QUE FALTABA) ---
                        $conteos = [1=>0, 2=>0, 3=>0, 4=>0, 5=>0];
                        $sumaNotas = 0;
                        $countNotas = 0;

                        foreach ($evaluaciones as $eval) {
                            // Conteo para niveles N1-N5
                            if ($eval->nivel >= 1 && $eval->nivel <= 5) {
                                $conteos[$eval->nivel]++;
                            }
                            // Para promedio
                            if ($eval->nivel > 0) {
                                $sumaNotas += $eval->nivel;
                                $countNotas++;
                            }
                        }

                        $promedioCurso = $countNotas > 0 ? round($sumaNotas / $countNotas, 2) : 0;

                        $reporteDB = Reporte::where('planificacion_id', $plan->id)
                            ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id)
                            ->first();
                        
                        $tieneConclusion = $reporteDB && !empty($reporteDB->conclusion_progreso);
                        $evaluadosCount = $evaluaciones->count();

                        $progreso = 25; $estado = 'Planificado';
                        if ($evaluadosCount > 0) { $progreso = 50; $estado = 'En Proceso'; }
                        if ($totalEstudiantes > 0 && $evaluadosCount >= $totalEstudiantes && $tieneConclusion) {
                            $progreso = 100; $estado = 'Completado';
                        }

                        $filas[] = [
                            'id_planificacion' => $plan->id,
                            'id_habilidad' => $detalle->habilidad_blanda_id,
                            'asignatura' => $nombreAsignaturaPlan,
                            'carrera' => $asignacion->asignatura->carrera->nombre ?? '',
                            'ciclo' => $cicloNumerico,
                            'docente' => $nombreDocente,
                            'habilidad' => $nombreHabilidad,
                            'estado' => $estado,
                            'progreso' => $progreso,
                            'cumplimiento' => $progreso . '%', // AÑADIDO: Formato string para PDF
                            'promedio' => $promedioCurso,
                            'conclusion' => $reporteDB ? $reporteDB->conclusion_progreso : '', 
                            
                            // AÑADIDO: Contadores individuales
                            'n1' => $conteos[1],
                            'n2' => $conteos[2],
                            'n3' => $conteos[3],
                            'n4' => $conteos[4],
                            'n5' => $conteos[5],

                            'sort_asignatura' => $asignacion->asignatura->nombre,
                            'sort_parcial' => $plan->parcial
                        ];
                    }
                }
            }

            // Ordenar: Primero por ciclo, luego por asignatura
            $filasOrdenadas = collect($filas)->sortBy([
                ['ciclo', 'asc'],
                ['sort_asignatura', 'asc']
            ])->values();

            return response()->json(['info' => $info, 'filas' => $filasOrdenadas]);

        } catch (\Exception $e) {
            Log::error('Error Reporte: ' . $e->getMessage());
            return response()->json(['message' => 'Error interno'], 500);
        }
    }

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