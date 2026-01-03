<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Evaluacion;
use App\Models\Reporte;
use App\Models\Planificacion;
use Illuminate\Support\Facades\DB;

class ReporteController extends Controller
{
    // Generar estadísticas (Soporta Parcial 1, 2 o Ambos)
    public function generar(Request $request)
    {
        $request->validate([
            'planificacion_id' => 'required|exists:planificaciones,id',
            'parcial' => 'required' // Puede ser '1', '2' o 'final'
        ]);

        $query = Evaluacion::select('nivel', DB::raw('count(*) as total'))
            ->where('planificacion_id', $request->planificacion_id);

        if ($request->parcial !== 'final') {
            $query->where('parcial', $request->parcial);
        }

        $estadisticas = $query->groupBy('nivel')->pluck('total', 'nivel');

        $datos = [
            1 => $estadisticas[1] ?? 0,
            2 => $estadisticas[2] ?? 0,
            3 => $estadisticas[3] ?? 0,
            4 => $estadisticas[4] ?? 0,
            5 => $estadisticas[5] ?? 0,
        ];

        $reporte = Reporte::where('planificacion_id', $request->planificacion_id)->first();

        return response()->json([
            'estadisticas' => $datos,
            'conclusion' => $reporte ? $reporte->conclusion_progreso : '',
            'total_evaluados' => array_sum($datos)
        ]);
    }

    // Guardar la conclusión del docente
    public function guardar(Request $request)
    {
        $request->validate([
            'planificacion_id' => 'required|exists:planificaciones,id',
            'conclusion' => 'required|string|max:1000'
        ]);

        Reporte::updateOrCreate(
            ['planificacion_id' => $request->planificacion_id],
            [
                'conclusion_progreso' => $request->conclusion,
                'fecha_generacion' => now()
            ]
        );

        return response()->json(['message' => 'Reporte guardado correctamente.']);
    }

    // Obtener TODA la info para el PDF (Resumen + Listas detalladas)
    public function datosParaPdf(Request $request)
    {
        $request->validate(['asignatura_id' => 'required']);
        $user = $request->user();

        $planes = Planificacion::with(['asignatura', 'docente', 'detalles.habilidad.catalogo'])
            ->where('asignatura_id', $request->asignatura_id)
            ->where('docente_id', $user->id)
            ->get();

        if ($planes->isEmpty()) {
            return response()->json(['message' => 'No hay habilidades planificadas'], 404);
        }

        $infoGeneral = [
            'facultad' => 'CIENCIAS ADMINISTRATIVAS, GESTIÓN EMPRESARIAL E INFORMÁTICA',
            'carrera' => $planes[0]->asignatura->carrera,
            'docente' => $planes[0]->docente->name ?? ($planes[0]->docente->nombres . ' ' . $planes[0]->docente->apellidos),
            'asignatura' => $planes[0]->asignatura->nombre,
            'ciclo' => $planes[0]->asignatura->ciclo,
            'periodo' => $planes[0]->periodo_academico,
        ];

        $reportes = [];

        foreach ($planes as $plan) {
            $estudiantes = \App\Models\Estudiante::where('carrera', $plan->asignatura->carrera)
                ->where('ciclo_actual', $plan->asignatura->ciclo)
                ->orderBy('apellidos')
                ->get();

            $notasP1 = Evaluacion::where('planificacion_id', $plan->id)->where('parcial', '1')->get()->keyBy('estudiante_id');
            $notasP2 = Evaluacion::where('planificacion_id', $plan->id)->where('parcial', '2')->get()->keyBy('estudiante_id');

            $listaP1 = $this->formatearLista($estudiantes, $notasP1);
            $listaP2 = $this->formatearLista($estudiantes, $notasP2);

            $notasParaEstadistica = ($plan->parcial === '1') ? $notasP1 : $notasP2;

            $conteos = [1=>0, 2=>0, 3=>0, 4=>0, 5=>0];
            foreach ($notasParaEstadistica as $nota) { 
                if ($nota->nivel) $conteos[$nota->nivel]++; 
            }

            $reporteDB = Reporte::where('planificacion_id', $plan->id)->first();

           
            $nombresHabilidades = $plan->detalles->map(function($d) {
                return ($d->habilidad && $d->habilidad->catalogo) 
                    ? $d->habilidad->catalogo->nombre 
                    : null;
            })->filter()->unique()->implode(', ');

            $reportes[] = [
                'planificacion_id' => $plan->id,
                'habilidad' => $nombresHabilidades ?: 'Sin Habilidad Definida',
                'parcial_asignado' => $plan->parcial,
                'estadisticas' => $conteos, 
                'detalle_p1' => $listaP1,
                'detalle_p2' => $listaP2,
                'conclusion' => $reporteDB ? $reporteDB->conclusion_progreso : ''
            ];
        }

        return response()->json([
            'info' => $infoGeneral,
            'reportes' => $reportes
        ]);
    }

    private function formatearLista($estudiantes, $notas) {
        return $estudiantes->map(function($est) use ($notas) {
            $nivel = $notas[$est->id]->nivel ?? null;
            return [
                'nombre' => $est->apellidos . ' ' . $est->nombres,
                'n1' => $nivel == 1 ? 'X' : '',
                'n2' => $nivel == 2 ? 'X' : '',
                'n3' => $nivel == 3 ? 'X' : '',
                'n4' => $nivel == 4 ? 'X' : '',
                'n5' => $nivel == 5 ? 'X' : '',
            ];
        });
    }

    // --- REPORTE GENERAL PARA EL COORDINADOR ---
    public function reporteGeneral(Request $request)
    {
        // 1. Filtros
        $carrera = $request->query('carrera');
        $periodo = $request->query('periodo');

        // 2. Consulta Base de Asignaciones
        $query = \App\Models\Asignacion::with(['asignatura', 'docente']);

        if ($carrera && $carrera !== 'Todas') {
            $query->whereHas('asignatura', function($q) use ($carrera) {
                $q->where('carrera', $carrera);
            });
        }

        if ($periodo && $periodo !== '') {
            $query->where('periodo', $periodo);
        }

        $asignaciones = $query->get();

        // 3. Procesar datos para el reporte
        $reporte = $asignaciones->map(function($asig) {
            
            $plan = Planificacion::with('detalles.habilidad.catalogo') 
                ->where('docente_id', $asig->docente_id)
                ->where('asignatura_id', $asig->asignatura_id)
                ->where('periodo_academico', $asig->periodo)
                ->latest()
                ->first();

            $estado = 'Sin Planificar';
            $progreso = 0;
            $habilidadTexto = '---'; 

            if ($plan) {
               
                $nombres = $plan->detalles->map(function($detalle) {
                    return ($detalle->habilidad && $detalle->habilidad->catalogo) 
                        ? $detalle->habilidad->catalogo->nombre 
                        : null;
                })->filter()->unique()->implode(', ');

                $habilidadTexto = $nombres ?: 'Sin Habilidades Asignadas';
                $estado = 'Planificado';

                $totalEstudiantes = \App\Models\Estudiante::where('carrera', $asig->asignatura->carrera)
                    ->where('ciclo_actual', $asig->asignatura->ciclo)
                    ->count();

                $evaluados = Evaluacion::where('planificacion_id', $plan->id)->count();

                if ($totalEstudiantes > 0 && $evaluados > 0) {
                    $progreso = round(($evaluados / $totalEstudiantes) * 100);
                    if($progreso > 100) $progreso = 100; 
                    $estado = ($progreso >= 100) ? 'Completado' : 'En Proceso';
                }
            }
            
            $nombreDocente = $asig->docente 
                ? ($asig->docente->apellidos . ' ' . $asig->docente->nombres) 
                : 'Docente no asignado';
            
            return [
                'id' => $asig->id,
                'carrera' => $asig->asignatura->carrera,
                'ciclo' => $asig->asignatura->ciclo,
                'asignatura' => $asig->asignatura->nombre,
                'docente' => $nombreDocente,
                'habilidad' => $habilidadTexto, // Ahora sí tendrá el nombre correcto
                'estado' => $estado,
                'progreso' => $progreso,
                'periodo' => $asig->periodo
            ];
        });

        return response()->json($reporte);
    }
}