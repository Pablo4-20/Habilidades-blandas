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
        // Traemos la carrera y las relaciones de matrícula
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
            'email' => 'required|email|unique:estudiantes',
            'carrera' => 'required|string' // Se guarda la carrera seleccionada
        ]);

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
            'email' => ['required', 'email', Rule::unique('estudiantes')->ignore($id)],
            'carrera' => 'required|string'
        ]);

        if (User::where('cedula', $request->cedula)->where('id', '!=', $id)->exists()) {
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

    // --- IMPORTACIÓN MASIVA ACTUALIZADA PARA GUARDAR CARRERA ---
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
            
            if (count($row) < 5) continue; // Ahora validamos 5 columnas (Cédula, Nombres, Apellidos, Email, Carrera)
            if (strtolower(trim($row[0])) === 'cedula') continue; 

            $cedula = trim($row[0]);
            
            if (Estudiante::where('cedula', $cedula)->exists()) {
                $errores[] = "Fila ".($index+1).": $cedula ya es estudiante.";
                continue; 
            }

            if (User::where('cedula', $cedula)->exists()) {
                $errores[] = "Fila ".($index+1).": $cedula ya existe como Personal.";
                continue;
            }

            try {
                Estudiante::create([
                    'cedula' => $cedula,
                    'nombres' => mb_convert_case(trim($row[1]), MB_CASE_TITLE, "UTF-8"),
                    'apellidos' => mb_convert_case(trim($row[2]), MB_CASE_TITLE, "UTF-8"),
                    'email' => strtolower(trim($row[3])),
                    'carrera' => trim($row[4] ?? 'SOFTWARE'), // <--- LEE LA QUINTA COLUMNA
                    'estado' => 'Activo'
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

    // --- BUSCADOR PARA EL DOCENTE (FILTRO POR CARRERA, NOMBRE O CEDULA) ---
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