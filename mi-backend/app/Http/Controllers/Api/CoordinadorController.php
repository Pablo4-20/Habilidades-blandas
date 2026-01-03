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
            // Consulta directa a la tabla 'asignaturas'
            $carreras = DB::table('asignaturas')
                        ->select('carrera')
                        ->distinct()
                        ->whereNotNull('carrera')
                        ->pluck('carrera');
            
            // Consulta directa a la tabla 'planificaciones'
            $periodos = DB::table('planificaciones')
                        ->select('periodo_academico')
                        ->distinct()
                        ->orderBy('periodo_academico', 'desc')
                        ->pluck('periodo_academico');

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

            // 1. Manejo de periodo vacío o inválido
            if (empty($periodo) || $periodo === 'undefined' || $periodo === ':1') {
                $ultimo = DB::table('planificaciones')->latest('created_at')->first();
                $periodo = $ultimo ? $ultimo->periodo_academico : null;
            }

            if (!$periodo) {
                return response()->json([
                    'total_evaluados' => 0,
                    'periodo_consultado' => 'Sin datos',
                    'conteos' => [1=>0, 2=>0, 3=>0, 4=>0, 5=>0],
                    'porcentajes' => [1=>0, 2=>0, 3=>0, 4=>0, 5=>0]
                ]);
            }

            // 2. CONSULTA DIRECTA (JOIN) - Ignora los Modelos y sus relaciones rotas
            $query = DB::table('evaluaciones')
                ->join('planificaciones', 'evaluaciones.planificacion_id', '=', 'planificaciones.id')
                ->join('asignaturas', 'planificaciones.asignatura_id', '=', 'asignaturas.id');

            $query->where('planificaciones.periodo_academico', $periodo);

            if ($carrera && $carrera !== 'Todas') {
                $query->where('asignaturas.carrera', $carrera);
            }

            // 3. Ejecutar consulta
            $niveles = $query->pluck('evaluaciones.nivel');
            
            // 4. Cálculos
            $total = $niveles->count();
            $counts = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];

            foreach ($niveles as $nivel) {
                $n = intval($nivel);
                if (isset($counts[$n])) $counts[$n]++;
            }

            $percentages = [];
            foreach ($counts as $n => $cantidad) {
                $percentages[$n] = $total > 0 ? round(($cantidad / $total) * 100, 1) : 0;
            }

            return response()->json([
                'total_evaluados' => $total,
                'periodo_consultado' => $periodo,
                'conteos' => $counts,
                'porcentajes' => $percentages
            ]);

        } catch (\Exception $e) {
          
            return response()->json(['message' => 'Error CRÍTICO: ' . $e->getMessage()], 500);
        }
    }
}