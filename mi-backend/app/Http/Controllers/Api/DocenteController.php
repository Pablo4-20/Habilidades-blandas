<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Asignacion;
use App\Models\Estudiante;
use App\Models\Planificacion;
use App\Models\Evaluacion;
use App\Models\Asignatura;
use App\Models\PeriodoAcademico;
use App\Models\DetalleMatricula;
use App\Models\Matricula; 
use Illuminate\Support\Facades\DB;

class DocenteController extends Controller
{
    // ==========================================
    // MÉTODO PRIVADO: Obtener Estudiantes
    // ==========================================
    private function _getEstudiantes($asignaturaId, $periodoId)
    {
        $asignatura = Asignatura::with(['carrera', 'ciclo'])->find($asignaturaId);
        if (!$asignatura) return collect();

        $estudiantesDirectos = DetalleMatricula::where('asignatura_id', $asignaturaId)
            ->where('estado_materia', '!=', 'Baja')
            ->whereHas('matricula', function($q) use ($periodoId) {
                $q->where('periodo_id', $periodoId)->where('estado', 'Activo');
            })
            ->with(['matricula.estudiante'])
            ->get()
            ->map(fn($d) => optional($d->matricula)->estudiante)
            ->filter();

        $idsConRegistro = DetalleMatricula::where('asignatura_id', $asignaturaId)
            ->whereHas('matricula', fn($q) => $q->where('periodo_id', $periodoId))
            ->pluck('matricula_id');

        $estudiantesCiclo = collect();
        if ($asignatura->ciclo_id) {
            $estudiantesCiclo = Matricula::where('periodo_id', $periodoId)
                ->where('ciclo_id', $asignatura->ciclo_id)
                ->where('estado', 'Activo')
                ->whereNotIn('id', $idsConRegistro)
                ->whereHas('estudiante', function($q) use ($asignatura) {
                    if ($asignatura->carrera) {
                        $q->where('carrera', $asignatura->carrera->nombre); 
                    }
                })
                ->with('estudiante')
                ->get()
                ->map(fn($m) => $m->estudiante)
                ->filter();
        }

        return $estudiantesDirectos->concat($estudiantesCiclo)->unique('id');
    }

    // ==========================================
    // 1. VERIFICAR PROGRESO GLOBAL (P1 + P2)
    // ==========================================
    public function verificarProgreso(Request $request)
    {
        $request->validate([
            'asignatura_id' => 'required',
            'periodo' => 'required'
        ]);

        $periodo = PeriodoAcademico::where('nombre', $request->periodo)->first();
        if (!$periodo) return response()->json([]);

        $user = $request->user();
        
        // 1. Total Estudiantes
        $estudiantes = $this->_getEstudiantes($request->asignatura_id, $periodo->id);
        $totalEstudiantes = $estudiantes->count();

        if ($totalEstudiantes === 0) return response()->json([]);

        // 2. Obtener Planificaciones de AMBOS parciales
        $planP1 = Planificacion::where('asignatura_id', $request->asignatura_id)
            ->where('docente_id', $user->id)
            ->where('periodo_academico', $request->periodo)
            ->where('parcial', '1')
            ->first();

        $planP2 = Planificacion::where('asignatura_id', $request->asignatura_id)
            ->where('docente_id', $user->id)
            ->where('periodo_academico', $request->periodo)
            ->where('parcial', '2')
            ->first();

        // Si no hay plan en P1, no hay nada que evaluar
        if (!$planP1) return response()->json([]);

        // 3. Verificar habilidades (Basado en P1 como maestro)
        $progreso = [];
        $habilidadesIds = $planP1->detalles()->pluck('habilidad_blanda_id');

        foreach ($habilidadesIds as $habilidadId) {
            // Verificar P1
            $conteoP1 = Evaluacion::where('planificacion_id', $planP1->id)
                ->where('habilidad_blanda_id', $habilidadId)
                ->where('parcial', '1')
                ->whereIn('estudiante_id', $estudiantes->pluck('id'))
                ->count();
            
            $completoP1 = $conteoP1 >= $totalEstudiantes;

            // Verificar P2 (Si existe plan, sino es incompleto)
            $completoP2 = false;
            if ($planP2) {
                $conteoP2 = Evaluacion::where('planificacion_id', $planP2->id)
                    ->where('habilidad_blanda_id', $habilidadId)
                    ->where('parcial', '2')
                    ->whereIn('estudiante_id', $estudiantes->pluck('id'))
                    ->count();
                $completoP2 = $conteoP2 >= $totalEstudiantes;
            }

            // AMBOS deben estar completos para la estrella amarilla y desbloquear la siguiente
            $totalmenteCompleto = $completoP1 && $completoP2;

            $progreso[] = [
                'habilidad_id' => $habilidadId,
                'completado' => $totalmenteCompleto, // Solo true si P1 y P2 están listos
                'p1_ok' => $completoP1,
                'p2_ok' => $completoP2
            ];
        }

        return response()->json($progreso);
    }

    // ... (MANTENER EL RESTO DE MÉTODOS IGUALES: misCursos, misEstudiantes, rubrica, etc.) ...
    
    // Métodos abreviados para no repetir todo el archivo si ya lo tienes:
    public function misCursos(Request $request) { /* Código anterior... */ return parent::misCursos($request); } 
    // Nota: Si copias el archivo, asegúrate de mantener los métodos misEstudiantes, rubrica, etc. que te pasé en la respuesta anterior.
    // Solo verificarProgreso cambió drásticamente.
    
    // Para asegurar la integridad, aquí te dejo misEstudiantes y rubrica nuevamente por si acaso:
    
    public function misEstudiantes(Request $request, $asignaturaId)
    {
        try {
            $periodo = PeriodoAcademico::where('activo', true)->first();
            if (!$periodo) return response()->json([]);
            $estudiantes = $this->_getEstudiantes($asignaturaId, $periodo->id);
            return $estudiantes->map(function($est) {
                return [
                    'id' => $est->id,
                    'cedula' => $est->cedula,
                    'nombres' => ($est->apellidos ?? '') . ' ' . ($est->nombres ?? ''),
                    'email' => $est->email,
                    'carrera' => $est->carrera ?? 'N/A'
                ];
            })->sortBy('nombres')->values();
        } catch (\Exception $e) { return response()->json(['message' => $e->getMessage()], 500); }
    }

    public function rubrica(Request $request) 
    {
        $user = $request->user();
        $request->validate([ 'asignatura_id' => 'required', 'habilidad_blanda_id' => 'required', 'parcial' => 'required', 'periodo' => 'required']);
        $periodo = PeriodoAcademico::where('nombre', $request->periodo)->first();
        if (!$periodo) return response()->json(['message' => 'Periodo no encontrado'], 404);

        $todosLosEstudiantes = $this->_getEstudiantes($request->asignatura_id, $periodo->id)->sortBy(fn($e) => $e->apellidos . ' ' . $e->nombres);
        
        $planificacion = Planificacion::where('asignatura_id', $request->asignatura_id)->where('docente_id', $user->id)->where('periodo_academico', $request->periodo)->where('parcial', $request->parcial)->first();
        $evaluaciones = collect();
        if ($planificacion) {
            $evaluaciones = Evaluacion::where('planificacion_id', $planificacion->id)->where('habilidad_blanda_id', $request->habilidad_blanda_id)->get();
        }

        $evaluacionesP1 = collect();
        if ($request->parcial == '2') {
             $planP1 = Planificacion::where('asignatura_id', $request->asignatura_id)->where('docente_id', $user->id)->where('periodo_academico', $request->periodo)->where('parcial', '1')->first();
             if ($planP1) {
                 $evaluacionesP1 = Evaluacion::where('planificacion_id', $planP1->id)->where('habilidad_blanda_id', $request->habilidad_blanda_id)->get();
             }
        }

        $actividades = [];
        if ($planificacion) {
             $detalle = $planificacion->detalles()->where('habilidad_blanda_id', $request->habilidad_blanda_id)->first();
             if ($detalle && $detalle->actividades) { $actividades = is_string($detalle->actividades) ? json_decode($detalle->actividades) : $detalle->actividades; }
        }

        $listaFinal = $todosLosEstudiantes->map(function($est) use ($evaluaciones, $evaluacionesP1) {
            $nota = $evaluaciones->where('estudiante_id', $est->id)->first();
            $notaP1 = $evaluacionesP1->where('estudiante_id', $est->id)->first();
            return [ 'estudiante_id' => $est->id, 'nombres' => $est->apellidos . ' ' . $est->nombres, 'nivel' => $nota ? $nota->nivel : null, 'nivel_p1' => $notaP1 ? $notaP1->nivel : null, ];
        })->values();

        return response()->json([ 'periodo' => $request->periodo, 'estudiantes' => $listaFinal, 'actividades' => $actividades ]);
    }
    
    public function agregarEstudianteManual(Request $request) { /* Mismo código anterior */ 
        $request->validate(['cedula' => 'required', 'asignatura_id' => 'required']);
        try {
            $periodo = PeriodoAcademico::where('activo', true)->first();
            if (!$periodo) return response()->json(['message' => 'Sin periodo activo'], 400);
            $estudiante = Estudiante::where('cedula', $request->cedula)->first();
            if (!$estudiante) return response()->json(['message' => 'Estudiante no encontrado.'], 404);
            $asignatura = Asignatura::find($request->asignatura_id);
            $matricula = Matricula::firstOrCreate(['estudiante_id' => $estudiante->id, 'periodo_id' => $periodo->id], ['ciclo_id' => $asignatura->ciclo_id ?? 1, 'fecha_matricula' => now(), 'estado' => 'Activo']);
            DetalleMatricula::updateOrCreate(['matricula_id' => $matricula->id, 'asignatura_id' => $request->asignatura_id], ['estado_materia' => 'Cursando']);
            return response()->json(['message' => 'Estudiante inscrito correctamente.']);
        } catch (\Exception $e) { return response()->json(['message' => 'Error: ' . $e->getMessage()], 500); }
    }

    public function eliminarEstudiante(Request $request) { /* Mismo código anterior */ 
        $request->validate(['estudiante_id' => 'required', 'asignatura_id' => 'required']);
        try {
            $periodo = PeriodoAcademico::where('activo', true)->first();
            if (!$periodo) return response()->json(['message' => 'Sin periodo activo'], 400);
            $matricula = Matricula::where('estudiante_id', $request->estudiante_id)->where('periodo_id', $periodo->id)->first();
            if (!$matricula) return response()->json(['message' => 'Estudiante no matriculado.'], 404);
            DetalleMatricula::updateOrCreate(['matricula_id' => $matricula->id, 'asignatura_id' => $request->asignatura_id], ['estado_materia' => 'Baja']);
            return response()->json(['message' => 'Estudiante dado de baja.']);
        } catch (\Exception $e) { return response()->json(['message' => 'Error: ' . $e->getMessage()], 500); }
    }
    
    public function misAsignaturas(Request $request) { /* Mismo código anterior */ 
        $user = $request->user();
        $asignaciones = Asignacion::with(['asignatura.carrera', 'asignatura.ciclo'])->where('docente_id', $user->id)->get();
        return $asignaciones->map(function ($asig) { if (!$asig->asignatura) return null; return [ 'id' => $asig->asignatura->id, 'nombre' => $asig->asignatura->nombre, 'carrera' => optional($asig->asignatura->carrera)->nombre ?? 'N/A', 'ciclo' => optional($asig->asignatura->ciclo)->nombre ?? 'N/A', 'paralelo' => $asig->paralelo, 'periodo' => $asig->periodo, ]; })->filter()->values();
    }
    public function guardarNotas(Request $request) { /* Mismo código anterior */ 
        $user = $request->user();
        DB::transaction(function () use ($request, $user) {
            $plan = Planificacion::firstOrCreate(['asignatura_id' => $request->asignatura_id, 'periodo_academico' => $request->periodo, 'parcial' => $request->parcial], ['docente_id' => $user->id]);
            foreach ($request->notas as $nota) { if (!empty($nota['nivel'])) { Evaluacion::updateOrCreate(['planificacion_id' => $plan->id, 'estudiante_id' => $nota['estudiante_id'], 'habilidad_blanda_id' => $request->habilidad_blanda_id, 'parcial' => $request->parcial], ['nivel' => $nota['nivel']]); } }
        });
        return response()->json(['message' => 'Notas guardadas']);
    }
    public function guardarPlanificacion(Request $request) { /* Mismo código anterior */ 
        $user = $request->user();
        DB::transaction(function () use ($request, $user) {
            $plan = Planificacion::updateOrCreate(['asignatura_id' => $request->asignatura_id, 'docente_id' => $user->id, 'periodo_academico' => $request->periodo, 'parcial' => $request->parcial], ['observaciones' => $request->observaciones, 'estado' => 'en_proceso']);
            $plan->detalles()->delete();
            foreach ($request->detalles as $d) { $plan->detalles()->create(['habilidad_blanda_id' => $d['habilidad_id'], 'actividades' => $d['actividades'] ?? '']); }
        });
        return response()->json(['message' => 'Planificación guardada']);
    }
}