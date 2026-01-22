<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB; 

class CoordinadorController extends Controller
{
    public function filtrosReporte()
    {
        try {
            $carreras = DB::table('carreras')->orderBy('nombre')->pluck('nombre');
            
            $periodos = DB::table('asignaciones')
                        ->select('periodo')
                        ->distinct()
                        ->orderBy('periodo', 'desc')
                        ->pluck('periodo');

            return response()->json([
                'carreras' => $carreras,
                'periodos' => $periodos
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error filtros: ' . $e->getMessage()], 500);
        }
    }

    public function reporteGeneral(Request $request)
    {
        try {
            $carrera = $request->query('carrera'); 
            $periodo = $request->query('periodo');

            // 1. Si no viene periodo, intentamos tomar el activo
            if (empty($periodo) || $periodo === 'undefined' || $periodo === 'null') {
                $periodoActivo = DB::table('periodos_academicos')->where('activo', true)->first();
                $periodo = $periodoActivo ? $periodoActivo->nombre : null;
            }

            if (!$periodo) return response()->json([]);

            // 2. CONSULTA SQL
            $query = DB::table('asignaciones')
                ->join('users', 'asignaciones.docente_id', '=', 'users.id')
                ->join('asignaturas', 'asignaciones.asignatura_id', '=', 'asignaturas.id')
                ->join('carreras', 'asignaturas.carrera_id', '=', 'carreras.id')
                ->join('ciclos', 'asignaturas.ciclo_id', '=', 'ciclos.id')
                
                // Unimos con Planificaciones
                ->leftJoin('planificaciones', function($join) {
                    $join->on('asignaciones.asignatura_id', '=', 'planificaciones.asignatura_id')
                         ->on('asignaciones.docente_id', '=', 'planificaciones.docente_id')
                         ->on('asignaciones.periodo', '=', 'planificaciones.periodo_academico');
                })
                
                // Unimos con Detalle
                ->leftJoin('detalle_planificaciones', 'planificaciones.id', '=', 'detalle_planificaciones.planificacion_id')
                
                // Unimos con Habilidades
                ->leftJoin('habilidades_blandas', 'detalle_planificaciones.habilidad_blanda_id', '=', 'habilidades_blandas.id')
                
                ->select(
                    'asignaciones.id as asignacion_id',
                    'carreras.nombre as carrera',
                    'asignaturas.nombre as asignatura',
                    'ciclos.nombre as ciclo',
                    'users.nombres', 
                    'users.apellidos',
                    'planificaciones.id as planificacion_id',
                    'habilidades_blandas.nombre as habilidad'
                )
                ->where('asignaciones.periodo', $periodo);

            if ($carrera && $carrera !== 'Todas') {
                $query->where('carreras.nombre', $carrera);
            }

            $datos = $query->get();

            // 3. PROCESAMIENTO
            $reporte = $datos->map(function($item) {
                
                $tienePlan = !is_null($item->planificacion_id);
                $tieneHabilidad = !is_null($item->habilidad);
                $habilidadTexto = $tieneHabilidad ? $item->habilidad : 'No definida';

                // --- LÓGICA CORREGIDA PARA DETECTAR 100% ---
                $tieneEvaluaciones = false;

                if ($tienePlan) {
                    // Verificamos si existen evaluaciones para este plan
                    $tieneEvaluaciones = DB::table('evaluaciones')
                        ->where('planificacion_id', $item->planificacion_id)
                        ->exists();
                }

                // Determinamos Estado y Progreso
                if ($tieneEvaluaciones) {
                    $estado = 'Completado';
                    $progreso = 100;
                } elseif ($tienePlan && $tieneHabilidad) {
                    $estado = 'Planificado'; // Listo para calificar, pero aún no califica
                    $progreso = 50; 
                } elseif ($tienePlan && !$tieneHabilidad) {
                    $estado = 'En Proceso'; // Creó el plan pero no añadió detalles
                    $progreso = 25;
                    $habilidadTexto = 'Sin seleccionar';
                } else {
                    $estado = 'Sin Planificar';
                    $progreso = 0;
                }

                return [
                    'id'         => $item->asignacion_id,
                    'carrera'    => $item->carrera,
                    'asignatura' => $item->asignatura,
                    'ciclo'      => $item->ciclo,
                    'docente'    => $item->nombres . ' ' . $item->apellidos,
                    'habilidad'  => $habilidadTexto,
                    'estado'     => $estado,
                    'progreso'   => $progreso
                ];
            });

            // Eliminar duplicados (por si una materia tiene varias habilidades, muestra la primera procesada o todas si son distintas)
            // Aquí agrupamos para que no salgan filas repetidas si no es necesario
            $reporteUnico = $reporte->unique(function ($item) {
                return $item['id'] . $item['habilidad'];
            })->values();

            return response()->json($reporteUnico);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error en reporte: ' . $e->getMessage()], 500);
        }
    }
}