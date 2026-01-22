<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Estudiante;
use App\Models\User; // <--- IMPORTANTE: Importar modelo User
use Illuminate\Validation\Rule;
use App\Rules\ValidaCedula; // Si usas tu regla personalizada

class EstudianteController extends Controller
{
    public function index()
    {
        return Estudiante::with('ultimaMatricula.periodo', 'ultimaMatricula.ciclo')
            ->orderBy('id', 'desc')
            ->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'cedula' => ['required', 'unique:estudiantes', new ValidaCedula],
            'nombres' => 'required',
            'apellidos' => 'required',
            'email' => 'required|email|unique:estudiantes'
        ]);

        // --- VALIDACIÓN CRUZADA: Verificar si ya existe como Usuario (Docente/Admin) ---
        if (User::where('cedula', $request->cedula)->exists()) {
            return response()->json([
                'message' => 'Error: Esta cédula ya está registrada como Personal Administrativo/Docente.'
            ], 422);
        }

        $estudiante = Estudiante::create($request->all());
        return response()->json($estudiante, 201);
    }

    public function update(Request $request, $id)
    {
        $estudiante = Estudiante::findOrFail($id);

        $request->validate([
            'cedula' => ['required', Rule::unique('estudiantes')->ignore($id), new ValidaCedula],
            'nombres' => 'required',
            'apellidos' => 'required',
            'email' => ['required', 'email', Rule::unique('estudiantes')->ignore($id)]
        ]);

        // --- VALIDACIÓN CRUZADA EN UPDATE ---
        // Verificamos en Users, pero solo si la cédula cambió o si ya existía allá por error
        if (User::where('cedula', $request->cedula)->exists()) {
            return response()->json([
                'message' => 'Conflicto: Esta cédula pertenece a un Usuario del sistema.'
            ], 422);
        }

        $estudiante->update($request->all());
        return response()->json($estudiante);
    }

    public function destroy($id)
    {
        Estudiante::destroy($id);
        return response()->json(['message' => 'Eliminado']);
    }

    // --- IMPORTACIÓN MASIVA CON VALIDACIÓN CRUZADA ---
    public function import(Request $request)
    {
        $request->validate(['file' => 'required|file']);
        $file = $request->file('file');
        
        $contenido = file_get_contents($file->getRealPath());
        $lines = preg_split("/\r\n|\n|\r/", $contenido);
        $separador = str_contains($lines[0] ?? '', ';') ? ';' : ',';

        $creados = 0;
        $errores = [];

        foreach ($lines as $index => $linea) {
            if (trim($linea) === '') continue;
            $row = str_getcsv($linea, $separador);
            
            // Validar estructura mínima
            if (count($row) < 4) continue; 
            if (strtolower(trim($row[0])) === 'cedula') continue; // Cabecera

            $cedula = trim($row[0]);
            
            // 1. Validar si ya es Estudiante
            if (Estudiante::where('cedula', $cedula)->exists()) {
                // Opcional: Podrías actualizar en vez de dar error, depende de tu lógica
                $errores[] = "Fila ".($index+1).": $cedula ya es estudiante.";
                continue; 
            }

            // 2. VALIDACIÓN CRUZADA: Validar si es Usuario
            if (User::where('cedula', $cedula)->exists()) {
                $errores[] = "Fila ".($index+1).": $cedula ya existe como Personal Administrativo.";
                continue;
            }

            try {
                Estudiante::create([
                    'cedula' => $cedula,
                    'nombres' => mb_convert_case(trim($row[1]), MB_CASE_TITLE, "UTF-8"),
                    'apellidos' => mb_convert_case(trim($row[2]), MB_CASE_TITLE, "UTF-8"),
                    'email' => strtolower(trim($row[3])),
                    // 'carrera' => ... (si la tienes en el excel)
                ]);
                $creados++;
            } catch (\Exception $e) {
                $errores[] = "Fila ".($index+1).": Error al guardar.";
            }
        }

        return response()->json([
            'message' => "Proceso terminado. Creados: $creados.",
            'errores' => $errores
        ]);
    }
}