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

        // 1. Manuales (Excluyendo Bajas)
        $estudiantesDirectos = DetalleMatricula::where('asignatura_id', $asignaturaId)
            ->where('estado_materia', '!=', 'Baja')
            ->whereHas('matricula', function($q) use ($periodoId) {
                $q->where('periodo_id', $periodoId)->where('estado', 'Activo');
            })
            ->with(['matricula.estudiante'])
            ->get()
            ->map(fn($d) => optional($d->matricula)->estudiante)
            ->filter();

        // 2. Automáticos (Por Ciclo)
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

        return $estudiantesDirectos->concat($estudiantesCiclo)->unique('id')->sortBy(fn($e) => $e->apellidos . ' ' . $e->nombres);
    }

    // ==========================================
    // 1. ACTAS INDIVIDUALES & MIS REPORTES (Separado por Habilidad)
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

        $infoGeneral = [
            'facultad' => 'CIENCIAS ADMINISTRATIVAS, GESTIÓN EMPRESARIAL E INFORMÁTICA',
            'carrera' => $planes[0]->asignatura->carrera->nombre ?? 'N/A',
            'docente' => $user->nombres . ' ' . $user->apellidos,
            'asignatura' => $planes[0]->asignatura->nombre,
            'ciclo' => $planes[0]->asignatura->ciclo->nombre ?? 'N/A',
            'periodo' => $request->periodo,
        ];

        $reportes = [];

        foreach ($planes as $plan) {
            // Iteramos sobre las habilidades individuales
            foreach ($plan->detalles as $detalle) {
                if (!$detalle->habilidad) continue;

                // Evaluaciones SOLO de esta habilidad
                $evaluaciones = Evaluacion::where('planificacion_id', $plan->id)
                    ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id)
                    ->whereIn('estudiante_id', $idsEstudiantes)
                    ->get();

                // Lista de estudiantes con marcas "X" para el PDF de Actas
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

                // Estadísticas para gráficas
                $conteos = [1=>0, 2=>0, 3=>0, 4=>0, 5=>0];
                foreach ($evaluaciones as $eval) { if ($eval->nivel) $conteos[$eval->nivel]++; }

                // Obtener conclusión específica de esta habilidad
                $reporteDB = Reporte::where('planificacion_id', $plan->id)
                    ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id)
                    ->first();

                $item = [
                    'planificacion_id' => $plan->id,
                    'habilidad_id' => $detalle->habilidad_blanda_id, // ID para guardar
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
    // 2. FICHA RESUMEN GENERAL (Todas las materias)
    // ==========================================
    public function pdfDataGeneral(Request $request)
    {
        $request->validate(['periodo' => 'required']);
        $user = $request->user();
        
        $periodoObj = PeriodoAcademico::where('nombre', $request->periodo)->first();
        if (!$periodoObj) return response()->json(['message' => 'Periodo no encontrado'], 404);

        $planes = Planificacion::with(['asignatura.carrera', 'asignatura.ciclo', 'detalles.habilidad'])
            ->where('docente_id', $user->id)
            ->where('periodo_academico', $request->periodo)
            ->get();

        $filas = [];
        $info = [
            'carrera' => 'Varias',
            'periodo' => $request->periodo,
            'docente' => $user->nombres . ' ' . $user->apellidos
        ];

        foreach ($planes as $plan) {
            $estudiantes = $this->_getEstudiantes($plan->asignatura_id, $periodoObj->id);
            $idsEstudiantes = $estudiantes->pluck('id');

            foreach ($plan->detalles as $detalle) {
                if (!$detalle->habilidad) continue;

                $evaluaciones = Evaluacion::where('planificacion_id', $plan->id)
                    ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id)
                    ->whereIn('estudiante_id', $idsEstudiantes)
                    ->get();

                $conteos = [1=>0, 2=>0, 3=>0, 4=>0, 5=>0];
                foreach ($evaluaciones as $eval) { if ($eval->nivel) $conteos[$eval->nivel]++; }

                $reporteDB = Reporte::where('planificacion_id', $plan->id)
                    ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id)
                    ->first();

                $filas[] = [
                    'asignatura' => $plan->asignatura->nombre,
                    'ciclo' => $plan->asignatura->ciclo->nombre ?? 'N/A',
                    'habilidad' => $detalle->habilidad->nombre . ' (P' . $plan->parcial . ')',
                    'n1' => $conteos[1],
                    'n2' => $conteos[2],
                    'n3' => $conteos[3],
                    'n4' => $conteos[4],
                    'n5' => $conteos[5],
                    'conclusion' => $reporteDB ? $reporteDB->conclusion_progreso : 'Sin observaciones'
                ];
            }
        }

        return response()->json(['info' => $info, 'filas' => $filas]);
    }

    // ==========================================
    // 3. GUARDAR CONCLUSIONES MASIVAS
    // ==========================================
    public function guardarConclusionesMasivas(Request $request)
    {
        $request->validate(['conclusiones' => 'required|array']);

        foreach($request->conclusiones as $item) {
            // Guardamos usando la clave compuesta: Plan + Habilidad
            if (isset($item['habilidad_id'])) {
                Reporte::updateOrCreate(
                    [
                        'planificacion_id' => $item['id'],
                        'habilidad_blanda_id' => $item['habilidad_id']
                    ],
                    [
                        'conclusion_progreso' => $item['texto'], 
                        'fecha_generacion' => now()
                    ]
                );
            } else {
                // Fallback por si acaso (aunque Mis Reportes ya envía habilidad_id)
                // Esto podría sobrescribir si no se envía ID, así que idealmente siempre se envía.
                // Lo dejamos para compatibilidad hacia atrás temporal.
                $firstDetail = DB::table('detalle_planificaciones')->where('planificacion_id', $item['id'])->first();
                if ($firstDetail) {
                     Reporte::updateOrCreate(
                        [
                            'planificacion_id' => $item['id'],
                            'habilidad_blanda_id' => $firstDetail->habilidad_blanda_id
                        ],
                        [
                            'conclusion_progreso' => $item['texto'], 
                            'fecha_generacion' => now()
                        ]
                    );
                }
            }
        }
        return response()->json(['message' => 'Observaciones guardadas correctamente.']);
    }
    
    // Método auxiliar opcional por si se llama desde otra ruta antigua
    public function generar(Request $request) {
        return $this->datosParaPdf($request);
    }
    
    // Método opcional para la matriz visual (si decides usarla después)
    public function obtenerFichaResumen(Request $request) {
        // (Puedes incluir el código de obtenerFichaResumen aquí si lo necesitas para el futuro)
        return response()->json([]);
    }
}