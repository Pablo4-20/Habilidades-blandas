<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Asignacion;
use App\Models\User;        
use App\Models\Asignatura;  

class AsignacionController extends Controller
{
    // 1. Listar asignaciones (General)
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Asignacion::with([
                'docente', 
                'asignatura.carrera', 
                'asignatura.ciclo'
            ])
            ->orderBy('id', 'desc');

        // [SEGURIDAD] Filtro por Coordinador
        if ($user->rol === 'coordinador' && $user->carrera_id) {
            $query->whereHas('asignatura', function($q) use ($user) {
                $q->where('carrera_id', $user->carrera_id);
            });
        }

        return $query->get();
    }

    // [NUEVO] Método usado por el Frontend "AsignarMaterias.jsx"
    public function byPeriodo(Request $request, $periodo)
    {
        $user = $request->user();

        $query = Asignacion::with(['docente', 'asignatura.carrera', 'asignatura.ciclo'])
            ->where('periodo', $periodo);

        // [SEGURIDAD] Solo ver asignaciones de MI carrera
        if ($user->rol === 'coordinador' && $user->carrera_id) {
            $query->whereHas('asignatura', function($q) use ($user) {
                $q->where('carrera_id', $user->carrera_id);
            });
        }

        return response()->json($query->get());
    }

    // 2. Datos para los selectores (FORMULARIO)
    public function datosAuxiliares(Request $request)
    {
        $user = $request->user();
        $docentes = User::where('rol', 'docente')->get();
        
        $queryAsignaturas = Asignatura::with(['carrera', 'ciclo']);

        // [SEGURIDAD] Solo listar MIS asignaturas en el select
        if ($user->rol === 'coordinador' && $user->carrera_id) {
            $queryAsignaturas->where('carrera_id', $user->carrera_id);
        }

        return response()->json([
            'docentes' => $docentes,
            'asignaturas' => $queryAsignaturas->get()
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'docente_id' => 'required|exists:users,id',
            'asignatura_id' => 'required|exists:asignaturas,id',
            'periodo' => 'required|string',
            // 'paralelo' => 'required|string|max:2' // (Opcional según tu lógica)
        ]);

        // [SEGURIDAD] Verificar que la asignatura sea de mi carrera
        if ($user->rol === 'coordinador' && $user->carrera_id) {
            $asignatura = Asignatura::find($request->asignatura_id);
            if ($asignatura->carrera_id !== $user->carrera_id) {
                return response()->json(['message' => 'No puedes asignar materias de otra carrera.'], 403);
            }
        }

        // Verificar duplicados (Mismo periodo, misma materia)
        // Nota: Ajusta si permites varios paralelos
        $asignacionExistente = Asignacion::with('docente')
            ->where('asignatura_id', $request->asignatura_id)
            ->where('periodo', $request->periodo)
            // ->where('paralelo', $request->paralelo) // Descomenta si usas paralelos
            ->first();

        if ($asignacionExistente) {
            $nombreProfe = $asignacionExistente->docente->nombres ?? 'Otro docente'; 
            return response()->json([
                'message' => "Esta materia ya está asignada al docente: $nombreProfe"
            ], 422); 
        }

        $asignacion = Asignacion::create($request->all());
        return response()->json(['message' => 'Carga asignada correctamente', 'data' => $asignacion]);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $asignacion = Asignacion::with('asignatura')->find($id);
        
        if (!$asignacion) return response()->json(['message' => 'No encontrada'], 404);

        // [SEGURIDAD]
        if ($user->rol === 'coordinador' && $user->carrera_id) {
            if ($asignacion->asignatura->carrera_id !== $user->carrera_id) {
                return response()->json(['message' => 'No tienes permiso.'], 403);
            }
        }

        $request->validate([
            'docente_id' => 'required', 
            'asignatura_id' => 'required', 
            // 'paralelo' => 'required', 
            'periodo' => 'required'
        ]);

        // Verificar conflicto de horario/duplicado
        $existeDuplicado = Asignacion::where('asignatura_id', $request->asignatura_id)
            ->where('periodo', $request->periodo)
            // ->where('paralelo', $request->paralelo)
            ->where('id', '!=', $id) 
            ->exists();

        if ($existeDuplicado) return response()->json(['message' => 'Conflicto: Materia ya asignada.'], 422);

        $asignacion->update($request->all());
        return response()->json(['message' => 'Actualizado.', 'data' => $asignacion]);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $asignacion = Asignacion::with('asignatura')->find($id);

        if (!$asignacion) return response()->json(['message' => 'No existe'], 404);

        // [SEGURIDAD]
        if ($user->rol === 'coordinador' && $user->carrera_id) {
            if ($asignacion->asignatura->carrera_id !== $user->carrera_id) {
                return response()->json(['message' => 'No puedes eliminar asignaciones de otra carrera.'], 403);
            }
        }

        $asignacion->delete();
        return response()->json(['message' => 'Eliminado']);
    }
}