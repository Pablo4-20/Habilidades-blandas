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
    // HELPER PRIVADO: Obtener Estudiantes
    // ==========================================
    private function _getEstudiantes($asignaturaId, $periodoId, $paralelo = null)
    {
        $asignatura = Asignatura::with(['carrera', 'ciclo'])->find($asignaturaId);
        if (!$asignatura) return collect();

        // 1. Estudiantes Manuales (Excluyendo 'Baja')
        $estudiantesDirectos = DetalleMatricula::where('asignatura_id', $asignaturaId)
            ->where('estado_materia', '!=', 'Baja')
            ->whereHas('matricula', function($q) use ($periodoId, $paralelo) {
                $q->where('periodo_id', $periodoId)->where('estado', 'Activo');
                if ($paralelo) $q->where('paralelo', $paralelo);
            })
            ->with(['matricula.estudiante'])
            ->get()
            ->map(fn($d) => optional($d->matricula)->estudiante)
            ->filter();

        // 2. Estudiantes Automáticos (Por Ciclo/Carrera)
        $idsConRegistro = DetalleMatricula::where('asignatura_id', $asignaturaId)
            ->whereHas('matricula', fn($q) => $q->where('periodo_id', $periodoId))
            ->pluck('matricula_id');

        $estudiantesCiclo = collect();
        if ($asignatura->ciclo_id) {
            $queryAutomaticos = Matricula::where('periodo_id', $periodoId)
                ->where('ciclo_id', $asignatura->ciclo_id)
                ->where('estado', 'Activo')
                ->whereNotIn('id', $idsConRegistro);

            if ($paralelo) $queryAutomaticos->where('paralelo', $paralelo);

            $estudiantesCiclo = $queryAutomaticos->whereHas('estudiante', function($q) use ($asignatura) {
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
    // 1. MIS CURSOS
    // ==========================================
    public function misCursos(Request $request)
    {
        $user = $request->user();
        $periodo = PeriodoAcademico::where('activo', true)->first();
        $nombrePeriodo = $periodo ? $periodo->nombre : 'Sin Periodo Activo';

        $asignaciones = Asignacion::with(['asignatura.carrera', 'asignatura.ciclo'])
            ->where('docente_id', $user->id)
            ->where('periodo', $nombrePeriodo)
            ->get();

        $grupos = $asignaciones->groupBy(fn($item) => $item->asignatura->ciclo->nombre ?? 'Varios');

        $resultadoCursos = [];
        foreach ($grupos as $ciclo => $items) {
            $materias = $items->map(fn($item) => [
                'asignatura_id' => $item->asignatura->id,
                'nombre' => $item->asignatura->nombre,
                'paralelo' => $item->paralelo,
                'carrera' => $item->asignatura->carrera->nombre ?? 'N/A'
            ])->values();

            $resultadoCursos[] = ['ciclo' => $ciclo, 'materias' => $materias];
        }

        return response()->json(['periodo' => $nombrePeriodo, 'cursos' => $resultadoCursos]);
    }

    // ==========================================
    // 2. LISTADO PARA COMBOS
    // ==========================================
    public function misAsignaturas(Request $request)
    {
        $user = $request->user();
        $asignaciones = Asignacion::with(['asignatura.carrera', 'asignatura.ciclo'])
            ->where('docente_id', $user->id)
            ->get();

        return $asignaciones->map(function ($asig) {
            if (!$asig->asignatura) return null;
            return [
                'id' => $asig->asignatura->id,
                'nombre' => $asig->asignatura->nombre,
                'carrera' => $asig->asignatura->carrera->nombre ?? 'N/A',
                'ciclo' => $asig->asignatura->ciclo->nombre ?? 'N/A',
                'paralelo' => $asig->paralelo,
                'periodo' => $asig->periodo,
            ];
        })->filter()->values();
    }

    // ==========================================
    // 3. MIS ESTUDIANTES
    // ==========================================
    public function misEstudiantes(Request $request, $asignaturaId, $paralelo = null)
    {
        try {
            $periodo = PeriodoAcademico::where('activo', true)->first();
            if (!$periodo) return response()->json([]);

            $estudiantes = $this->_getEstudiantes($asignaturaId, $periodo->id, $paralelo);

            return $estudiantes->map(fn($est) => [
                'id' => $est->id,
                'cedula' => $est->cedula,
                'nombres' => ($est->apellidos ?? '') . ' ' . ($est->nombres ?? ''),
                'email' => $est->email,
                'carrera' => $est->carrera ?? 'N/A'
            ])->sortBy('nombres')->values();

        } catch (\Exception $e) { return response()->json(['message' => $e->getMessage()], 500); }
    }

    public function verEstudiantes(Request $request, $asignaturaId) { return $this->misEstudiantes($request, $asignaturaId); }

    // ==========================================
    // 5. OBTENER HABILIDADES PLANIFICADAS (CON PARALELO)
    // ==========================================
    public function misHabilidades(Request $request, $asignaturaId)
    {
        $user = $request->user();
        $paralelo = $request->query('paralelo'); 
        
        $periodo = PeriodoAcademico::where('activo', true)->first();
        if (!$periodo) return response()->json([]);

        $query = Planificacion::with('detalles.habilidad')
            ->where('asignatura_id', $asignaturaId)
            ->where('docente_id', $user->id)
            ->where('periodo_academico', $periodo->nombre);

        if($paralelo) {
            $query->where('paralelo', $paralelo);
        }

        $planificaciones = $query->get();

        $habilidades = [];
        foreach ($planificaciones as $plan) {
            foreach ($plan->detalles as $det) {
                if ($det->habilidad) {
                    $habilidades[] = [
                        'id' => $det->habilidad->id,
                        'nombre' => $det->habilidad->nombre,
                        'parcial' => $plan->parcial
                    ];
                }
            }
        }
        return response()->json($habilidades);
    }

    // ==========================================
    // 6. RÚBRICA Y CALIFICACIÓN (MODIFICADO)
    // ==========================================
    public function rubrica(Request $request) 
    {
        $user = $request->user();
        $request->validate([ 
            'asignatura_id' => 'required', 
            'habilidad_blanda_id' => 'required', 
            'parcial' => 'required', 
            'periodo' => 'required',
            'paralelo' => 'required' 
        ]);

        $periodo = PeriodoAcademico::where('nombre', $request->periodo)->first();
        if (!$periodo) return response()->json(['message' => 'Periodo no encontrado'], 404);

        // 1. Obtener estudiantes del paralelo correcto
        $todosLosEstudiantes = $this->_getEstudiantes($request->asignatura_id, $periodo->id, $request->paralelo)
            ->sortBy(fn($e) => $e->apellidos . ' ' . $e->nombres);
        
        // 2. Buscar Planificación del paralelo correcto
        $planificacion = Planificacion::where('asignatura_id', $request->asignatura_id)
            ->where('docente_id', $user->id)
            ->where('periodo_academico', $request->periodo)
            ->where('parcial', $request->parcial)
            ->where('paralelo', $request->paralelo) // [FILTRO]
            ->first();

        $evaluaciones = collect();
        if ($planificacion) {
            $evaluaciones = Evaluacion::where('planificacion_id', $planificacion->id)
                ->where('habilidad_blanda_id', $request->habilidad_blanda_id)
                ->get();
        }

        // 3. Notas Parcial 1 (Referencia)
        $evaluacionesP1 = collect();
        if ($request->parcial == '2') {
             $planP1 = Planificacion::where('asignatura_id', $request->asignatura_id)
                ->where('docente_id', $user->id)
                ->where('periodo_academico', $request->periodo)
                ->where('parcial', '1')
                ->where('paralelo', $request->paralelo) // [FILTRO]
                ->first();
             if ($planP1) {
                 $evaluacionesP1 = Evaluacion::where('planificacion_id', $planP1->id)
                    ->where('habilidad_blanda_id', $request->habilidad_blanda_id)
                    ->get();
             }
        }

        // 4. Obtener Actividades
        $actividades = [];
        if ($planificacion) {
             $detalle = $planificacion->detalles()
                ->where('habilidad_blanda_id', $request->habilidad_blanda_id)
                ->first();
             if ($detalle && $detalle->actividades) { 
                 $actividades = is_string($detalle->actividades) ? json_decode($detalle->actividades) : $detalle->actividades; 
             }
        }

        // 5. Armar respuesta
        $listaFinal = $todosLosEstudiantes->map(function($est) use ($evaluaciones, $evaluacionesP1) {
            $nota = $evaluaciones->where('estudiante_id', $est->id)->first();
            $notaP1 = $evaluacionesP1->where('estudiante_id', $est->id)->first();
            
            return [ 
                'estudiante_id' => $est->id, 
                'nombres' => $est->apellidos . ' ' . $est->nombres, 
                'nivel' => $nota ? $nota->nivel : null, 
                'nivel_p1' => $notaP1 ? $notaP1->nivel : null, 
            ];
        })->values();

        return response()->json([ 
            'periodo' => $request->periodo, 
            'estudiantes' => $listaFinal, 
            'actividades' => $actividades 
        ]);
    }

    // ==========================================
    // 7. GUARDAR NOTAS (MODIFICADO)
    // ==========================================
    public function guardarNotas(Request $request) 
    {
        $user = $request->user();
        
        $request->validate([
            'paralelo' => 'required' // [NUEVO] Obligatorio
        ]);

        DB::transaction(function () use ($request, $user) {
            // Buscamos o creamos el plan ESPECÍFICO para este paralelo
            $plan = Planificacion::firstOrCreate(
                [
                    'asignatura_id' => $request->asignatura_id, 
                    'periodo_academico' => $request->periodo, 
                    'parcial' => $request->parcial,
                    'docente_id' => $user->id,
                    'paralelo' => $request->paralelo 
                ]
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
                        ['nivel' => $nota['nivel']]
                    ); 
                } 
            }
        });
        return response()->json(['message' => 'Notas guardadas']);
    }

    // ==========================================
    // 8. VERIFICAR PROGRESO (Estrellas)
    // ==========================================
    public function verificarProgreso(Request $request)
    {
        $request->validate(['asignatura_id' => 'required', 'periodo' => 'required']);
        $periodo = PeriodoAcademico::where('nombre', $request->periodo)->first();
        if (!$periodo) return response()->json([]);

        $user = $request->user();
        $parcial = $request->input('parcial', '1'); 
        $paralelo = $request->input('paralelo', null);

        $estudiantes = $this->_getEstudiantes($request->asignatura_id, $periodo->id, $paralelo);
        $totalEstudiantes = $estudiantes->count();
        if ($totalEstudiantes === 0) return response()->json([]);

        $planP1 = Planificacion::where('asignatura_id', $request->asignatura_id)
            ->where('docente_id', $user->id)
            ->where('periodo_academico', $request->periodo)
            ->where('parcial', '1')
            ->when($paralelo, fn($q) => $q->where('paralelo', $paralelo))
            ->first();

        $planP2 = Planificacion::where('asignatura_id', $request->asignatura_id)
            ->where('docente_id', $user->id)
            ->where('periodo_academico', $request->periodo)
            ->where('parcial', '2')
            ->when($paralelo, fn($q) => $q->where('paralelo', $paralelo))
            ->first();

        if (!$planP1) return response()->json([]);

        $progreso = [];
        $habilidadesIds = $planP1->detalles()->pluck('habilidad_blanda_id');

        foreach ($habilidadesIds as $habilidadId) {
            $conteoP1 = Evaluacion::where('planificacion_id', $planP1->id)
                ->where('habilidad_blanda_id', $habilidadId)
                ->whereIn('estudiante_id', $estudiantes->pluck('id'))
                ->count();
            $completoP1 = $totalEstudiantes > 0 && $conteoP1 >= $totalEstudiantes;

            $completoP2 = false;
            if ($planP2) {
                $conteoP2 = Evaluacion::where('planificacion_id', $planP2->id)
                    ->where('habilidad_blanda_id', $habilidadId)
                    ->whereIn('estudiante_id', $estudiantes->pluck('id'))
                    ->count();
                $completoP2 = $totalEstudiantes > 0 && $conteoP2 >= $totalEstudiantes;
            }

            $progreso[] = [
                'habilidad_id' => $habilidadId,
                'completado' => ($parcial == '2') ? $completoP2 : $completoP1, 
                'p1_ok' => $completoP1,
                'p2_ok' => $completoP2
            ];
        }
        return response()->json($progreso);
    }

    // ==========================================
    // 9. GESTIÓN MANUAL DE ESTUDIANTES
    // ==========================================
    public function agregarEstudianteManual(Request $request) 
    {
        $request->validate(['cedula' => 'required', 'asignatura_id' => 'required']);
        try {
            $periodo = PeriodoAcademico::where('activo', true)->first();
            if (!$periodo) return response()->json(['message' => 'Sin periodo activo'], 400);
            
            $estudiante = Estudiante::where('cedula', $request->cedula)->first();
            if (!$estudiante) return response()->json(['message' => 'Estudiante no encontrado.'], 404);
            
            $asignatura = Asignatura::find($request->asignatura_id);
            $paralelo = $request->input('paralelo', 'A');

            $matricula = Matricula::firstOrCreate(
                ['estudiante_id' => $estudiante->id, 'periodo_id' => $periodo->id], 
                [
                    'ciclo_id' => $asignatura->ciclo_id ?? 1, 
                    'fecha_matricula' => now(), 
                    'estado' => 'Activo',
                    'paralelo' => $paralelo
                ]
            );
            
            DetalleMatricula::updateOrCreate(
                ['matricula_id' => $matricula->id, 'asignatura_id' => $request->asignatura_id], 
                ['estado_materia' => 'Cursando']
            );
            return response()->json(['message' => 'Estudiante inscrito correctamente.']);
        } catch (\Exception $e) { return response()->json(['message' => 'Error: ' . $e->getMessage()], 500); }
    }

    public function eliminarEstudiante(Request $request) 
    {
        $request->validate(['estudiante_id' => 'required', 'asignatura_id' => 'required']);
        try {
            $periodo = PeriodoAcademico::where('activo', true)->first();
            if (!$periodo) return response()->json(['message' => 'Sin periodo activo'], 400);
            
            $matricula = Matricula::where('estudiante_id', $request->estudiante_id)
                ->where('periodo_id', $periodo->id)
                ->first();
                
            if (!$matricula) return response()->json(['message' => 'Estudiante no matriculado.'], 404);
            
            DetalleMatricula::updateOrCreate(
                ['matricula_id' => $matricula->id, 'asignatura_id' => $request->asignatura_id], 
                ['estado_materia' => 'Baja']
            );
            return response()->json(['message' => 'Estudiante dado de baja.']);
        } catch (\Exception $e) { return response()->json(['message' => 'Error: ' . $e->getMessage()], 500); }
    }
}