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

            // 2. Traer Catálogo Global
            $catalogoHabilidades = HabilidadBlanda::with('actividades')
                ->select('id', 'nombre', 'descripcion')
                ->orderBy('nombre', 'asc')
                ->get();

            // 3. Buscar planificación ACTUAL (la solicitada)
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

            // --- SI ES PARCIAL 2, TRAER TAMBIÉN LOS IDS DEL PARCIAL 1 ---
            $idsParcial1 = [];
            if ($parcialSolicitado == '2') {
                $planP1 = Planificacion::with('detalles')
                    ->where('asignatura_id', $asignatura_id)
                    ->where('docente_id', $user->id)
                    ->where('periodo_academico', $asignacion->periodo)
                    ->where('parcial', '1')
                    ->first();
                
                if ($planP1) {
                    $idsParcial1 = $planP1->detalles->pluck('habilidad_blanda_id')->toArray();
                }
            }
            // -----------------------------------------------------------

            // 4. Respuesta Estructurada
            $datosRespuesta = [
                'tiene_asignacion' => true,
                'periodo_detectado' => $asignacion->periodo,
                'habilidades' => $catalogoHabilidades, 
                'es_edicion' => false,
                'parcial_guardado' => null,
                'habilidades_seleccionadas' => [], 
                'actividades_guardadas' => [],
                'resultados_guardados' => [], // <--- NUEVO ARRAY PARA EL FRONTEND
                'habilidades_p1' => $idsParcial1 
            ];

            if ($planDocente) {
                $datosRespuesta['es_edicion'] = true;
                $datosRespuesta['parcial_guardado'] = $planDocente->parcial;
                
                foreach ($planDocente->detalles as $detalle) {
                    $datosRespuesta['habilidades_seleccionadas'][] = $detalle->habilidad_blanda_id;
                    $datosRespuesta['actividades_guardadas'][$detalle->habilidad_blanda_id] = explode("\n", $detalle->actividades);
                    
                    // AGREGAMOS EL RESULTADO DE APRENDIZAJE A LA RESPUESTA
                    $datosRespuesta['resultados_guardados'][$detalle->habilidad_blanda_id] = $detalle->resultado_aprendizaje;
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

            // Borramos los detalles anteriores para reescribirlos
            $planificacion->detalles()->delete();

            foreach ($request->detalles as $detalle) {
                if (empty($detalle['habilidad_blanda_id'])) continue;

                $planificacion->detalles()->create([
                    'habilidad_blanda_id' => $detalle['habilidad_blanda_id'],
                    // Convertir array de actividades a string
                    'actividades' => is_array($detalle['actividades']) 
                                     ? implode("\n", $detalle['actividades']) 
                                     : $detalle['actividades'],
                    
                    // GUARDAR EL RESULTADO DE APRENDIZAJE
                    'resultado_aprendizaje' => $detalle['resultado_aprendizaje'] ?? null 
                ]);
            }

            return response()->json(['message' => 'Planificación guardada exitosamente'], 200);
        });
    }
}