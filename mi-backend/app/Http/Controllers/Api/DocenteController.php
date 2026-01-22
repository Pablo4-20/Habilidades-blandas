<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Asignacion;
use App\Models\Estudiante;
use App\Models\Planificacion;
use App\Models\Evaluacion;
use App\Models\Asignatura;
use Illuminate\Support\Facades\DB;

class DocenteController extends Controller
{
    // 1. MIS ASIGNATURAS
    public function misAsignaturas(Request $request)
    {
        $user = $request->user();
        
        // CORRECCIÓN 1: Cargamos las relaciones 'carrera' y 'ciclo' para acceder a sus nombres
        $asignaciones = Asignacion::with(['asignatura.carrera', 'asignatura.ciclo'])
            ->where('docente_id', $user->id)
            ->get();

        return $asignaciones->map(function ($asignacion) use ($user) {
            if (!$asignacion->asignatura) return null; 

            $planificacion_p1 = Planificacion::where('asignatura_id', $asignacion->asignatura->id)
                                    ->where('docente_id', $user->id)
                                    ->where('periodo_academico', $asignacion->periodo)
                                    ->where('parcial', '1')
                                    ->exists();

            $planificacion_p2 = Planificacion::where('asignatura_id', $asignacion->asignatura->id)
                                    ->where('docente_id', $user->id)
                                    ->where('periodo_academico', $asignacion->periodo)
                                    ->where('parcial', '2')
                                    ->exists();
            
            return [
                'id' => $asignacion->asignatura->id,
                'nombre' => $asignacion->asignatura->nombre,
                // CORRECCIÓN 2: Accedemos a ->nombre. Si es nulo, ponemos texto por defecto.
                'carrera' => $asignacion->asignatura->carrera->nombre ?? 'Sin Carrera', 
                'ciclo' => $asignacion->asignatura->ciclo->nombre ?? 'Sin Ciclo',     
                'paralelo' => $asignacion->paralelo,
                'asignacion_id' => $asignacion->id,
                'periodo' => $asignacion->periodo,
                'planificacion_p1' => $planificacion_p1,
                'planificacion_p2' => $planificacion_p2
            ];
        })->filter()->values();
    }

    // ... (Mantén el resto de funciones: misHabilidades, verEstudiantes, rubrica, etc. IGUALES) ...
    // Solo copia el método misAsignaturas de arriba, el resto no ha cambiado pero asegúrate de tener los métodos
    // obtenerPlanificacion y guardarPlanificacion que te di en la respuesta anterior.

    // 2. MIS HABILIDADES 
    public function misHabilidades($asignatura_id, Request $request)
    {
        $user = $request->user();
        
        $plan = Planificacion::with('detalles.habilidad') 
            ->where('docente_id', $user->id)
            ->where('asignatura_id', $asignatura_id)
            ->latest()
            ->first();

        if (!$plan) return [];

        return $plan->detalles->map(function ($detalle) use ($plan) {
            return [
                'planificacion_id' => $plan->id,
                'habilidad_id' => $detalle->habilidad->id,
                'habilidad_nombre' => $detalle->habilidad->nombre,
                'periodo' => $plan->periodo_academico,
                'parcial' => $plan->parcial 
            ];
        });
    }
    
    // 3. VER ESTUDIANTES
    public function verEstudiantes($asignatura_id, Request $request)
    {
        $user = $request->user();
        $esMia = Asignacion::where('docente_id', $user->id)->where('asignatura_id', $asignatura_id)->exists();

        if (!$esMia) return response()->json([], 403);

        $asignatura = Asignatura::with(['carrera', 'ciclo'])->findOrFail($asignatura_id);
        
        // Ajuste para usar nombres si son objetos
        $carreraNombre = $asignatura->carrera->nombre ?? $asignatura->carrera;
        $cicloNombre = $asignatura->ciclo->nombre ?? $asignatura->ciclo;

        $estudiantes = Estudiante::where('carrera', $carreraNombre)
            ->where('ciclo_actual', $cicloNombre)
            ->orderBy('apellidos')
            ->get();

        return response()->json($estudiantes);
    }

    // 4. OBTENER RÚBRICA
    public function rubrica(Request $request)
    {
        $request->validate([
            'asignatura_id' => 'required',
            'parcial' => 'required|in:1,2',
            'periodo' => 'required'
        ]);

        $user = $request->user();

        // A. Obtener Asignatura
        $asignatura = Asignatura::with(['carrera', 'ciclo'])->findOrFail($request->asignatura_id);
        $carreraNombre = $asignatura->carrera->nombre ?? $asignatura->carrera;
        $cicloNombre = $asignatura->ciclo->nombre ?? $asignatura->ciclo;

        // B. Estudiantes
        $estudiantes = Estudiante::where('carrera', $carreraNombre)
            ->where('ciclo_actual', $cicloNombre)
            ->orderBy('apellidos')
            ->get();

        // C. Actividades (del parcial actual)
        $actividades = [];
        if ($request->habilidad_blanda_id) {
            $plan = Planificacion::where('asignatura_id', $request->asignatura_id)
                ->where('docente_id', $user->id)
                ->where('periodo_academico', $request->periodo)
                ->where('parcial', $request->parcial)
                ->first();

            if ($plan) {
                $detalle = $plan->detalles()
                            ->where('habilidad_blanda_id', $request->habilidad_blanda_id)
                            ->first();

                if ($detalle && !empty($detalle->actividades)) {
                    $listaTexto = explode("\n", $detalle->actividades);
                    foreach($listaTexto as $txt) {
                        if(trim($txt) !== '') $actividades[] = ['descripcion' => trim($txt)];
                    }
                }
            }
        }

        // D. BUSCAR TODAS LAS NOTAS (P1 Y P2) PARA ESTA MATERIA Y HABILIDAD
        // Buscamos evaluaciones vinculadas a planificaciones de esta materia/docente/periodo
        $evaluaciones = Evaluacion::where('habilidad_blanda_id', $request->habilidad_blanda_id)
            ->whereHas('planificacion', function($q) use ($request, $user) {
                $q->where('asignatura_id', $request->asignatura_id)
                  ->where('docente_id', $user->id)
                  ->where('periodo_academico', $request->periodo);
            })
            ->get();

        // E. Mapear Estudiantes con sus notas (Actual y Referencia P1)
        $listaEstudiantes = $estudiantes->map(function ($est) use ($evaluaciones, $request) {
            
            // Nota del parcial que estamos editando
            $notaActual = $evaluaciones->where('estudiante_id', $est->id)
                                       ->where('parcial', $request->parcial)
                                       ->first();

            // Nota del parcial 1 (Solo sirve de referencia si estamos en el 2)
            $notaP1 = null;
            if ($request->parcial == '2') {
                $notaP1Obj = $evaluaciones->where('estudiante_id', $est->id)
                                          ->where('parcial', '1')
                                          ->first();
                $notaP1 = $notaP1Obj ? $notaP1Obj->nivel : null;
            }

            return [
                'estudiante_id' => $est->id,
                'nombres' => $est->apellidos . ' ' . $est->nombres,
                'nivel' => $notaActual ? $notaActual->nivel : null,
                'nivel_p1' => $notaP1 // Enviamos la referencia
            ];
        });

        return response()->json([
            'periodo' => $request->periodo,
            'actividades' => $actividades,
            'estudiantes' => $listaEstudiantes
        ]);
    }

    // 5. GUARDAR NOTAS
    public function guardarNotas(Request $request)
    {
        $request->validate([
            'asignatura_id' => 'required', 
            'parcial' => 'required|in:1,2',
            'habilidad_blanda_id' => 'required',
            'notas' => 'required|array',
            'periodo' => 'required' 
        ]);

        try {
            $user = $request->user();

            DB::transaction(function () use ($request, $user) {
                $plan = Planificacion::firstOrCreate(
                    [
                        'asignatura_id' => $request->asignatura_id,
                        'periodo_academico' => $request->periodo,
                        'parcial' => $request->parcial
                    ],
                    [ 'docente_id' => $user->id ]
                );

                foreach ($request->notas as $nota) {
                    if (!empty($nota['nivel'])) { 
                        Evaluacion::updateOrCreate(
                            [
                                'planificacion_id' => $plan->id,
                                'estudiante_id' => $nota['estudiante_id'],
                                'habilidad_blanda_id' => $request->habilidad_blanda_id, 
                                'parcial' => $request->parcial
                            ],
                            [ 'nivel' => $nota['nivel'] ]
                        );
                    }
                }
            });

            return response()->json(['message' => 'Notas guardadas correctamente'], 200);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al guardar: ' . $e->getMessage()], 500);
        }
    }

    // 6. PDF DATA
    public function pdfData(Request $request)
    {
        $request->validate([
            'asignatura_id' => 'required',
            'periodo' => 'required' 
        ]);
        
        try {
            $user = $request->user();

            // 1. Obtener Asignatura con sus relaciones (si existen)
            // Usamos 'with' solo si estamos seguros que las relaciones existen en el modelo
            $asignatura = Asignatura::with(['carrera', 'ciclo'])->findOrFail($request->asignatura_id);

            // 2. Buscar la Asignación Específica (Puede ser null si no coincide el periodo)
            $asignacion = Asignacion::where('asignatura_id', $request->asignatura_id)
                ->where('docente_id', $user->id)
                ->where('periodo', $request->periodo)
                ->first();

            // 3. Extracción segura de datos (Evita el error "property on null")
            // Si la relación carrera devuelve objeto, usamos nombre. Si no, string o default.
            $carreraNombre = $asignatura->carrera->nombre ?? ($asignatura->carrera ?? 'Carrera no definida');
            $cicloNombre = $asignatura->ciclo->nombre ?? ($asignatura->ciclo ?? 'Ciclo no definido');
            
            // AQUÍ OCURRÍA EL ERROR 500: Si $asignacion es null, $asignacion->paralelo fallaba.
            $paralelo = $asignacion ? $asignacion->paralelo : 'A'; 

            $info = [
                'facultad' => 'FACULTAD DE CIENCIAS ADMINISTRATIVAS, GESTIÓN EMPRESARIAL E INFORMÁTICA', 
                'carrera' => $carreraNombre,
                'docente' => $user->nombres . ' ' . $user->apellidos, 
                'periodo' => $request->periodo, 
                'asignatura' => $asignatura->nombre,
                'ciclo' => $cicloNombre . ' - ' . $paralelo
            ];

            // 4. Buscar Estudiantes
            $estudiantes = Estudiante::where('carrera', $carreraNombre)
                ->where('ciclo_actual', $cicloNombre)
                ->orderBy('apellidos')
                ->get();

            // 5. Buscar Planificaciones y Evaluaciones
            $planes = Planificacion::with(['detalles.habilidad'])
                ->where('asignatura_id', $request->asignatura_id)
                ->where('docente_id', $user->id)
                ->where('periodo_academico', $request->periodo)
                ->get(); 

            $reportes = [];

            foreach ($planes as $plan) {
                // Validación extra por si no hay detalles
                if (!$plan->detalles) continue;

                foreach ($plan->detalles as $detalle) {
                    $evaluaciones = Evaluacion::where('planificacion_id', $plan->id)
                        ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id)
                        ->get();

                    $stats = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];
                    foreach ($evaluaciones as $ev) {
                        if (isset($stats[$ev->nivel])) $stats[$ev->nivel]++;
                    }

                    $listaEstudiantes = $estudiantes->map(function($est) use ($evaluaciones) {
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
                    });

                    $reportes[] = [
                        'planificacion_id' => $plan->id . '_' . $detalle->habilidad_blanda_id, 
                        'real_plan_id' => $plan->id, 
                        'habilidad' => $detalle->habilidad ? $detalle->habilidad->nombre : 'Habilidad eliminada',
                        'parcial_asignado' => (string)$plan->parcial,
                        'conclusion' => $plan->observaciones ?? '',
                        'estadisticas' => $stats,
                        'detalle_p1' => $plan->parcial == '1' ? $listaEstudiantes : [],
                        'detalle_p2' => $plan->parcial == '2' ? $listaEstudiantes : []
                    ];
                }
            }

            return response()->json([
                'info' => $info,
                'reportes' => $reportes
            ]);

        } catch (\Exception $e) {
            // Esto enviará el mensaje exacto del error al frontend en lugar de solo "500"
            return response()->json(['message' => 'Error en servidor: ' . $e->getMessage()], 500);
        }
    }

    // 7. OBTENER PLANIFICACIÓN (Para la pantalla de Planificación)
    public function obtenerPlanificacion(Request $request)
    {
        $request->validate([ 'asignatura_id' => 'required', 'periodo' => 'required', 'parcial' => 'required' ]);
        $user = $request->user();

        $plan = Planificacion::with(['detalles.habilidad'])
            ->where('asignatura_id', $request->asignatura_id)
            ->where('docente_id', $user->id)
            ->where('periodo_academico', $request->periodo)
            ->where('parcial', $request->parcial)
            ->first();

        if (!$plan) {
            return response()->json([ 'existe' => false, 'observaciones' => '', 'detalles' => [] ]);
        }

        $detalles = $plan->detalles->map(function($det) {
            return [
                'habilidad_id' => $det->habilidad_blanda_id,
                'nombre' => $det->habilidad->nombre ?? 'Habilidad',
                'actividades' => $det->actividades
            ];
        });

        return response()->json([
            'existe' => true,
            'id' => $plan->id,
            'observaciones' => $plan->observaciones,
            'detalles' => $detalles
        ]);
    }

    // 8. GUARDAR PLANIFICACIÓN
    public function guardarPlanificacion(Request $request)
    {
        $request->validate([
            'asignatura_id' => 'required',
            'periodo' => 'required',
            'parcial' => 'required',
            'detalles' => 'required|array|min:1',
            'observaciones' => 'nullable|string'
        ]);

        $user = $request->user();

        try {
            DB::transaction(function () use ($request, $user) {
                $plan = Planificacion::updateOrCreate(
                    [
                        'asignatura_id' => $request->asignatura_id,
                        'docente_id' => $user->id,
                        'periodo_academico' => $request->periodo,
                        'parcial' => $request->parcial
                    ],
                    [ 'observaciones' => $request->observaciones, 'estado' => 'en_proceso' ]
                );

                $plan->detalles()->delete();

                foreach ($request->detalles as $detalle) {
                    $plan->detalles()->create([
                        'habilidad_blanda_id' => $detalle['habilidad_id'],
                        'actividades' => $detalle['actividades'] ?? ''
                    ]);
                }
            });

            return response()->json(['message' => 'Planificación guardada correctamente']);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al guardar: ' . $e->getMessage()], 500);
        }
        
    }

    // 9. GUARDAR CONCLUSIONES MASIVAS (NUEVO)
    public function guardarConclusionesMasivas(Request $request)
    {
        $request->validate([
            'conclusiones' => 'required|array' // Esperamos un array de objetos
        ]);

        try {
            DB::transaction(function () use ($request) {
                foreach ($request->conclusiones as $item) {
                    // El ID viene como "PLANID_HABILIDADID" (ej: 15_2), separamos el ID real
                    $parts = explode('_', $item['id']); 
                    $realPlanId = $parts[0]; 

                    // Buscamos y actualizamos (sin fallar si alguno no existe)
                    $plan = Planificacion::find($realPlanId);
                    if ($plan) {
                        $plan->observaciones = $item['texto'];
                        $plan->save();
                    }
                }
            });

            return response()->json(['message' => 'Todas las observaciones han sido guardadas.']);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al guardar: ' . $e->getMessage()], 500);
        }
    }
    // 10. DATOS PARA LA FICHA RESUMEN CONSOLIDADA (TODAS LAS MATERIAS)
    public function pdfDataGeneral(Request $request)
    {
        $request->validate(['periodo' => 'required']);
        $user = $request->user();

        try {
            // Buscar todas las asignaciones del docente en este periodo
            $asignaciones = Asignacion::with(['asignatura.carrera', 'asignatura.ciclo'])
                ->where('docente_id', $user->id)
                ->where('periodo', $request->periodo)
                ->get();

            if ($asignaciones->isEmpty()) return response()->json(['message' => 'Sin asignaciones'], 404);

            $filas = [];
            
            // Recorremos cada materia para sacar sus datos
            foreach ($asignaciones as $asignacion) {
                // Buscamos la planificación FINAL (preferiblemente Parcial 2, sino Parcial 1)
                $planes = Planificacion::with(['detalles.habilidad'])
                    ->where('asignatura_id', $asignacion->asignatura_id)
                    ->where('docente_id', $user->id)
                    ->where('periodo_academico', $request->periodo)
                    ->get();

                // Procesamos las habilidades
                foreach ($planes as $plan) {
                    if (!$plan->detalles) continue;

                    foreach ($plan->detalles as $detalle) {
                        // Solo procesamos si es el Parcial 2 (cierre) O si solo existe Parcial 1
                        // Esto evita duplicar filas. Priorizamos P2.
                        $esP2 = $plan->parcial == '2';
                        $yaExiste = isset($filas[$asignacion->id . '_' . $detalle->habilidad_blanda_id]);

                        if ($esP2 || !$yaExiste) {
                            // Calcular Estadísticas Rápidas
                            $evaluaciones = Evaluacion::where('planificacion_id', $plan->id)
                                ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id)
                                ->get();

                            $stats = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];
                            foreach ($evaluaciones as $ev) {
                                if (isset($stats[$ev->nivel])) $stats[$ev->nivel]++;
                            }

                            $filas[$asignacion->id . '_' . $detalle->habilidad_blanda_id] = [
                                'asignatura' => $asignacion->asignatura->nombre,
                                'ciclo' => ($asignacion->asignatura->ciclo->nombre ?? '') . ' "' . $asignacion->paralelo . '"',
                                'habilidad' => $detalle->habilidad->nombre ?? 'N/A',
                                'n1' => $stats[1], 'n2' => $stats[2], 'n3' => $stats[3], 'n4' => $stats[4], 'n5' => $stats[5],
                                'conclusion' => $plan->observaciones ?? 'Sin observaciones registradas.'
                            ];
                        }
                    }
                }
            }

            return response()->json([
                'info' => [
                    'docente' => $user->nombres . ' ' . $user->apellidos,
                    'periodo' => $request->periodo,
                    'carrera' => $asignaciones->first()->asignatura->carrera->nombre ?? 'Varias' // Dato referencia
                ],
                'filas' => array_values($filas)
            ]);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

}