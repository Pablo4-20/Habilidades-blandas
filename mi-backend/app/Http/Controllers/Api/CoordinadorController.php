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
            // Obtener carreras desde la tabla catálogo
            $carreras = DB::table('carreras')->orderBy('nombre')->pluck('nombre');
            
            // Obtener periodos reales de la tabla de asignaciones
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

            // Si aún así no hay periodo, retornamos vacío
            if (!$periodo) return response()->json([]);

            // 2. CONSULTA SQL CORREGIDA
            // Base: Tabla Asignaciones (Lo que el coordinador asignó)
            $query = DB::table('asignaciones')
                ->join('users', 'asignaciones.docente_id', '=', 'users.id')
                ->join('asignaturas', 'asignaciones.asignatura_id', '=', 'asignaturas.id')
                ->join('carreras', 'asignaturas.carrera_id', '=', 'carreras.id')
                ->join('ciclos', 'asignaturas.ciclo_id', '=', 'ciclos.id')
                
                // Unimos con Planificaciones (Puede existir o no -> Left Join)
                ->leftJoin('planificaciones', function($join) {
                    $join->on('asignaciones.asignatura_id', '=', 'planificaciones.asignatura_id')
                         ->on('asignaciones.docente_id', '=', 'planificaciones.docente_id')
                         ->on('asignaciones.periodo', '=', 'planificaciones.periodo_academico');
                })
                
                // Unimos con Detalle para sacar la habilidad (Puede existir o no)
                ->leftJoin('detalle_planificaciones', 'planificaciones.id', '=', 'detalle_planificaciones.planificacion_id')
                
                // Unimos con el catálogo de Habilidades (Usando el nombre correcto de la tabla)
                ->leftJoin('habilidades_blandas', 'detalle_planificaciones.habilidad_blanda_id', '=', 'habilidades_blandas.id')
                
                ->select(
                    'asignaciones.id as asignacion_id',
                    'carreras.nombre as carrera',
                    'asignaturas.nombre as asignatura',
                    'ciclos.nombre as ciclo',
                    'users.nombres', 
                    'users.apellidos',
                    'planificaciones.id as planificacion_id',
                    // Usamos GROUP_CONCAT por si una materia tiene varias habilidades, o tomamos una
                    'habilidades_blandas.nombre as habilidad'
                )
                ->where('asignaciones.periodo', $periodo);

            // Filtro de Carrera
            if ($carrera && $carrera !== 'Todas') {
                $query->where('carreras.nombre', $carrera);
            }

            // Obtenemos los datos
            $datos = $query->get();

            // 3. PROCESAMIENTO (Mapeo de datos para el Frontend)
            $reporte = $datos->map(function($item) {
                // Cálculo del Estado
                $tienePlan = !is_null($item->planificacion_id);
                $tieneHabilidad = !is_null($item->habilidad);

                if (!$tienePlan) {
                    $estado = 'Sin Planificar';
                    $progreso = 0;
                    $habilidadTexto = 'No definida';
                } elseif ($tienePlan && !$tieneHabilidad) {
                    $estado = 'En Proceso'; // Tiene plan pero no ha guardado el detalle
                    $progreso = 25;
                    $habilidadTexto = 'Sin seleccionar';
                } else {
                    $estado = 'Planificado'; // Ya seleccionó habilidad
                    $progreso = 50; 
                    $habilidadTexto = $item->habilidad;
                    
                    // Opcional: Podrías consultar la tabla 'evaluaciones' aquí para ver si ya evaluó
                    // y poner progreso en 100%. Por ahora lo dejamos en 50% "Planificado".
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

            // Eliminar duplicados si la consulta trajo filas dobles por múltiples detalles
            // (Si un docente selecciona 2 habilidades para 1 materia, aparecerá 2 veces.
            //  Si quieres que salga solo una vez, usamos unique)
            $reporteUnico = $reporte->unique(function ($item) {
                return $item['id'] . $item['habilidad'];
            })->values();

            return response()->json($reporteUnico);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error en reporte: ' . $e->getMessage()], 500);
        }
    }
}