<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Evaluacion;
use App\Models\Reporte;
use App\Models\Planificacion;
use App\Models\Asignatura;
use App\Models\Asignacion; 
use App\Models\PeriodoAcademico;
use App\Models\DetalleMatricula;
use App\Models\Matricula;
use App\Models\Carrera;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReporteController extends Controller
{
    private function _getEstudiantes($asignaturaId, $periodoId, $paralelo = null)
    {
        $asignatura = Asignatura::with(['carrera', 'ciclo'])->find($asignaturaId);
        if (!$asignatura) return collect();

        $estudiantesDirectos = DetalleMatricula::where('asignatura_id', $asignaturaId)
            ->where('estado_materia', '!=', 'Baja')
            ->whereHas('matricula', function($q) use ($periodoId, $paralelo) {
                $q->where('periodo_id', $periodoId)->where('estado', 'Activo');
                if ($paralelo) $q->where('paralelo', $paralelo);
            })
            ->with(['matricula.estudiante'])
            ->get()
            ->map(fn($d) => optional($d->matricula)->estudiante)
            ->filter();

        $idsConRegistro = DetalleMatricula::where('asignatura_id', $asignaturaId)
            ->whereHas('matricula', fn($q) => $q->where('periodo_id', $periodoId))
            ->pluck('matricula_id');

        $estudiantesCiclo = collect();
        if ($asignatura->ciclo_id) {
            $queryAutomaticos = Matricula::where('periodo_id', $periodoId)
                ->where('ciclo_id', $asignatura->ciclo_id)
                ->where('estado', 'Activo')
                ->whereNotIn('id', $idsConRegistro);

            if ($paralelo) $queryAutomaticos->where('paralelo', $paralelo);

            $estudiantesCiclo = $queryAutomaticos->whereHas('estudiante', function($q) use ($asignatura) {
                    if ($asignatura->carrera) {
                        $q->where('carrera', $asignatura->carrera->nombre); 
                    }
                })
                ->with('estudiante')
                ->get()
                ->map(fn($m) => $m->estudiante)
                ->filter();
        }

        return $estudiantesDirectos->concat($estudiantesCiclo)
            ->unique('id')
            ->sortBy(fn($e) => $e->apellidos . ' ' . $e->nombres);
    }

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

    // ----------------------------------------------------
    // ACTAS DE CALIFICACIONES
    // ----------------------------------------------------
    public function datosParaPdf(Request $request)
    {
        $request->validate([
            'asignatura_id' => 'required', 
            'periodo' => 'required',
            'paralelo' => 'required' 
        ]);
        
        $user = $request->user();

        $periodoObj = PeriodoAcademico::where('nombre', $request->periodo)->first();
        if (!$periodoObj) return response()->json(['message' => 'Periodo no encontrado'], 404);

        $estudiantes = $this->_getEstudiantes($request->asignatura_id, $periodoObj->id, $request->paralelo);
        $idsEstudiantes = $estudiantes->pluck('id');

        $planes = Planificacion::with(['asignatura', 'docente', 'detalles.habilidad'])
            ->where('asignatura_id', $request->asignatura_id)
            ->where('docente_id', $user->id)
            ->where('periodo_academico', $request->periodo)
            ->where('paralelo', $request->paralelo) 
            ->get();

        if ($planes->isEmpty()) {
            return response()->json(['message' => 'No hay planificaciones para este paralelo.'], 404);
        }

        $nombreCiclo = $planes[0]->asignatura->ciclo->nombre ?? 'N/A';
        $cicloNumerico = $this->_convertirCiclo($nombreCiclo);

        $infoGeneral = [
            'facultad' => 'CIENCIAS ADMINISTRATIVAS, GESTIÓN EMPRESARIAL E INFORMÁTICA',
            'carrera' => $planes[0]->asignatura->carrera->nombre ?? 'N/A',
            'logo' => $planes[0]->asignatura->carrera->logo ?? null,
            'docente' => $user->nombres . ' ' . $user->apellidos,
            'asignatura' => $planes[0]->asignatura->nombre,
            'paralelo' => $request->paralelo,
            'ciclo' => $cicloNumerico, 
            'periodo' => $request->periodo,
        ];

        $reportes = [];

        foreach ($planes as $plan) {
            foreach ($plan->detalles as $detalle) {
                if (!$detalle->habilidad) continue;

                $evaluaciones = Evaluacion::where('planificacion_id', $plan->id)
                    ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id)
                    ->whereIn('estudiante_id', $idsEstudiantes)
                    ->get();

                $listaDetalle = $estudiantes->map(function($est) use ($evaluaciones) {
                    $nota = $evaluaciones->where('estudiante_id', $est->id)->first();
                    $nivel = $nota ? $nota->nivel : 0;
                    return [
                        'nombre' => $est->apellidos . ' ' . $est->nombres,
                        'n1' => $nivel == 1 ? 'X' : '', 'n2' => $nivel == 2 ? 'X' : '', 'n3' => $nivel == 3 ? 'X' : '', 'n4' => $nivel == 4 ? 'X' : '', 'n5' => $nivel == 5 ? 'X' : '',
                    ];
                })->values();

                $conteos = [1=>0, 2=>0, 3=>0, 4=>0, 5=>0];
                foreach ($evaluaciones as $eval) { if ($eval->nivel) $conteos[$eval->nivel]++; }

                $reporteDB = Reporte::where('planificacion_id', $plan->id)
                    ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id)
                    ->first();

                $item = [
                    'planificacion_id' => $plan->id,
                    'habilidad_id' => $detalle->habilidad_blanda_id,
                    'habilidad' => $detalle->habilidad->nombre,
                    'resultado_aprendizaje' => $detalle->resultado_aprendizaje,
                    'parcial_asignado' => $plan->parcial,
                    'estadisticas' => $conteos, 
                    'conclusion' => $reporteDB ? $reporteDB->conclusion_progreso : ''
                ];

                if ($plan->parcial == '1') {
                    $item['detalle_p1'] = $listaDetalle;
                } else {
                    $item['detalle_p2'] = $listaDetalle;
                }

                $reportes[] = $item;
            }
        }

        return response()->json(['info' => $infoGeneral, 'reportes' => $reportes]);
    }

    // ----------------------------------------------------
    // FICHA RESUMEN DE EJECUCIÓN (PDF HORIZONTAL)
    // ----------------------------------------------------
    public function pdfDataGeneral(Request $request)
    {
        $request->validate(['periodo' => 'required']);
        $user = $request->user();
        
        $periodoObj = PeriodoAcademico::where('nombre', $request->periodo)->first();
        if (!$periodoObj) return response()->json(['message' => 'Periodo no encontrado'], 404);

        $query = Asignacion::with(['asignatura.carrera', 'asignatura.ciclo', 'docente'])
            ->where('periodo', $request->periodo);

        if (!$request->es_coordinador) {
            $query->where('docente_id', $user->id);
        }

        $nombreCarreraReporte = 'General';
        $carreraObj = null;

        if ($user->carrera_id) {
            $query->whereHas('asignatura.carrera', function($q) use ($user) {
                $q->where('id', $user->carrera_id);
            });
            $carreraObj = Carrera::find($user->carrera_id);
            $nombreCarreraReporte = $carreraObj ? $carreraObj->nombre : 'Tu Carrera';
        } elseif ($request->has('carrera') && $request->carrera !== 'Todas') {
            $nombre = $request->carrera;
            $query->whereHas('asignatura.carrera', function($q) use ($nombre) {
                $q->where('nombre', $nombre);
            });
            // AQUÍ AGREGAMOS LA BÚSQUEDA DEL OBJETO PARA OBTENER SU LOGO
            $carreraObj = Carrera::where('nombre', $nombre)->first(); 
            $nombreCarreraReporte = $nombre;
        }

        $asignaciones = $query->get();

        if ($nombreCarreraReporte === 'General' && $asignaciones->isNotEmpty()) {
            $primerAsig = $asignaciones->first();
            if ($primerAsig->asignatura && $primerAsig->asignatura->carrera) {
                $carreraObj = $primerAsig->asignatura->carrera; // AQUÍ TAMBIÉN LO CAPTURAMOS
                $nombreCarreraReporte = $carreraObj->nombre;
            }
        }

        $filas = [];
        $resultadosAprendizaje = []; 

        foreach ($asignaciones as $asignacion) {
            if (!$asignacion->asignatura) continue;

            $cicloNumerico = $this->_convertirCiclo($asignacion->asignatura->ciclo->nombre ?? 'N/A');
            $nombreDocente = $asignacion->docente ? ($asignacion->docente->nombres . ' ' . $asignacion->docente->apellidos) : 'Sin Asignar';
            $nombreAsignatura = $asignacion->asignatura->nombre . " (" . $asignacion->paralelo . ")";

            $planes = Planificacion::with(['detalles.habilidad'])
                ->where('asignatura_id', $asignacion->asignatura_id)
                ->where('docente_id', $asignacion->docente_id)
                ->where('periodo_academico', $request->periodo)
                ->where('paralelo', $asignacion->paralelo)
                ->where('parcial', '2') 
                ->get();

            if ($planes->isEmpty()) {
                $filas[] = [
                    'id_planificacion' => null, 'id_habilidad' => null, 'ciclo' => $cicloNumerico,
                    'asignatura' => $nombreAsignatura, 'docente' => $nombreDocente, 'habilidad' => 'Sin Planificar',
                    'n1' => 0, 'n2' => 0, 'n3' => 0, 'n4' => 0, 'n5' => 0, 'promedio' => 0, 'conclusion' => '', 'cumplimiento' => '0%'
                ];
                continue;
            }

            $estudiantes = $this->_getEstudiantes($asignacion->asignatura_id, $periodoObj->id, $asignacion->paralelo);
            $idsEstudiantes = $estudiantes->pluck('id');

            foreach ($planes as $plan) {
                foreach ($plan->detalles as $detalle) {
                    
                    if (!empty($detalle->resultado_aprendizaje)) {
                        $resultadosAprendizaje[] = $detalle->resultado_aprendizaje;
                    }

                    if (!$detalle->habilidad) continue;

                    $evaluaciones = Evaluacion::where('planificacion_id', $plan->id)
                        ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id)
                        ->whereIn('estudiante_id', $idsEstudiantes)
                        ->get();

                    $conteos = [1=>0, 2=>0, 3=>0, 4=>0, 5=>0];
                    $sumaNotas = 0; $totalEval = 0;
                    foreach ($evaluaciones as $eval) { 
                        if ($eval->nivel) $conteos[$eval->nivel]++; 
                        if (isset($eval->nota)) { $sumaNotas += $eval->nota; $totalEval++; }
                    }
                    $promedio = $totalEval > 0 ? round($sumaNotas / $totalEval, 2) : 0;

                    $reporteDB = Reporte::where('planificacion_id', $plan->id)
                        ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id)
                        ->first();
                    
                    $tieneConclusion = $reporteDB && !empty($reporteDB->conclusion_progreso);
                    $progreso = $tieneConclusion ? 100 : 50;

                    $filas[] = [
                        'id_planificacion' => $plan->id, 'id_habilidad' => $detalle->habilidad_blanda_id,
                        'ciclo' => $cicloNumerico, 'asignatura' => $nombreAsignatura, 'docente' => $nombreDocente,
                        'habilidad' => $detalle->habilidad->nombre,
                        'n1' => $conteos[1], 'n2' => $conteos[2], 'n3' => $conteos[3], 'n4' => $conteos[4], 'n5' => $conteos[5],
                        'promedio' => $promedio, 'conclusion' => $tieneConclusion ? $reporteDB->conclusion_progreso : '', 
                        'cumplimiento' => $progreso . '%'
                    ];
                }
            }
        }

        $filasOrdenadas = collect($filas)->sort(function($a, $b) {
            if ($a['ciclo'] === $b['ciclo']) {
                return strcmp($a['asignatura'], $b['asignatura']);
            }
            return $a['ciclo'] <=> $b['ciclo'];
        })->values();

        // ----------------------------------------------------
        // ¡AQUÍ ESTABA EL ERROR! AHORA SÍ ENVIAMOS EL LOGO
        // ----------------------------------------------------
        $info = [
            'carrera' => $nombreCarreraReporte,
            'logo' => $carreraObj ? $carreraObj->logo : null, // <--- ESTO FALTABA
            'periodo' => $request->periodo,
            'generado_por' => $user->nombres . ' ' . $user->apellidos,
            'resultado_aprendizaje' => implode(" | ", array_unique($resultadosAprendizaje)) 
        ];

        return response()->json(['info' => $info, 'filas' => $filasOrdenadas]);
    }

    // ----------------------------------------------------
    // GUARDAR OBSERVACIONES MASIVAS
    // ----------------------------------------------------
    public function guardarConclusionesMasivas(Request $request)
    {
        $request->validate(['conclusiones' => 'present|array']);

        try {
            DB::beginTransaction();
            foreach($request->conclusiones as $item) {
                if (empty($item['id']) || empty($item['habilidad_id'])) continue;

                $texto = $item['texto'] ?? '';

                $reporte = Reporte::firstOrNew([
                    'planificacion_id' => $item['id'],
                    'habilidad_blanda_id' => $item['habilidad_id']
                ]);

                $reporte->conclusion_progreso = $texto;

                if (!$reporte->fecha_generacion) {
                    $reporte->fecha_generacion = now();
                }
                $reporte->save();
            }

            DB::commit();
            return response()->json(['message' => 'Observaciones guardadas correctamente.']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error guardando reporte: " . $e->getMessage());
            return response()->json(['message' => 'Error al guardar: ' . $e->getMessage()], 500);
        }
    }

    // ----------------------------------------------------
    // REPORTE CON NOTAS PROMEDIO ESTUDIANTES
    // ----------------------------------------------------
    public function obtenerFichaResumen(Request $request)
    {
        $request->validate([
            'asignatura_id' => 'required',
            'periodo' => 'required',
            'paralelo' => 'required' 
        ]);

        $user = $request->user();
        
        $periodoObj = PeriodoAcademico::where('nombre', $request->periodo)->first();
        if (!$periodoObj) return response()->json(['message' => 'Periodo no encontrado'], 404);

        $estudiantes = $this->_getEstudiantes($request->asignatura_id, $periodoObj->id, $request->paralelo);
        $asignatura = Asignatura::with(['carrera', 'ciclo'])->find($request->asignatura_id);
        
        $planes = Planificacion::with(['detalles.habilidad'])
            ->where('asignatura_id', $request->asignatura_id)
            ->where('docente_id', $user->id)
            ->where('periodo_academico', $request->periodo)
            ->where('paralelo', $request->paralelo) 
            ->get();

        $columnas = [];
        $habilidadesMap = []; 

        foreach($planes as $plan) {
            foreach($plan->detalles as $det) {
                if($det->habilidad) {
                    $key = 'h_' . $det->habilidad->id;
                    if(!isset($habilidadesMap[$key])) {
                        $columna = [
                            'id' => $det->habilidad->id,
                            'nombre' => $det->habilidad->nombre,
                            'parcial' => $plan->parcial 
                        ];
                        $columnas[] = $columna;
                        $habilidadesMap[$key] = $columna;
                    }
                }
            }
        }

        usort($columnas, function($a, $b) {
            if ($a['parcial'] == $b['parcial']) return 0;
            return ($a['parcial'] < $b['parcial']) ? -1 : 1;
        });

        $filas = $estudiantes->map(function($est) use ($planes) {
            $fila = [
                'id' => $est->id,
                'cedula' => $est->cedula,
                'nombres' => $est->apellidos . ' ' . $est->nombres,
                'notas' => []
            ];

            foreach($planes as $plan) {
                $evaluaciones = Evaluacion::where('planificacion_id', $plan->id)
                    ->where('estudiante_id', $est->id)
                    ->get();

                foreach($evaluaciones as $ev) {
                    $fila['notas']['h_' . $ev->habilidad_blanda_id] = $ev->nivel;
                }
            }
            
            $suma = 0; $count = 0;
            foreach($fila['notas'] as $nota) {
                if($nota) { $suma += $nota; $count++; }
            }
            $fila['promedio'] = $count > 0 ? round($suma / $count, 2) : 0;

            return $fila;
        });

        return response()->json([
            'info' => [
                'docente' => $user->nombres . ' ' . $user->apellidos,
                'materia' => $asignatura->nombre,
                'paralelo' => $request->paralelo,
                'carrera' => $asignatura->carrera->nombre ?? 'N/A',
                'logo' => $asignatura->carrera->logo ?? null, 
                'ciclo' => $asignatura->ciclo->nombre ?? 'N/A',
                'periodo' => $request->periodo
            ],
            'columnas' => $columnas,
            'filas' => $filas
        ]);
    }
}