<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Asignacion;
use App\Models\User;        
use App\Models\Asignatura;  

class AsignacionController extends Controller
{
    // 1. Listar asignaciones
    public function index()
    {
        return Asignacion::with(['docente', 'asignatura'])
            ->orderBy('id', 'desc')
            ->get();
    }

    // 2. Datos para los selectores
    public function datosAuxiliares()
    {
        // Traemos usuarios que sean 'docente' y todas las asignaturas
        $docentes = User::where('rol', 'docente')->get();
        $asignaturas = Asignatura::all();

        return response()->json([
            'docentes' => $docentes,
            'asignaturas' => $asignaturas
        ]);
    }

    // 3. Guardar asignación
    public function store(Request $request)
    {
        $request->validate([
            'docente_id' => 'required|exists:users,id',
            'asignatura_id' => 'required|exists:asignaturas,id',
            'periodo' => 'required|string',
            'paralelo' => 'required|string|max:2'
        ]);

       
        // Verificamos si ESTA materia en ESTE paralelo ya tiene dueño (sin importar quién sea)
        $asignacionExistente = Asignacion::with('docente') // Traemos al docente para mostrar quién la tiene
            ->where('asignatura_id', $request->asignatura_id)
            ->where('periodo', $request->periodo)
            ->where('paralelo', $request->paralelo)
            ->first();

        if ($asignacionExistente) {
            // Si ya existe, avisamos quién la tiene asignada
            $nombreProfe = $asignacionExistente->docente->name;
            return response()->json([
                'message' => "Esta materia ya está asignada al docente: $nombreProfe"
            ], 422); 
        }

        $asignacion = Asignacion::create($request->all());
        return response()->json(['message' => 'Carga asignada correctamente', 'data' => $asignacion]);
    }

    public function update(Request $request, $id)
    {
        // 1. Buscamos la asignación
        $asignacion = Asignacion::find($id);

        if (!$asignacion) {
            return response()->json(['message' => 'Asignación no encontrada'], 404);
        }

        // 2. Validamos los datos
        $request->validate([
            'docente_id' => 'required|exists:users,id',
            'asignatura_id' => 'required|exists:asignaturas,id',
            'paralelo' => 'required',
            'periodo' => 'required'
        ]);

        // 3. Verificamos duplicados (EXCLUYENDO la actual)
        // "No puede haber otra asignación de la misma materia, en el mismo periodo y paralelo"
        $existeDuplicado = Asignacion::where('asignatura_id', $request->asignatura_id)
            ->where('periodo', $request->periodo)
            ->where('paralelo', $request->paralelo)
            ->where('id', '!=', $id) 
            ->exists();

        if ($existeDuplicado) {
            return response()->json([
                'message' => 'Conflicto: Esta materia ya está asignada en este periodo y paralelo.'
            ], 422);
        }

        // 4. Guardamos los cambios
        $asignacion->update([
            'docente_id' => $request->docente_id,
            'asignatura_id' => $request->asignatura_id,
            'paralelo' => $request->paralelo,
            'periodo' => $request->periodo
        ]);

        return response()->json([
            'message' => 'Asignación actualizada correctamente.',
            'data' => $asignacion
        ]);
    }
    // 4. Eliminar
    public function destroy($id)
    {
        Asignacion::destroy($id);
        return response()->json(['message' => 'Asignación eliminada']);
    }
}