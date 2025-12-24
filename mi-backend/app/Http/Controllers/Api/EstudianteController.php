<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use App\Models\User;
use Illuminate\Http\Request;

class EstudianteController extends Controller
{
    public function index()
    {
        return Estudiante::all();
    }

    public function store(Request $request)
    {
        $request->validate([
            'cedula' => ['required', 'unique:users,cedula', new ValidaCedula],
            'nombres' => 'required',
            'apellidos' => 'required',
            'email' => 'required|email|unique:estudiantes,email',
            'carrera' => 'required',
            'ciclo_actual' => 'required'
        ]);
        if (User::where('cedula', $request->cedula)->exists()) {
            return response()->json([
                'message' => 'Esta cédula ya está registrada como Personal Administrativo/Docente.'
            ], 422);
        }
        $estudiante = Estudiante::create($request->all());
        return response()->json($estudiante, 201);
    }

    public function update(Request $request, $id)
    {
        $estudiante = Estudiante::findOrFail($id);
        
        $request->validate([
           'cedula' => ['required', 'unique:users,cedula', new ValidaCedula],
            'email' => 'required|email|unique:estudiantes,email,' . $id,
        ]);

        $estudiante->update($request->all());
        return response()->json($estudiante);
    }

    public function destroy($id)
    {
        Estudiante::destroy($id);
        return response()->json(['message' => 'Eliminado']);
    }

    // --- CARGA MASIVA ROBUSTA ---
public function import(Request $request)
    {
        $request->validate(['file' => 'required|file']);
        $file = $request->file('file');
        
        $contenido = file_get_contents($file->getRealPath());
        $primerLinea = explode(PHP_EOL, $contenido)[0] ?? '';
        $separador = str_contains($primerLinea, ';') ? ';' : ',';

        $data = array_map(function($linea) use ($separador) {
            return str_getcsv($linea, $separador);
        }, file($file->getRealPath()));

        // MANTENER array_shift SI TU CSV TIENE ENCABEZADOS
        array_shift($data); 

        $count = 0;
        $actualizados = 0;

        foreach ($data as $index => $row) {
            if (empty($row) || count($row) < 5) continue;

            try {
                // --- 1. NORMALIZACIÓN DE DATOS ---
                
                // Cédula: Rellenar con ceros
                $cedulaCSV = trim($row[0]);
                $cedulaFinal = str_pad($cedulaCSV, 10, '0', STR_PAD_LEFT);

                if (User::where('cedula', $cedulaFinal)->exists()) {
                    throw new \Exception("La cédula $cedulaFinal ya pertenece a un Docente/Administrativo.");
                }
                
                // Nombres/Apellidos: Primera letra mayúscula (Formato Título)
                // MB_CASE_TITLE es mejor que ucfirst porque maneja tildes (Á, É, Ñ)
                $nombresFinal   = mb_convert_case(trim($row[1]), MB_CASE_TITLE, "UTF-8");
                $apellidosFinal = mb_convert_case(trim($row[2]), MB_CASE_TITLE, "UTF-8");
                
                // Email: Siempre minúsculas
                $emailFinal = strtolower(trim($row[3]));

                // Carrera: Estandarización estricta
                $carreraRaw = trim($row[4]);
                $carreraFinal = 'Software'; 
                if (preg_match('/ti|tecnolog|t\.i/i', $carreraRaw)) {
                    $carreraFinal = 'TI';
                }

                // Ciclo: Mayúsculas (ej: "vi" -> "VI")
                $cicloFinal = strtoupper(trim($row[5]));


                // --- 2. BÚSQUEDA ---
                $estudiante = Estudiante::where('cedula', $cedulaFinal)
                                        ->orWhere('cedula', $cedulaCSV)
                                        ->orWhere('email', $emailFinal)
                                        ->first();

                // --- 3. GUARDADO ---
                $datosLimpios = [
                    'cedula'       => $cedulaFinal,
                    'nombres'      => $nombresFinal,
                    'apellidos'    => $apellidosFinal,
                    'email'        => $emailFinal,
                    'carrera'      => $carreraFinal,
                    'ciclo_actual' => $cicloFinal
                ];

                if ($estudiante) {
                    $estudiante->update($datosLimpios);
                    $actualizados++;
                } else {
                    Estudiante::create($datosLimpios);
                    $count++;
                }

            } catch (\Exception $e) {
                return response()->json([
                    'message' => "Error Fila " . ($index + 1) . ": " . $e->getMessage()
                ], 500);
            }
        }

        return response()->json([
            'message' => "Proceso completado: $count nuevos, $actualizados actualizados con formato corregido."
        ]);
    }
}