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
        
        $asignaciones = Asignacion::with('asignatura')
            ->where('docente_id', $user->id)
            ->get();

        return $asignaciones->map(function ($asignacion) use ($user) {
            if (!$asignacion->asignatura) return null; 

            // Verificamos si existe planificación para P1 y P2
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
                'carrera' => $asignacion->asignatura->carrera,
                'ciclo' => $asignacion->asignatura->ciclo,
                'paralelo' => $asignacion->paralelo,
                'asignacion_id' => $asignacion->id,
                'periodo' => $asignacion->periodo,
                'planificacion_p1' => $planificacion_p1,
                'planificacion_p2' => $planificacion_p2
            ];
        })->filter()->values();
    }

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

        $asignatura = Asignatura::findOrFail($asignatura_id);
        $estudiantes = Estudiante::where('carrera', $asignatura->carrera)
            ->where('ciclo_actual', $asignatura->ciclo)
            ->orderBy('apellidos')
            ->get();

        return response()->json($estudiantes);
    }

    // 4. OBTENER RÚBRICA Y ACTIVIDADES
    public function rubrica(Request $request)
    {
        $request->validate([
            'asignatura_id' => 'required',
            'parcial' => 'required|in:1,2',
        ]);

        $user = $request->user();

        // A. Periodo
        $asignacion = Asignacion::where('asignatura_id', $request->asignatura_id)
            ->where('docente_id', $user->id)
            ->first();

        $periodo = $asignacion ? $asignacion->periodo : 'Sin Periodo';

        // B. Estudiantes
        $asignatura = Asignatura::findOrFail($request->asignatura_id);
        $estudiantes = Estudiante::where('carrera', $asignatura->carrera)
            ->where('ciclo_actual', $asignatura->ciclo)
            ->orderBy('apellidos')
            ->get();

        // C. Actividades
        $actividades = [];
        
        if ($request->habilidad_blanda_id && $asignacion) {
            $plan = Planificacion::where('asignatura_id', $request->asignatura_id)
                ->where('docente_id', $user->id)
                ->where('periodo_academico', $asignacion->periodo)
                ->where('parcial', $request->parcial)
                ->first();

            if ($plan) {
                // Buscamos en la relación detalles
                $detalle = $plan->detalles()
                            ->where('habilidad_blanda_id', $request->habilidad_blanda_id)
                            ->first();

                if ($detalle && !empty($detalle->actividades)) {
                    $listaTexto = explode("\n", $detalle->actividades);
                    foreach($listaTexto as $txt) {
                        if(trim($txt) !== '') {
                            $actividades[] = ['descripcion' => trim($txt)];
                        }
                    }
                }
            }
        }

        if (empty($actividades)) {
            $actividades = [
                ['descripcion' => 'No se encontraron actividades planificadas.'],
                ['descripcion' => 'Verifica en "Mis Habilidades" si guardaste el texto.']
            ];
        }

        // D. Notas
        $notasMap = [];
        if ($request->habilidad_blanda_id && isset($plan)) {
            $evaluaciones = Evaluacion::where('planificacion_id', $plan->id)
                ->where('habilidad_blanda_id', $request->habilidad_blanda_id)
                ->get();
            
            foreach($evaluaciones as $ev) {
                $notasMap[$ev->estudiante_id] = $ev->nivel;
            }
        }

        // E. Respuesta
        $listaEstudiantes = $estudiantes->map(function ($est) use ($notasMap) {
            return [
                'estudiante_id' => $est->id,
                'nombres' => $est->apellidos . ' ' . $est->nombres,
                'nivel' => $notasMap[$est->id] ?? null
            ];
        });

        return response()->json([
            'periodo' => $periodo,
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
                
                // 1. Verificamos asignación (Opcional, pero buena práctica)
                $asignacion = Asignacion::where('asignatura_id', $request->asignatura_id)
                    ->where('docente_id', $user->id)
                    ->where('periodo', $request->periodo)
                    ->first();
                
                

                // 2. BUSCAR O CREAR PLANIFICACIÓN
                
                $plan = Planificacion::firstOrCreate(
                    [
                        'asignatura_id' => $request->asignatura_id,
                        'periodo_academico' => $request->periodo,
                        'parcial' => $request->parcial
                    ],
                    [
                        // Estos valores solo se insertan si se crea un registro NUEVO
                        'docente_id' => $user->id 
                    ]
                );

                // 3. Guardar las notas
                foreach ($request->notas as $nota) {
                    if (!empty($nota['nivel'])) { 
                        Evaluacion::updateOrCreate(
                            [
                                'planificacion_id' => $plan->id,
                                'estudiante_id' => $nota['estudiante_id'],
                                'habilidad_blanda_id' => $request->habilidad_blanda_id, 
                                'parcial' => $request->parcial
                            ],
                            [
                                'nivel' => $nota['nivel'],
                            ]
                        );
                    }
                }
            });

            return response()->json(['message' => 'Notas guardadas correctamente'], 200);

        } catch (\Exception $e) {
           
            \Illuminate\Support\Facades\Log::error('Error guardando notas: ' . $e->getMessage());
            return response()->json(['message' => 'Error al guardar: ' . $e->getMessage()], 500);
        }
    }

    // ==========================================
    //  6. PDF DATA (
    // ==========================================
    public function pdfData(Request $request)
    {
        $request->validate([
            'asignatura_id' => 'required',
            'periodo' => 'required' 
        ]);
        
        $user = $request->user();

        // 1. Info General
        $asignatura = Asignatura::findOrFail($request->asignatura_id);
        
        $asignacion = Asignacion::where('asignatura_id', $request->asignatura_id)
            ->where('docente_id', $user->id)
            ->where('periodo', $request->periodo)
            ->first();

        $info = [
            'facultad' => 'FACULTAD DE CIENCIAS DE LA EDUCACIÓN', 
            'carrera' => $asignatura->carrera,
            'docente' => $user->name ?? $user->email, 
            'periodo' => $request->periodo, 
            'asignatura' => $asignatura->nombre,
            'ciclo' => $asignatura->ciclo . ' - ' . ($asignacion->paralelo ?? 'A')
        ];

        // 2. Estudiantes
        $estudiantes = Estudiante::where('carrera', $asignatura->carrera)
            ->where('ciclo_actual', $asignatura->ciclo)
            ->orderBy('apellidos')
            ->get();

        // 3. Planificaciones 
        $planes = Planificacion::with(['detalles.habilidad'])
            ->where('asignatura_id', $request->asignatura_id)
            ->where('docente_id', $user->id)
            ->where('periodo_academico', $request->periodo)
            ->get(); 

        $reportes = [];

        foreach ($planes as $plan) {
           
            foreach ($plan->detalles as $detalle) {
                
                $evaluaciones = Evaluacion::where('planificacion_id', $plan->id)
                    ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id)
                    ->get();

                // Estadísticas
                $stats = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];
                foreach ($evaluaciones as $ev) {
                    if (isset($stats[$ev->nivel])) {
                        $stats[$ev->nivel]++;
                    }
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

                $conclusion = $plan->observaciones ?? '';

                $reportes[] = [
                    'planificacion_id' => $plan->id . '_' . $detalle->habilidad_blanda_id, 
                    'real_plan_id' => $plan->id, 
                    'habilidad' => $detalle->habilidad ? $detalle->habilidad->nombre : 'Sin Nombre',
                    'parcial_asignado' => (string)$plan->parcial,
                    'conclusion' => $conclusion,
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
    }

    // 7. GUARDAR CONCLUSIÓN
    public function guardarConclusion(Request $request)
    {
        $request->validate([
            'planificacion_id' => 'required',
            'conclusion' => 'nullable|string'
        ]);

        $parts = explode('_', $request->planificacion_id); 
        $planIdReal = $parts[0]; 

        $plan = Planificacion::find($planIdReal);
        
        if ($plan) {
            $plan->observaciones = $request->conclusion;
            $plan->save();
            return response()->json(['message' => 'Guardado correctamente']);
        }

        return response()->json(['error' => 'Planificación no encontrada'], 404);
    }
}