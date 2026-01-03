<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Planificacion;
use App\Models\HabilidadBlanda;
use App\Models\Asignacion; 
use Illuminate\Support\Facades\DB;

class PlanificacionController extends Controller
{
   
    public function verificar(Request $request, $asignatura_id)
    {
        try {
            $user = $request->user();
            $periodo = $request->query('periodo'); 
            $parcialSolicitado = $request->query('parcial'); 

            // 1. Validar asignación docente (Filtro por periodo si se envía)
            $queryAsignacion = Asignacion::where('asignatura_id', $asignatura_id)
                ->where('docente_id', $user->id);

            if ($periodo) {
                $queryAsignacion->where('periodo', $periodo);
            }

            $asignacion = $queryAsignacion->first();

            if (!$asignacion) {
                return response()->json([
                    'tiene_asignacion' => false, 
                    'message' => 'No tienes asignada esta materia en el periodo seleccionado.'
                ]);
            }

            // 2. Traer Catálogo Global de Habilidades Blandas
            $catalogoHabilidades = HabilidadBlanda::select('id', 'nombre', 'descripcion')->get();

            // 3. Buscar si YA existe planificación previa (Modo Edición)
            $queryPlan = Planificacion::with('detalles')
                ->where('asignatura_id', $asignatura_id)
                ->where('docente_id', $user->id)
                ->where('periodo_academico', $asignacion->periodo);

            if ($parcialSolicitado) {
                $queryPlan->where('parcial', $parcialSolicitado);
            } else {
                $queryPlan->latest();
            }

            $planDocente = $queryPlan->first();

            // 4. Preparar respuesta para el Frontend
            $datosRespuesta = [
                'tiene_asignacion' => true,
                'periodo_detectado' => $asignacion->periodo,
                'catalogo_habilidades' => $catalogoHabilidades, 
                'es_edicion' => false,
                'parcial_guardado' => null,
                'habilidades_seleccionadas' => [], 
                'actividades_guardadas' => []      
            ];

            if ($planDocente) {
                $datosRespuesta['es_edicion'] = true;
                $datosRespuesta['parcial_guardado'] = $planDocente->parcial;
                
                // Reconstruir lo que guardó el docente
                foreach ($planDocente->detalles as $detalle) {
                    // Guardamos el ID para que el checkbox aparezca marcado
                    $datosRespuesta['habilidades_seleccionadas'][] = $detalle->habilidad_blanda_id;
                    
                    // Guardamos la actividad asociada
                    $datosRespuesta['actividades_guardadas'][$detalle->habilidad_blanda_id] = $detalle->actividades;
                }
            }

            return response()->json($datosRespuesta);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    
    public function store(Request $request)
    {
        // 1. Validación
        $request->validate([
            'asignatura_id' => 'required',
            'docente_id' => 'required',
            'parcial' => 'required',
            'periodo_academico' => 'required',
            'detalles' => 'required|array', 
        ]);

        return DB::transaction(function () use ($request) {
            // 2. Guardar o Actualizar la Cabecera (Planificación)
            // Clave única: Asignatura + Parcial + Periodo
            $planificacion = Planificacion::updateOrCreate(
                [
                    'asignatura_id' => $request->asignatura_id,
                    'parcial' => $request->parcial,
                    'periodo_academico' => $request->periodo_academico
                ],
                [
                    'docente_id' => $request->docente_id
                ]
            );

            // 3. Guardar los Detalles
            $planificacion->detalles()->delete();

            foreach ($request->detalles as $detalle) {
                // Si no viene ID de habilidad, saltamos
                if (empty($detalle['habilidad_blanda_id'])) continue;

                $planificacion->detalles()->create([
                    'habilidad_blanda_id' => $detalle['habilidad_blanda_id'],
                    
                    'actividades' => is_array($detalle['actividades']) 
                                     ? implode("\n", $detalle['actividades']) 
                                     : $detalle['actividades']
                ]);
            }

            return response()->json(['message' => 'Planificación guardada exitosamente'], 200);
        });
    }
}