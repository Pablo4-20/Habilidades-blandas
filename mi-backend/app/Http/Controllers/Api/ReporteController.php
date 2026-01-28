<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Evaluacion;
use App\Models\Reporte;
use App\Models\Planificacion;
use App\Models\Asignatura;
use App\Models\PeriodoAcademico;
use App\Models\DetalleMatricula;
use App\Models\Matricula;
use App\Models\Carrera;
use Illuminate\Support\Facades\DB;

class ReporteController extends Controller
{
    // ==========================================
    // HELPER: Obtener Estudiantes (Lógica Robusta)
    // ==========================================
    private function _getEstudiantes($asignaturaId, $periodoId)
    {
        $asignatura = Asignatura::with(['carrera', 'ciclo'])->find($asignaturaId);
        if (!$asignatura) return collect();

        // 1. Manuales (Agregados por docente)
        $estudiantesDirectos = DetalleMatricula::where('asignatura_id', $asignaturaId)
            ->where('estado_materia', '!=', 'Baja')
            ->whereHas('matricula', function($q) use ($periodoId) {
                $q->where('periodo_id', $periodoId)->where('estado', 'Activo');
            })
            ->with(['matricula.estudiante'])
            ->get()
            ->map(fn($d) => optional($d->matricula)->estudiante)
            ->filter();

        // 2. Automáticos (Por ciclo y carrera)
        $idsConRegistro = DetalleMatricula::where('asignatura_id', $asignaturaId)
            ->whereHas('matricula', fn($q) => $q->where('periodo_id', $periodoId))
            ->pluck('matricula_id');

        $estudiantesCiclo = collect();
        if ($asignatura->ciclo_id) {
            $estudiantesCiclo = Matricula::where('periodo_id', $periodoId)
                ->where('ciclo_id', $asignatura->ciclo_id)
                ->where('estado', 'Activo')
                ->whereNotIn('id', $idsConRegistro)
                ->whereHas('estudiante', function($q) use ($asignatura) {
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

    // ==========================================
    // HELPER: Convertir Romano a Arábigo
    // ==========================================
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

    // ==========================================
    // 1. ACTAS INDIVIDUALES (Para el Docente - PDF Vertical)
    // ==========================================
    public function datosParaPdf(Request $request)
    {
        $request->validate(['asignatura_id' => 'required', 'periodo' => 'required']);
        $user = $request->user();

        $periodoObj = PeriodoAcademico::where('nombre', $request->periodo)->first();
        if (!$periodoObj) return response()->json(['message' => 'Periodo no encontrado'], 404);

        $estudiantes = $this->_getEstudiantes($request->asignatura_id, $periodoObj->id);
        $idsEstudiantes = $estudiantes->pluck('id');

        $planes = Planificacion::with(['asignatura', 'docente', 'detalles.habilidad'])
            ->where('asignatura_id', $request->asignatura_id)
            ->where('docente_id', $user->id)
            ->where('periodo_academico', $request->periodo)
            ->get();

        if ($planes->isEmpty()) {
            return response()->json(['message' => 'No hay planificaciones'], 404);
        }

        $nombreCiclo = $planes[0]->asignatura->ciclo->nombre ?? 'N/A';
        $cicloNumerico = $this->_convertirCiclo($nombreCiclo);

        $infoGeneral = [
            'facultad' => 'CIENCIAS ADMINISTRATIVAS, GESTIÓN EMPRESARIAL E INFORMÁTICA',
            'carrera' => $planes[0]->asignatura->carrera->nombre ?? 'N/A',
            'docente' => $user->nombres . ' ' . $user->apellidos,
            'asignatura' => $planes[0]->asignatura->nombre,
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
                        'n1' => $nivel == 1 ? 'X' : '',
                        'n2' => $nivel == 2 ? 'X' : '',
                        'n3' => $nivel == 3 ? 'X' : '',
                        'n4' => $nivel == 4 ? 'X' : '',
                        'n5' => $nivel == 5 ? 'X' : '',
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

    // ==========================================
    // 2. FICHA RESUMEN GENERAL (PDF Horizontal)
    // ==========================================
    public function pdfDataGeneral(Request $request)
    {
        $request->validate(['periodo' => 'required']);
        $user = $request->user();
        
        $periodoObj = PeriodoAcademico::where('nombre', $request->periodo)->first();
        if (!$periodoObj) return response()->json(['message' => 'Periodo no encontrado'], 404);

        $query = Planificacion::with(['asignatura.carrera', 'asignatura.ciclo', 'docente', 'detalles.habilidad'])
            ->where('periodo_academico', $request->periodo)
            ->where('parcial', '2'); 

        $nombreCarreraReporte = 'General';

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
            $nombreCarreraReporte = $nombre;
        }
        
        $planes = $query->get();

        // --- CORRECCIÓN CLAVE: Detección automática de Carrera ---
        // Si el nombre sigue siendo "General" pero encontramos planes,
        // tomamos el nombre de la carrera de la primera asignatura encontrada.
        if ($nombreCarreraReporte === 'General' && $planes->isNotEmpty()) {
            $primerPlan = $planes->first();
            if ($primerPlan->asignatura && $primerPlan->asignatura->carrera) {
                $nombreCarreraReporte = $primerPlan->asignatura->carrera->nombre;
            }
        }
        // ---------------------------------------------------------

        $planes = $planes->sort(function($a, $b) {
            $cicloA = $this->_convertirCiclo($a->asignatura->ciclo->nombre ?? '');
            $cicloB = $this->_convertirCiclo($b->asignatura->ciclo->nombre ?? '');
            if ($cicloA === $cicloB) {
                return strcmp($a->asignatura->nombre, $b->asignatura->nombre);
            }
            return $cicloA <=> $cicloB;
        });

        $filas = [];
        $info = [
            'carrera' => $nombreCarreraReporte,
            'periodo' => $request->periodo,
            'generado_por' => $user->nombres . ' ' . $user->apellidos
        ];

        foreach ($planes as $plan) {
            $estudiantes = $this->_getEstudiantes($plan->asignatura_id, $periodoObj->id);
            $idsEstudiantes = $estudiantes->pluck('id');
            $cicloNumerico = $this->_convertirCiclo($plan->asignatura->ciclo->nombre ?? 'N/A');

            foreach ($plan->detalles as $detalle) {
                if (!$detalle->habilidad) continue;

                $evaluaciones = Evaluacion::where('planificacion_id', $plan->id)
                    ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id)
                    ->whereIn('estudiante_id', $idsEstudiantes)
                    ->get();

                $conteos = [1=>0, 2=>0, 3=>0, 4=>0, 5=>0];
                $sumaNotas = 0;
                $totalEval = 0;

                foreach ($evaluaciones as $eval) { 
                    if ($eval->nivel) $conteos[$eval->nivel]++; 
                    if (isset($eval->nota)) { 
                        $sumaNotas += $eval->nota; 
                        $totalEval++; 
                    }
                }
                
                $promedio = $totalEval > 0 ? round($sumaNotas / $totalEval, 2) : 0;
                $progreso = ($evaluaciones->count() > 0) ? 100 : 50;

                // BUSCAMOS EL REPORTE DEL DOCENTE
                $reporteDB = Reporte::where('planificacion_id', $plan->id)
                    ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id)
                    ->first();

                $filas[] = [
                    'id_planificacion' => $plan->id,
                    'id_habilidad' => $detalle->habilidad_blanda_id,
                    'ciclo'      => $cicloNumerico,
                    'asignatura' => $plan->asignatura->nombre,
                    'habilidad'  => $detalle->habilidad->nombre,
                    'n1' => $conteos[1],
                    'n2' => $conteos[2],
                    'n3' => $conteos[3],
                    'n4' => $conteos[4],
                    'n5' => $conteos[5],
                    'promedio' => $promedio,
                    'conclusion' => $reporteDB ? ($reporteDB->conclusion_progreso ?? '') : '', 
                    'cumplimiento' => $progreso . '%'
                ];
            }
        }

        return response()->json(['info' => $info, 'filas' => $filas]);
    }

    // ==========================================
    // 3. GUARDAR OBSERVACIONES (CORREGIDO PARA DOCENTE)
    // ==========================================
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

                // CORRECCIÓN: Guardar en el campo del DOCENTE (conclusion_progreso)
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
            \Log::error("Error guardando reporte: " . $e->getMessage());
            return response()->json(['message' => 'Error al guardar: ' . $e->getMessage()], 500);
        }
    }
}