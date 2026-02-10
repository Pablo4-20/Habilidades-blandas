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
                $cicloNumerico = $this->_convertirCiclo($asignacion->asignatura->ciclo->nombre ?? '');

                // --- CORRECCIÓN CLAVE: PASAR EL PARALELO PARA FILTRAR ESTUDIANTES ---
                $estudiantes = $this->_getEstudiantes($asignacion->asignatura_id, $periodoObj->id, $asignacion->paralelo);
                $totalEstudiantes = $estudiantes->count();
                $idsEstudiantes = $estudiantes->pluck('id');

                // 2. BUSCAR PLANIFICACIONES DEL PARCIAL 2
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

                        // --- CÁLCULO DE PROGRESO INDIVIDUAL POR HABILIDAD ---
                        $progreso = 0;
                        
                        // FASE 1: PLANIFICADO (25%)
                        $progreso += 25;

                        // FASE 2: PARCIAL 1 CALIFICADO (25%)
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
                                
                                if ($evaluadosP1 >= $totalEstudiantes) {
                                    $p1Calificado = true;
                                }
                            }
                        }
                        if ($p1Calificado) $progreso += 25;

                        // FASE 3: PARCIAL 2 CALIFICADO (25%)
                        $evaluacionesP2 = Evaluacion::where('planificacion_id', $plan->id)
                            ->whereIn('estudiante_id', $idsEstudiantes)
                            ->where('habilidad_blanda_id', $habilidadId)
                            ->get();

                        $evaluadosCountP2 = $evaluacionesP2->unique('estudiante_id')->count();
                        
                        if ($totalEstudiantes > 0 && $evaluadosCountP2 >= $totalEstudiantes) {
                            $progreso += 25;
                        }

                        // FASE 4: CONCLUSIÓN (25%)
                        $reporteDB = Reporte::where('planificacion_id', $plan->id)
                            ->where('habilidad_blanda_id', $habilidadId)
                            ->first();
                        
                        $tieneConclusion = $reporteDB && !empty($reporteDB->conclusion_progreso);
                        if ($tieneConclusion) $progreso += 25;

                        // ESTADO TEXTO
                        if ($progreso == 25) $estado = 'Planificado';
                        elseif ($progreso == 100) $estado = 'Completado';
                        else $estado = 'En Proceso';

                        // Cálculo promedio P2
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

    // --- FUNCIÓN CORREGIDA: AHORA FILTRA POR PARALELO ---
    private function _getEstudiantes($asignaturaId, $periodoId, $paralelo)
    {
        $asignatura = Asignatura::with(['carrera', 'ciclo'])->find($asignaturaId);
        if (!$asignatura) return collect();

        // 1. Manuales (DetalleMatricula): Filtramos por paralelo en la matrícula
        $manuales = DetalleMatricula::where('asignatura_id', $asignaturaId)
            ->where('estado_materia', '!=', 'Baja')
            ->whereHas('matricula', fn($q) => 
                $q->where('periodo_id', $periodoId)
                  ->where('estado', 'Activo')
                  ->where('paralelo', $paralelo) 
            )
            ->with('matricula.estudiante')->get()
            ->map(fn($d) => optional($d->matricula)->estudiante)->filter();

        // IDs a excluir de la carga automática
        $excluirIds = DetalleMatricula::where('asignatura_id', $asignaturaId)
            ->whereHas('matricula', fn($q) => $q->where('periodo_id', $periodoId))
            ->pluck('matricula_id');

        // 2. Automáticos (Matricula): Filtramos por paralelo directamente
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
   
    public function getEstadoHabilidades(Request $request)
    {
        $periodoNombre = $request->input('periodo');

        if (!$periodoNombre) {
            return response()->json(['message' => 'El periodo es requerido'], 400);
        }

        // 1. Obtener TODAS las habilidades (sin filtrar por activo)
        $todasLasHabilidades = \App\Models\HabilidadBlanda::all();

        // 2. Obtener los IDs de las habilidades reportadas en ese periodo
        // CORRECCIÓN: Usamos el NOMBRE del periodo ($periodoNombre) en lugar del ID.
        // Esto asume que en la tabla 'planificaciones', la columna 'periodo_academico' guarda el texto (ej: "Nov 2025").
        $idsEvaluados = \App\Models\Reporte::whereHas('planificacion', function ($query) use ($periodoNombre) {
            $query->where('periodo_academico', $periodoNombre); 
        })
        ->distinct()
        ->pluck('habilidad_blanda_id')
        ->toArray();

        // 3. Separar en dos colecciones
        $evaluadas = $todasLasHabilidades->whereIn('id', $idsEvaluados)->values();
        $noEvaluadas = $todasLasHabilidades->whereNotIn('id', $idsEvaluados)->values();

        return response()->json([
            'evaluadas' => $evaluadas,
            'noEvaluadas' => $noEvaluadas
        ]);
    }
    
    public function getPromedioPorHabilidad(Request $request)
    {
        $periodoNombre = $request->input('periodo');

        if (!$periodoNombre) {
            return response()->json(['message' => 'El periodo es requerido'], 400);
        }

        // 1. Obtener reportes filtrados por periodo (usando el nombre como string en planificaciones)
        $reportes = \App\Models\Reporte::with([
            'planificacion.asignatura',
            'planificacion.ciclo',
            'planificacion.habilidad', // Asegúrate de que esta relación exista en Planificacion
            // 'planificacion.evaluaciones' // Para contar estudiantes si tienes la relación
        ])
        ->whereHas('planificacion', function ($q) use ($periodoNombre) {
            $q->where('periodo_academico', $periodoNombre);
        })
        ->get();

        // 2. Agrupar por Habilidad
        $agrupado = $reportes->groupBy(function($item) {
            return $item->planificacion->habilidad->nombre ?? 'Sin Habilidad';
        });

        $resultado = [];

        foreach ($agrupado as $nombreHabilidad => $items) {
            $detalles = [];
            $sumaPromedios = 0;
            $conteoMaterias = 0;

            foreach ($items as $rep) {
                // Obtenemos el cumplimiento individual (ej: 85.50)
                $cumplimiento = floatval($rep->cumplimiento);
                
                // Contar estudiantes calificados (Consulta directa para asegurar precisión)
                // Asume que tienes un modelo Evaluacion vinculado a la planificación
                $estudiantesCount = \App\Models\Evaluacion::where('planificacion_id', $rep->planificacion_id)
                                    ->distinct('estudiante_id')
                                    ->count();

                $detalles[] = [
                    'ciclo' => $rep->planificacion->ciclo->nombre ?? 'N/A',
                    'asignatura' => $rep->planificacion->asignatura->nombre ?? 'N/A',
                    // Asumimos que la actividad está en la planificación, si no, pon un texto genérico
                    'actividad' => $rep->planificacion->actividad_aprendizaje ?? 'Evaluación Continua', 
                    'estudiantes' => $estudiantesCount,
                    'promedio' => number_format($cumplimiento, 2)
                ];

                $sumaPromedios += $cumplimiento;
                $conteoMaterias++;
            }

            // 3. Cálculo del Promedio General para esta habilidad
            // (Suma de promedios individuales / Numero de materias)
            $promedioGeneral = $conteoMaterias > 0 ? ($sumaPromedios / $conteoMaterias) : 0;

            $resultado[] = [
                'habilidad' => $nombreHabilidad,
                'promedio_general' => number_format($promedioGeneral, 2),
                'materias' => $detalles
            ];
        }

        return response()->json($resultado);
    }
}
