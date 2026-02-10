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
use App\Models\DetallePlanificacion;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReporteGeneralController extends Controller
{
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

            // ... (resto de lógica de nombre carrera) ...
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
                $cicloNumerico = $this->_convertirCiclo($asignacion->asignatura->ciclo->nombre ?? '');

                $estudiantes = $this->_getEstudiantes($asignacion->asignatura_id, $periodoObj->id, $asignacion->paralelo);
                $totalEstudiantes = $estudiantes->count();
                $idsEstudiantes = $estudiantes->pluck('id');

                $planes = Planificacion::with(['detalles.habilidad'])
                    ->where('asignatura_id', $asignacion->asignatura_id)
                    ->where('docente_id', $asignacion->docente_id)
                    ->where('periodo_academico', $request->periodo)
                    ->where('paralelo', $asignacion->paralelo) 
                    ->where('parcial', '2') 
                    ->get();

                if ($planes->isEmpty()) {
                    $filas[] = [
                        'id_planificacion' => null,
                        'id_habilidad' => null,
                        'asignatura' => $asignacion->asignatura->nombre,
                        'paralelo' => $asignacion->paralelo,
                        'carrera' => $asignacion->asignatura->carrera->nombre ?? '',
                        'ciclo' => $cicloNumerico,
                        'docente' => $nombreDocente,
                        'habilidad' => 'Sin Planificar',
                        'estado' => 'Pendiente',
                        'progreso' => 0,
                        'cumplimiento' => '0%',
                        'promedio' => 0,
                        'conclusion' => 'Docente no ha planificado.',
                        'n1'=>0, 'n2'=>0, 'n3'=>0, 'n4'=>0, 'n5'=>0,
                        'detalle_estudiantes' => [], 
                        'sort_asignatura' => $asignacion->asignatura->nombre,
                        'sort_parcial' => 0
                    ];
                    continue;
                }

                foreach ($planes as $plan) {
                    $nombreAsignaturaPlan = $asignacion->asignatura->nombre;

                    if ($plan->detalles->isEmpty()) continue;

                    foreach ($plan->detalles as $detalle) {
                        $habilidadId = $detalle->habilidad_blanda_id;
                        $nombreHabilidad = 'No definida';
                        if ($detalle->habilidad) $nombreHabilidad = $detalle->habilidad->nombre;
                        elseif ($habilidadId) {
                            $hab = HabilidadBlanda::find($habilidadId);
                            if ($hab) $nombreHabilidad = $hab->nombre;
                        }

                        $progreso = 0;
                        $progreso += 25; // FASE 1

                        // FASE 2
                        $p1Calificado = false;
                        if ($totalEstudiantes > 0 && $habilidadId) {
                            $planP1 = Planificacion::where('asignatura_id', $asignacion->asignatura_id)
                                ->where('docente_id', $asignacion->docente_id)
                                ->where('periodo_academico', $request->periodo)
                                ->where('paralelo', $asignacion->paralelo)
                                ->where('parcial', '1') 
                                ->whereHas('detalles', function($q) use ($habilidadId) {
                                    $q->where('habilidad_blanda_id', $habilidadId);
                                })
                                ->first();

                            if ($planP1) {
                                $evaluadosP1 = Evaluacion::where('planificacion_id', $planP1->id)
                                    ->where('habilidad_blanda_id', $habilidadId)
                                    ->whereIn('estudiante_id', $idsEstudiantes)
                                    ->distinct('estudiante_id')
                                    ->count();
                                if ($evaluadosP1 >= $totalEstudiantes) $p1Calificado = true;
                            }
                        }
                        if ($p1Calificado) $progreso += 25;

                        // FASE 3
                        $evaluacionesP2 = Evaluacion::where('planificacion_id', $plan->id)
                            ->whereIn('estudiante_id', $idsEstudiantes)
                            ->where('habilidad_blanda_id', $habilidadId)
                            ->get();
                        $evaluadosCountP2 = $evaluacionesP2->unique('estudiante_id')->count();
                        if ($totalEstudiantes > 0 && $evaluadosCountP2 >= $totalEstudiantes) $progreso += 25;

                        // FASE 4
                        $reporteDB = Reporte::where('planificacion_id', $plan->id)
                            ->where('habilidad_blanda_id', $habilidadId)
                            ->first();
                        if ($reporteDB && !empty($reporteDB->conclusion_progreso)) $progreso += 25;

                        if ($progreso == 25) $estado = 'Planificado';
                        elseif ($progreso == 100) $estado = 'Completado';
                        else $estado = 'En Proceso';

                        $conteos = [1=>0, 2=>0, 3=>0, 4=>0, 5=>0];
                        $sumaNotas = 0; $countNotas = 0;
                        foreach ($evaluacionesP2 as $eval) {
                            if ($eval->nivel >= 1 && $eval->nivel <= 5) $conteos[$eval->nivel]++;
                            if ($eval->nivel > 0) { $sumaNotas += $eval->nivel; $countNotas++; }
                        }
                        $promedioCurso = $countNotas > 0 ? round($sumaNotas / $countNotas, 2) : 0;

                        $filas[] = [
                            'id_planificacion' => $plan->id,
                            'id_habilidad' => $habilidadId,
                            'asignatura' => $nombreAsignaturaPlan,
                            'paralelo' => $asignacion->paralelo,
                            'carrera' => $asignacion->asignatura->carrera->nombre ?? '',
                            'ciclo' => $cicloNumerico,
                            'docente' => $nombreDocente,
                            'habilidad' => $nombreHabilidad,
                            'estado' => $estado,
                            'progreso' => $progreso,
                            'cumplimiento' => $progreso . '%',
                            'promedio' => $promedioCurso,
                            'conclusion' => $reporteDB ? $reporteDB->conclusion_progreso : '', 
                            'n1' => $conteos[1], 'n2' => $conteos[2], 'n3' => $conteos[3], 'n4' => $conteos[4], 'n5' => $conteos[5],
                            'sort_asignatura' => $asignacion->asignatura->nombre,
                            'sort_parcial' => $plan->parcial
                        ];
                    }
                }
            }

            $filasOrdenadas = collect($filas)->sortBy([
                ['ciclo', 'asc'], ['sort_asignatura', 'asc'], ['paralelo', 'asc']
            ])->values();

            return response()->json(['info' => $info, 'filas' => $filasOrdenadas]);

        } catch (\Exception $e) {
            Log::error('Error Reporte: ' . $e->getMessage());
            return response()->json(['message' => 'Error interno'], 500);
        }
    }

    private function _getEstudiantes($asignaturaId, $periodoId, $paralelo)
    {
        $asignatura = Asignatura::with(['carrera', 'ciclo'])->find($asignaturaId);
        if (!$asignatura) return collect();

        $manuales = DetalleMatricula::where('asignatura_id', $asignaturaId)
            ->where('estado_materia', '!=', 'Baja')
            ->whereHas('matricula', fn($q) => 
                $q->where('periodo_id', $periodoId)
                  ->where('estado', 'Activo')
                  ->where('paralelo', $paralelo) 
            )
            ->with('matricula.estudiante')->get()
            ->map(fn($d) => optional($d->matricula)->estudiante)->filter();

        $excluirIds = DetalleMatricula::where('asignatura_id', $asignaturaId)
            ->whereHas('matricula', fn($q) => $q->where('periodo_id', $periodoId))
            ->pluck('matricula_id');

        $automaticos = collect();
        if ($asignatura->ciclo_id) {
            $automaticos = Matricula::where('periodo_id', $periodoId)
                ->where('ciclo_id', $asignatura->ciclo_id)
                ->where('paralelo', $paralelo) 
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

    /**
     * HABILIDADES EVALUADAS: FILTRADO POR CARRERA DEL COORDINADOR
     */
    public function getEstadoHabilidades(Request $request)
    {
        $periodoNombre = $request->input('periodo');
        $user = $request->user(); // Usuario logueado (Coordinador)

        if (!$periodoNombre) return response()->json(['message' => 'El periodo es requerido'], 400);

        $todasLasHabilidades = HabilidadBlanda::all();

        // 1. Obtener IDs de habilidades evaluadas en el periodo
        $queryReportes = Reporte::whereHas('planificacion', function ($query) use ($periodoNombre) {
            $query->where('periodo_academico', $periodoNombre); 
        });

        // Filtro por carrera del coordinador
        if ($user->carrera_id) {
            $queryReportes->whereHas('planificacion.asignatura', function($q) use ($user) {
                $q->where('carrera_id', $user->carrera_id);
            });
        }

        $idsEvaluados = $queryReportes->distinct()
            ->pluck('habilidad_blanda_id')
            ->toArray();

        // 2. Procesar Evaluadas para adjuntar asignaturas
        $evaluadas = $todasLasHabilidades->whereIn('id', $idsEvaluados)->map(function($habilidad) use ($periodoNombre, $user) {
            
            // Consultar dónde se evaluó esta habilidad específica
            $qry = Reporte::where('habilidad_blanda_id', $habilidad->id)
                ->whereHas('planificacion', function($q) use ($periodoNombre) {
                    $q->where('periodo_academico', $periodoNombre);
                })
                ->with(['planificacion.asignatura.ciclo', 'planificacion.docente']);

            if ($user->carrera_id) {
                $qry->whereHas('planificacion.asignatura', function($q) use ($user) {
                    $q->where('carrera_id', $user->carrera_id);
                });
            }

            $reportes = $qry->get();

            // Formatear detalles
            $detalles = $reportes->map(function($rep) {
                return [
                    'materia' => $rep->planificacion->asignatura->nombre ?? 'Desconocida',
                    'ciclo'   => $rep->planificacion->asignatura->ciclo->nombre ?? '',
                    'paralelo'=> $rep->planificacion->paralelo,
                    'docente' => $rep->planificacion->docente ? ($rep->planificacion->docente->nombres . ' ' . $rep->planificacion->docente->apellidos) : ''
                ];
            });

            // Eliminar duplicados (por si hay varios reportes en la misma materia/paralelo) y adjuntar
            $habilidad->detalle_asignaturas = $detalles->unique(function ($item) {
                return $item['materia'].$item['paralelo'];
            })->values();

            return $habilidad;
        })->values();

        // 3. Procesar No Evaluadas
        $noEvaluadas = $todasLasHabilidades->whereNotIn('id', $idsEvaluados)->values();

        return response()->json([
            'evaluadas' => $evaluadas,
            'noEvaluadas' => $noEvaluadas
        ]);
    }
    
    /**
     * PROMEDIO POR HABILIDAD: FILTRADO POR CARRERA DEL COORDINADOR
     */
    public function getPromedioPorHabilidad(Request $request)
    {
        $periodoNombre = $request->input('periodo');
        $user = $request->user(); 

        if (!$periodoNombre) return response()->json(['message' => 'El periodo es requerido'], 400);

        // --- 1. Obtener Nombre Carrera ---
        $nombreCarrera = 'Carrera General';
        if ($user->carrera_id) {
            $carreraObj = Carrera::find($user->carrera_id);
            if ($carreraObj) $nombreCarrera = $carreraObj->nombre;
        }

        // --- 2. Consultar Reportes ---
        $queryReportes = Reporte::with([
            'planificacion.asignatura.ciclo',
            'habilidad',
        ])
        ->whereHas('planificacion', function ($q) use ($periodoNombre) {
            $q->where('periodo_academico', $periodoNombre)
              ->where('parcial', '2'); // Solo segundo parcial
        });

        if ($user->carrera_id) {
            $queryReportes->whereHas('planificacion.asignatura', function($q) use ($user) {
                $q->where('carrera_id', $user->carrera_id);
            });
        }

        $reportes = $queryReportes->get();

        // --- 3. Agrupar por Ciclo ---
        $porCiclo = $reportes->groupBy(function($item) {
            return $item->planificacion->asignatura->ciclo->nombre ?? 'Sin Ciclo';
        });

        $resultadoCiclos = [];

        foreach ($porCiclo as $nombreCiclo => $reportesCiclo) {
            
            // Dentro del ciclo, agrupar por Habilidad
            $porHabilidad = $reportesCiclo->groupBy(function($item) {
                return $item->habilidad->nombre ?? 'Sin Habilidad';
            });

            $habilidadesData = [];

            foreach ($porHabilidad as $nombreHabilidad => $items) {
                $detalles = [];
                $sumaPromedios = 0;
                $conteoMaterias = 0;

                foreach ($items as $rep) {
                    // Cálculo Promedio Individual (Escala 1-5)
                    $evals = Evaluacion::where('planificacion_id', $rep->planificacion_id)
                                ->where('habilidad_blanda_id', $rep->habilidad_blanda_id)
                                ->get();

                    $n1 = $evals->where('nivel', 1)->count();
                    $n2 = $evals->where('nivel', 2)->count();
                    $n3 = $evals->where('nivel', 3)->count();
                    $n4 = $evals->where('nivel', 4)->count();
                    $n5 = $evals->where('nivel', 5)->count();

                    $totalEstudiantes = $n1 + $n2 + $n3 + $n4 + $n5;

                    if ($totalEstudiantes > 0) {
                        $sumaPonderada = ($n1 * 1) + ($n2 * 2) + ($n3 * 3) + ($n4 * 4) + ($n5 * 5);
                        $promedioIndividual = $sumaPonderada / $totalEstudiantes;
                    } else {
                        $promedioIndividual = 0;
                    }

                    $detallePlan = DetallePlanificacion::where('planificacion_id', $rep->planificacion_id)
                                    ->where('habilidad_blanda_id', $rep->habilidad_blanda_id)
                                    ->first();
                    
                    $nombreActividad = $detallePlan ? $detallePlan->actividades : 'Sin actividad';

                    $detalles[] = [
                        'asignatura' => $rep->planificacion->asignatura->nombre ?? 'N/A',
                        'paralelo' => $rep->planificacion->paralelo,
                        'actividad' => $nombreActividad,
                        'estudiantes' => $totalEstudiantes,
                        'promedio' => number_format($promedioIndividual, 2)
                    ];

                    $sumaPromedios += $promedioIndividual;
                    $conteoMaterias++;
                }

                $promedioGeneralHabilidad = $conteoMaterias > 0 ? ($sumaPromedios / $conteoMaterias) : 0;

                $habilidadesData[] = [
                    'habilidad' => $nombreHabilidad,
                    'promedio_ciclo' => number_format($promedioGeneralHabilidad, 2),
                    'materias' => $detalles
                ];
            }

            $resultadoCiclos[] = [
                'ciclo' => $nombreCiclo,
                'order' => $this->_convertirCiclo($nombreCiclo),
                'habilidades' => $habilidadesData
            ];
        }

        // --- 4. Ordenar Ciclos (I, II, III...) ---
        usort($resultadoCiclos, function($a, $b) {
            return $a['order'] <=> $b['order'];
        });

        return response()->json([
            'carrera' => $nombreCarrera,
            'data' => $resultadoCiclos // Estructura: [ {ciclo, habilidades: []}, ... ]
        ]);
    }
}