<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Planificacion;
use App\Models\HabilidadBlanda; // Asegúrate de que el modelo apunte a 'habilidades_blandas'
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

            // 1. Validar asignación
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

            // 2. Traer Catálogo Global (CORRECCIÓN: Asegurar nombre de tabla correcto en Modelo)
            $catalogoHabilidades = HabilidadBlanda::select('id', 'nombre', 'descripcion')->get();

            // 3. Buscar planificación existente
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

            // 4. Respuesta Estructurada
            $datosRespuesta = [
                'tiene_asignacion' => true,
                'periodo_detectado' => $asignacion->periodo,
                'habilidades' => $catalogoHabilidades, // <--- CORREGIDO: Ahora se llama 'habilidades'
                'es_edicion' => false,
                'parcial_guardado' => null,
                'habilidades_seleccionadas' => [], 
                'actividades_guardadas' => []      
            ];

            if ($planDocente) {
                $datosRespuesta['es_edicion'] = true;
                $datosRespuesta['parcial_guardado'] = $planDocente->parcial;
                
                // Reconstruir datos desde DETALLES
                foreach ($planDocente->detalles as $detalle) {
                    $datosRespuesta['habilidades_seleccionadas'][] = $detalle->habilidad_blanda_id;
                    
                    // Convertir salto de línea en array para el frontend si es necesario
                    // O mantener string si tu frontend usa split
                    $datosRespuesta['actividades_guardadas'][$detalle->habilidad_blanda_id] = explode("\n", $detalle->actividades);
                }
            }

            return response()->json($datosRespuesta);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        $request->validate([
            'asignatura_id' => 'required',
            'docente_id' => 'required',
            'parcial' => 'required',
            'periodo_academico' => 'required',
            'detalles' => 'required|array', 
        ]);

        return DB::transaction(function () use ($request) {
            // 1. Guardar Cabecera
            $planificacion = Planificacion::updateOrCreate(
                [
                    'asignatura_id' => $request->asignatura_id,
                    'parcial' => $request->parcial,
                    'periodo_academico' => $request->periodo_academico
                ],
                [
                    'docente_id' => $request->docente_id,
                    'observaciones' => $request->observaciones ?? null
                ]
            );

            // 2. Guardar Detalles (Borrar previos para evitar duplicados)
            $planificacion->detalles()->delete();

            foreach ($request->detalles as $detalle) {
                if (empty($detalle['habilidad_blanda_id'])) continue;

                $planificacion->detalles()->create([
                    'habilidad_blanda_id' => $detalle['habilidad_blanda_id'],
                    // Si viene como array, lo unimos. Si es string, lo dejamos.
                    'actividades' => is_array($detalle['actividades']) 
                                     ? implode("\n", $detalle['actividades']) 
                                     : $detalle['actividades']
                ]);
            }

            return response()->json(['message' => 'Planificación guardada exitosamente'], 200);
        });
    }
}