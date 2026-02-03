<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Estudiante;
use App\Models\User; 
use Illuminate\Validation\Rule;
use App\Rules\ValidaCedula; 
use Illuminate\Support\Facades\DB;

class EstudianteController extends Controller
{
    public function index()
    {
        return Estudiante::with('ultimaMatricula.periodo', 'ultimaMatricula.ciclo')
            ->orderBy('id', 'desc')
            ->get();
    }

    // --- 1. CREACIÓN MANUAL ---
    public function store(Request $request)
    {
        $request->validate([
            'cedula' => ['required', 'unique:estudiantes', new ValidaCedula],
            'nombres' => 'required',
            'apellidos' => 'required',
            'email' => 'required|email|unique:estudiantes',
            'carrera' => 'required|string'
        ]);

        if (User::where('cedula', $request->cedula)->exists()) {
            return response()->json([
                'message' => 'Error: Esta cédula ya está registrada como Personal Administrativo/Docente.'
            ], 422);
        }

        $data = $request->all();
        $data['nombres']   = mb_convert_case($request->nombres, MB_CASE_TITLE, "UTF-8");
        $data['apellidos'] = mb_convert_case($request->apellidos, MB_CASE_TITLE, "UTF-8");

        $estudiante = Estudiante::create($data);
        return response()->json($estudiante, 201);
    }

    // --- 2. ACTUALIZACIÓN ---
    public function update(Request $request, $id)
    {
        $estudiante = Estudiante::findOrFail($id);

        $request->validate([
            'cedula' => ['required', Rule::unique('estudiantes')->ignore($id), new ValidaCedula],
            'nombres' => 'required',
            'apellidos' => 'required',
            'email' => ['required', 'email', Rule::unique('estudiantes')->ignore($id)],
            'carrera' => 'required|string'
        ]);

        if (User::where('cedula', $request->cedula)->where('id', '!=', $id)->exists()) {
            return response()->json([
                'message' => 'Conflicto: Esta cédula pertenece a un Usuario del sistema.'
            ], 422);
        }

        $data = $request->all();
        if ($request->has('nombres')) {
            $data['nombres'] = mb_convert_case($request->nombres, MB_CASE_TITLE, "UTF-8");
        }
        if ($request->has('apellidos')) {
            $data['apellidos'] = mb_convert_case($request->apellidos, MB_CASE_TITLE, "UTF-8");
        }

        $estudiante->update($data);
        return response()->json($estudiante);
    }

    public function destroy($id)
    {
        Estudiante::destroy($id);
        return response()->json(['message' => 'Eliminado']);
    }

    // --- 3. IMPORTACIÓN MASIVA CORREGIDA ---
    public function import(Request $request)
    {
        $request->validate(['file' => 'required|file']);
        $file = $request->file('file');
        
        $contenido = file_get_contents($file->getRealPath());
        $lines = preg_split("/\r\n|\n|\r/", $contenido);
        // Detección automática de separador
        $separador = str_contains($lines[0] ?? '', ';') ? ';' : ',';

        $creados = 0;
        $errores = [];

        foreach ($lines as $index => $linea) {
            if (trim($linea) === '') continue;
            $row = str_getcsv($linea, $separador);
            
            // Validaciones básicas de fila
            if (count($row) < 5) continue; 
            if (strtolower(trim($row[0])) === 'cedula') continue; 

            $cedula = trim($row[0]);
            
            // Validar existencia previa
            if (Estudiante::where('cedula', $cedula)->exists()) {
                $errores[] = "Fila ".($index+1).": $cedula omitido (ya existe).";
                continue; 
            }

            if (User::where('cedula', $cedula)->exists()) {
                $errores[] = "Fila ".($index+1).": $cedula omitido (es Personal Admin).";
                continue;
            }

            try {
                Estudiante::create([
                    'cedula'    => $cedula,
                    'nombres'   => mb_convert_case(trim($row[1]), MB_CASE_TITLE, "UTF-8"),
                    'apellidos' => mb_convert_case(trim($row[2]), MB_CASE_TITLE, "UTF-8"),
                    'email'     => strtolower(trim($row[3])),
                    'carrera'   => trim($row[4] ?? 'SOFTWARE'),
                    'estado'    => 'Activo'
                ]);
                $creados++;
            } catch (\Exception $e) {
                $errores[] = "Fila ".($index+1).": Error BD al guardar.";
            }
        }

        // [CORRECCIÓN CLAVE] Devolver las variables por separado para el Frontend
        return response()->json([
            'message' => "Proceso terminado.",
            'creados' => $creados,       // <--- Variable que busca el Frontend
            'actualizados' => 0,         // <--- Enviamos 0 para evitar 'undefined'
            'errores' => $errores
        ]);
    }

    public function buscar(Request $request)
    {
        $search = $request->input('query');
        $carrera = $request->input('carrera');

        $estudiantes = Estudiante::query()
            ->when($carrera, function($q) use ($carrera) {
                return $q->where('carrera', $carrera);
            })
            ->where(function($q) use ($search) {
                $q->where('nombres', 'LIKE', "%{$search}%")
                  ->orWhere('apellidos', 'LIKE', "%{$search}%")
                  ->orWhere('cedula', 'LIKE', "%{$search}%");
            })
            ->limit(10)
            ->get();

        return response()->json($estudiantes);
    }
}