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
use App\Models\Matricula; // VITAL para buscar por ciclo
use Illuminate\Support\Facades\DB;

class DocenteController extends Controller
{
    // ==========================================
    // 1. MENÚ LATERAL: MIS CURSOS
    // ==========================================
    public function misCursos(Request $request)
    {
        try {
            $user = $request->user();
            $periodo = PeriodoAcademico::where('activo', true)->first();
            
            if (!$periodo) return response()->json(['periodo' => 'Sin Periodo Activo', 'cursos' => []]);

            $asignaciones = Asignacion::with(['asignatura.ciclo', 'asignatura.carrera'])
                ->where('docente_id', $user->id)
                ->where('periodo', $periodo->nombre) 
                ->get();

            $menu = $asignaciones->groupBy(function($item) {
                return optional($item->asignatura->ciclo)->nombre ?? 'Sin Ciclo'; 
            })->map(function($items, $ciclo) {
                return [
                    'ciclo' => $ciclo,
                    'materias' => $items->map(function($asig) {
                        return [
                            'asignatura_id' => $asig->asignatura->id,
                            'nombre' => $asig->asignatura->nombre,
                            'carrera' => optional($asig->asignatura->carrera)->nombre ?? 'General',
                            'codigo' => $asig->asignatura->codigo,
                            'paralelo' => $asig->paralelo
                        ];
                    })->values()
                ];
            })->values(); 

            return response()->json(['periodo' => $periodo->nombre, 'cursos' => $menu]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error en menú: ' . $e->getMessage()], 500);
        }
    }

    // ==========================================
    // 2. LISTADO DE ESTUDIANTES (METODO QUE FALTABA)
    // ==========================================
    public function misEstudiantes(Request $request, $asignaturaId)
    {
        try {
            $periodo = PeriodoAcademico::where('activo', true)->first();
            if (!$periodo) return response()->json([]);

            $asignatura = Asignatura::with(['carrera', 'ciclo'])->find($asignaturaId);
            if (!$asignatura) return response()->json([]);

            // A. Buscar inscritos específicamente en esta materia
            $estudiantesDirectos = DetalleMatricula::where('asignatura_id', $asignaturaId)
                ->whereHas('matricula', function($q) use ($periodo) {
                    $q->where('periodo_id', $periodo->id)->where('estado', 'Activo');
                })
                ->with(['matricula.estudiante'])
                ->get()
                ->map(fn($d) => optional($d->matricula)->estudiante)
                ->filter();

            // B. FALLBACK: Buscar por Ciclo (Para que salgan tus 3 ejemplos)
            $estudiantesCiclo = collect();
            if ($asignatura->ciclo_id) {
                $estudiantesCiclo = Matricula::where('periodo_id', $periodo->id)
                    ->where('ciclo_id', $asignatura->ciclo_id)
                    ->where('estado', 'Activo')
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

            $todos = $estudiantesDirectos->concat($estudiantesCiclo)->unique('id')->filter();

            return $todos->map(function($est) {
                return [
                    'id' => $est->id,
                    'cedula' => $est->cedula,
                    'nombres' => ($est->apellidos ?? '') . ' ' . ($est->nombres ?? ''),
                    'email' => $est->email,
                    'carrera' => $est->carrera ?? 'N/A'
                ];
            })->sortBy('nombres')->values();

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al cargar lista: ' . $e->getMessage()], 500);
        }
    }

    // ==========================================
    // 3. AGREGAR ESTUDIANTE MANUAL (ARRASTRE)
    // ==========================================
    public function agregarEstudianteManual(Request $request)
    {
        $request->validate(['cedula' => 'required', 'asignatura_id' => 'required']);
        
        try {
            $periodo = PeriodoAcademico::where('activo', true)->first();
            if (!$periodo) return response()->json(['message' => 'Sin periodo activo'], 400);

            $estudiante = Estudiante::where('cedula', $request->cedula)->first();
            if (!$estudiante) return response()->json(['message' => 'Estudiante no encontrado en el sistema.'], 404);

            $asignatura = Asignatura::find($request->asignatura_id);

            $matricula = Matricula::firstOrCreate(
                ['estudiante_id' => $estudiante->id, 'periodo_id' => $periodo->id],
                ['ciclo_id' => $asignatura->ciclo_id ?? 1, 'fecha_matricula' => now(), 'estado' => 'Activo']
            );

            DetalleMatricula::firstOrCreate([
                'matricula_id' => $matricula->id,
                'asignatura_id' => $request->asignatura_id
            ]);

            return response()->json(['message' => 'Estudiante inscrito correctamente.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    // ==========================================
    // 4. OTROS MÉTODOS MANTENIDOS
    // ==========================================
    public function misAsignaturas(Request $request)
    {
        $user = $request->user();
        $asignaciones = Asignacion::with(['asignatura.carrera', 'asignatura.ciclo'])->where('docente_id', $user->id)->get();
        return $asignaciones->map(function ($asig) {
            if (!$asig->asignatura) return null; 
            return [
                'id' => $asig->asignatura->id,
                'nombre' => $asig->asignatura->nombre,
                'carrera' => optional($asig->asignatura->carrera)->nombre ?? 'N/A', 
                'ciclo' => optional($asig->asignatura->ciclo)->nombre ?? 'N/A',     
                'paralelo' => $asig->paralelo,
                'periodo' => $asig->periodo,
            ];
        })->filter()->values();
    }

    public function misHabilidades($asignatura_id, Request $request) {
        $user = $request->user();
        $plan = Planificacion::with('detalles.habilidad')->where('docente_id', $user->id)->where('asignatura_id', $asignatura_id)->latest()->first();
        if (!$plan) return [];
        return $plan->detalles->map(fn($d) => [ 'planificacion_id' => $plan->id, 'habilidad_id' => $d->habilidad->id, 'habilidad_nombre' => $d->habilidad->nombre, 'periodo' => $plan->periodo_academico, 'parcial' => $plan->parcial ]);
    }

    public function verEstudiantes($asignatura_id, Request $request) {
        $asig = Asignatura::with(['carrera', 'ciclo'])->findOrFail($asignatura_id);
        return Estudiante::where('carrera', optional($asig->carrera)->nombre ?? $asig->carrera)->where('ciclo_actual', optional($asig->ciclo)->nombre ?? $asig->ciclo)->orderBy('apellidos')->get();
    }

    public function rubrica(Request $request) {
        $user = $request->user();
        $asig = Asignatura::with(['carrera', 'ciclo'])->findOrFail($request->asignatura_id);
        $estudiantes = Estudiante::where('carrera', optional($asig->carrera)->nombre ?? $asig->carrera)->where('ciclo_actual', optional($asig->ciclo)->nombre ?? $asig->ciclo)->orderBy('apellidos')->get();
        $evaluaciones = Evaluacion::where('habilidad_blanda_id', $request->habilidad_blanda_id)->whereHas('planificacion', function($q) use ($request, $user) { $q->where('asignatura_id', $request->asignatura_id)->where('docente_id', $user->id)->where('periodo_academico', $request->periodo); })->get();
        return response()->json(['periodo' => $request->periodo, 'estudiantes' => $estudiantes->map(fn($e) => ['estudiante_id' => $e->id, 'nombres' => $e->apellidos . ' ' . $e->nombres, 'nivel' => optional($evaluaciones->where('estudiante_id', $e->id)->where('parcial', $request->parcial)->first())->nivel])]);
    }

    public function guardarNotas(Request $request) {
        $user = $request->user();
        DB::transaction(function () use ($request, $user) {
            $plan = Planificacion::firstOrCreate(['asignatura_id' => $request->asignatura_id, 'periodo_academico' => $request->periodo, 'parcial' => $request->parcial], ['docente_id' => $user->id]);
            foreach ($request->notas as $nota) {
                if (!empty($nota['nivel'])) {
                    Evaluacion::updateOrCreate(['planificacion_id' => $plan->id, 'estudiante_id' => $nota['estudiante_id'], 'habilidad_blanda_id' => $request->habilidad_blanda_id, 'parcial' => $request->parcial], ['nivel' => $nota['nivel']]);
                }
            }
        });
        return response()->json(['message' => 'Notas guardadas']);
    }

    public function obtenerPlanificacion(Request $request) {
        $user = $request->user();
        $plan = Planificacion::with(['detalles.habilidad'])->where('asignatura_id', $request->asignatura_id)->where('docente_id', $user->id)->where('periodo_academico', $request->periodo)->where('parcial', $request->parcial)->first();
        if (!$plan) return response()->json(['existe' => false, 'detalles' => []]);
        return response()->json(['existe' => true, 'id' => $plan->id, 'observaciones' => $plan->observaciones, 'detalles' => $plan->detalles->map(fn($d) => ['habilidad_id' => $d->habilidad_blanda_id, 'nombre' => $d->habilidad->nombre ?? 'Hab', 'actividades' => $d->actividades])]);
    }

    public function guardarPlanificacion(Request $request) {
        $user = $request->user();
        DB::transaction(function () use ($request, $user) {
            $plan = Planificacion::updateOrCreate(['asignatura_id' => $request->asignatura_id, 'docente_id' => $user->id, 'periodo_academico' => $request->periodo, 'parcial' => $request->parcial], ['observaciones' => $request->observaciones, 'estado' => 'en_proceso']);
            $plan->detalles()->delete();
            foreach ($request->detalles as $d) { $plan->detalles()->create(['habilidad_blanda_id' => $d['habilidad_id'], 'actividades' => $d['actividades'] ?? '']); }
        });
        return response()->json(['message' => 'Planificación guardada']);
    }
}