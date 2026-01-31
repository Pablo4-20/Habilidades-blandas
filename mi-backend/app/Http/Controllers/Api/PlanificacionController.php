<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Planificacion;
use App\Models\HabilidadBlanda; 
use App\Models\Asignacion; 
use App\Models\Evaluacion;
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

            // 3. RECUPERAR AMBOS PARCIALES
            $planP1 = Planificacion::with('detalles')
                ->where('asignatura_id', $asignatura_id)
                ->where('docente_id', $user->id)
                ->where('periodo_academico', $asignacion->periodo)
                ->where('parcial', '1')
                ->first();

            $planP2 = Planificacion::with('detalles')
                ->where('asignatura_id', $asignatura_id)
                ->where('docente_id', $user->id)
                ->where('periodo_academico', $asignacion->periodo)
                ->where('parcial', '2')
                ->first();

            // CONVERTIR A ENTEROS PARA COMPARACIÓN EXACTA
            $idsP1 = $planP1 ? $planP1->detalles->pluck('habilidad_blanda_id')->map(fn($id) => (int)$id)->sort()->values()->toArray() : [];
            $idsP2 = $planP2 ? $planP2->detalles->pluck('habilidad_blanda_id')->map(fn($id) => (int)$id)->sort()->values()->toArray() : [];

            // 4. VALIDACIONES DE INTEGRIDAD
            
            // A. Sincronización: Deben ser idénticos
            $sincronizados = ($idsP1 === $idsP2);

            // B. Contenido Completo (Texto real en actividades)
            $validarTexto = function($plan) {
                if (!$plan) return false;
                return $plan->detalles->every(function ($d) {
                    $acts = array_filter(explode("\n", $d->actividades), fn($v) => trim($v) !== '');
                    $res = trim($d->resultado_aprendizaje ?? '');
                    return count($acts) > 0 && strlen($res) > 3;
                });
            };

            $p1Completo = $validarTexto($planP1);
            $p2Completo = $validarTexto($planP2);

            // CONDICIÓN MAESTRA PARA PERMITIR CALIFICAR
            $planificacionCompleta = !empty($idsP1) && $sincronizados && $p1Completo && $p2Completo;

            // 5. Preparar respuesta
            $planDocente = ($parcialSolicitado == '2') ? $planP2 : $planP1; 
            if (!$parcialSolicitado) $planDocente = $planP2 ?? $planP1;

            $datosRespuesta = [
                'tiene_asignacion' => true,
                'periodo_detectado' => $asignacion->periodo,
                'habilidades' => $catalogoHabilidades, 
                'es_edicion' => false,
                'parcial_guardado' => null,
                'habilidades_seleccionadas' => [], 
                'actividades_guardadas' => [],
                'resultados_guardados' => [], 
                'habilidades_p1' => $idsP1, 
                
                // BANDERAS PARA EL FRONTEND
                'debug_sincronizados' => $sincronizados,
                'debug_p1_completo' => $p1Completo,
                'debug_p2_completo' => $p2Completo,
                'planificacion_completa' => $planificacionCompleta
            ];

            if ($planDocente) {
                $datosRespuesta['es_edicion'] = true;
                $datosRespuesta['parcial_guardado'] = $planDocente->parcial;
                
                foreach ($planDocente->detalles as $detalle) {
                    $datosRespuesta['habilidades_seleccionadas'][] = $detalle->habilidad_blanda_id;
                    $actividadesRaw = explode("\n", $detalle->actividades);
                    $datosRespuesta['actividades_guardadas'][$detalle->habilidad_blanda_id] = array_values(array_filter($actividadesRaw, fn($v) => trim($v) !== ''));
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
            // 1. Obtener los IDs de las habilidades que ESTÁN quedando
            $nuevosIdsHabilidades = collect($request->detalles)
                                    ->pluck('habilidad_blanda_id')
                                    ->filter()
                                    ->toArray();

            // 2. Guardar o Actualizar el Plan del Parcial ACTUAL
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

            // Borrar evaluaciones de habilidades que ya no existen en este parcial
            Evaluacion::where('planificacion_id', $planificacion->id)
                ->whereNotIn('habilidad_blanda_id', $nuevosIdsHabilidades)
                ->delete();

            // Reescribir los detalles del plan actual
            $planificacion->detalles()->delete();

            foreach ($request->detalles as $detalle) {
                if (empty($detalle['habilidad_blanda_id'])) continue;
                $planificacion->detalles()->create([
                    'habilidad_blanda_id' => $detalle['habilidad_blanda_id'],
                    'actividades' => is_array($detalle['actividades']) ? implode("\n", $detalle['actividades']) : $detalle['actividades'],
                    'resultado_aprendizaje' => $detalle['resultado_aprendizaje'] ?? null 
                ]);
            }

            // ---------------------------------------------------------
            // 3. SINCRONIZACIÓN AUTOMÁTICA CON EL OTRO PARCIAL
            // ---------------------------------------------------------
            // Aquí está la magia: Si modificas P1, limpiamos P2 (y viceversa)
            
            $otroParcial = ($request->parcial == '1') ? '2' : '1';
            
            $planOtro = Planificacion::where('asignatura_id', $request->asignatura_id)
                ->where('periodo_academico', $request->periodo_academico)
                ->where('parcial', $otroParcial)
                ->first();

            if ($planOtro) {
                // Borrar del OTRO parcial las habilidades que NO están en la nueva lista
                $planOtro->detalles()
                    ->whereNotIn('habilidad_blanda_id', $nuevosIdsHabilidades)
                    ->delete();
                
                // Borrar evaluaciones del OTRO parcial para esas habilidades eliminadas
                Evaluacion::where('planificacion_id', $planOtro->id)
                    ->whereNotIn('habilidad_blanda_id', $nuevosIdsHabilidades)
                    ->delete();
            }
            // ---------------------------------------------------------

            return response()->json(['message' => 'Planificación actualizada y sincronizada correctamente.'], 200);
        });
    }
}