<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB; 
use App\Models\PeriodoAcademico; // <--- IMPORTANTE

class CoordinadorController extends Controller
{
    public function filtrosReporte()
    {
        try {
            $carreras = DB::table('carreras')->orderBy('nombre')->pluck('nombre');
            
            // CAMBIO: Obtener periodos desde la tabla oficial, ordenados por fecha
            // Esto evita que salgan periodos mal escritos que pudieran existir en asignaciones antiguas
            $periodos = PeriodoAcademico::orderBy('id', 'desc')->pluck('nombre');

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

            // 1. Si no viene periodo, tomamos el activo oficial
            if (empty($periodo) || $periodo === 'undefined' || $periodo === 'null') {
                $periodoActivo = PeriodoAcademico::where('activo', true)->first();
                $periodo = $periodoActivo ? $periodoActivo->nombre : null;
            }

            if (!$periodo) return response()->json([]);

            // 2. CONSULTA (Se mantiene igual porque Asignaciones usa el nombre del periodo)
            // Esta lógica es correcta porque la asignación de materias (Docente-Materia)
            // es independiente de la matrícula del estudiante.
            $query = DB::table('asignaciones')
                ->join('users', 'asignaciones.docente_id', '=', 'users.id')
                ->join('asignaturas', 'asignaciones.asignatura_id', '=', 'asignaturas.id')
                ->join('carreras', 'asignaturas.carrera_id', '=', 'carreras.id')
                ->join('ciclos', 'asignaturas.ciclo_id', '=', 'ciclos.id')
                
                ->leftJoin('planificaciones', function($join) {
                    $join->on('asignaciones.asignatura_id', '=', 'planificaciones.asignatura_id')
                         ->on('asignaciones.docente_id', '=', 'planificaciones.docente_id')
                         ->on('asignaciones.periodo', '=', 'planificaciones.periodo_academico');
                })
                ->select(
                    'asignaturas.nombre as asignatura',
                    'users.nombres',
                    'users.apellidos',
                    'carreras.nombre as carrera',
                    'ciclos.nombre as ciclo',
                    'planificaciones.id as plan_id'
                )
                ->where('asignaciones.periodo', $periodo);

            if ($carrera && $carrera !== 'Todas') {
                $query->where('carreras.nombre', $carrera);
            }

            $data = $query->get();

            // PROCESAMIENTO DE AVANCE (Lógica de semáforos)
            $reporte = $data->map(function($item) {
                $estado = 'Sin Planificar';
                $avance = 0;

                if ($item->plan_id) {
                    $estado = 'En Proceso';
                    $avance = 50;

                    // Verificar si tiene evaluaciones (notas subidas)
                    $tieneEvaluacion = DB::table('evaluaciones')
                        ->where('planificacion_id', $item->plan_id)
                        ->exists();

                    if ($tieneEvaluacion) {
                        $estado = 'Completado';
                        $avance = 100;
                    }
                }

                return [
                    'asignatura' => $item->asignatura,
                    'docente'    => $item->apellidos . ' ' . $item->nombres,
                    'carrera'    => $item->carrera,
                    'ciclo'      => $item->ciclo,
                    'estado'     => $estado,
                    'avance'     => $avance
                ];
            });

            return response()->json($reporte);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}