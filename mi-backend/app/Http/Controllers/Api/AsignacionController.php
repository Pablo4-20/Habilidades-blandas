<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Asignacion;
use App\Models\User;        
use App\Models\Asignatura;  

class AsignacionController extends Controller
{
    // 1. Listar asignaciones (TABLA)
    public function index()
    {
        // CAMBIO AQUÍ: Agregamos .carrera y .ciclo
        return Asignacion::with([
                'docente', 
                'asignatura.carrera', 
                'asignatura.ciclo'
            ])
            ->orderBy('id', 'desc')
            ->get();
    }

    // 2. Datos para los selectores (FORMULARIO)
    public function datosAuxiliares()
    {
        $docentes = User::where('rol', 'docente')->get();
        
        // CAMBIO AQUÍ: Usamos with() en lugar de all()
        $asignaturas = Asignatura::with(['carrera', 'ciclo'])->get();

        return response()->json([
            'docentes' => $docentes,
            'asignaturas' => $asignaturas
        ]);
    }

    // ... (Mantén el resto de métodos store, update y destroy igual) ...
    public function store(Request $request)
    {
        $request->validate([
            'docente_id' => 'required|exists:users,id',
            'asignatura_id' => 'required|exists:asignaturas,id',
            'periodo' => 'required|string',
            'paralelo' => 'required|string|max:2'
        ]);

        $asignacionExistente = Asignacion::with('docente')
            ->where('asignatura_id', $request->asignatura_id)
            ->where('periodo', $request->periodo)
            ->where('paralelo', $request->paralelo)
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
        $asignacion = Asignacion::find($id);
        if (!$asignacion) return response()->json(['message' => 'No encontrada'], 404);

        $request->validate([
            'docente_id' => 'required', 'asignatura_id' => 'required', 'paralelo' => 'required', 'periodo' => 'required'
        ]);

        $existeDuplicado = Asignacion::where('asignatura_id', $request->asignatura_id)
            ->where('periodo', $request->periodo)
            ->where('paralelo', $request->paralelo)
            ->where('id', '!=', $id) 
            ->exists();

        if ($existeDuplicado) return response()->json(['message' => 'Conflicto: Materia ya asignada en este horario.'], 422);

        $asignacion->update($request->all());
        return response()->json(['message' => 'Actualizado.', 'data' => $asignacion]);
    }

    public function destroy($id)
    {
        Asignacion::destroy($id);
        return response()->json(['message' => 'Eliminado']);
    }
}