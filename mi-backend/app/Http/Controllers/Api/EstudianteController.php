<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use App\Models\User;
use Illuminate\Http\Request;
use App\Rules\ValidaCedula;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB; 

class EstudianteController extends Controller
{
    public function index()
    {
        $estudiantes = Estudiante::with(['usuario', 'ultimaMatricula.ciclo', 'ultimaMatricula.periodo'])
            ->get()
            ->map(function ($estudiante) {
                
                $mat = $estudiante->ultimaMatricula;

                return [
                    'id'        => $estudiante->id,
                    'cedula'    => $estudiante->cedula,
                    'nombres'   => $estudiante->apellidos . ' ' . $estudiante->nombres,
                    'email'     => $estudiante->email ?? 'S/N',
                    'periodo'   => $mat ? $mat->periodo->nombre : '-',
                    'ciclo'     => $mat ? $mat->ciclo->nombre : 'Sin Matrícula',
                    'estado'    => $mat ? $mat->estado : 'Inactivo',
                    'carrera'   => $estudiante->carrera ?? 'Software' 
                ];
            });

        return response()->json($estudiantes);
    }

    public function update(Request $request, $id)
    {
        $estudiante = Estudiante::findOrFail($id);
        
        $request->validate([
           'cedula' => ['required', 'unique:users,cedula', new ValidaCedula],
           'email' => ['required', 'email', Rule::unique('estudiantes', 'email')->ignore($id)],
        ]);

        $estudiante->update($request->all());
        return response()->json($estudiante);
    }

    public function destroy($id)
    {
        Estudiante::destroy($id);
        return response()->json(['message' => 'Eliminado']);
    }

    // --- CARGA MASIVA SIMPLIFICADA (SOLO DATOS PERSONALES) ---
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

        // Omitimos la cabecera
        array_shift($data); 

        $nuevos = 0;
        $actualizados = 0;

        foreach ($data as $index => $row) {
            // Validamos que tenga al menos las 4 columnas básicas (Cédula, Nombres, Apellidos, Email)
            if (empty($row) || count($row) < 4) continue;

            try {
                // 1. LIMPIEZA DE DATOS
                $cedulaCSV = trim($row[0]);
                $cedulaFinal = str_pad($cedulaCSV, 10, '0', STR_PAD_LEFT);

                // Evitar conflicto si la cédula ya es de un administrativo
                if (User::where('cedula', $cedulaFinal)->exists()) {
                    continue; 
                }
                
                $nombresFinal   = mb_convert_case(trim($row[1]), MB_CASE_TITLE, "UTF-8");
                $apellidosFinal = mb_convert_case(trim($row[2]), MB_CASE_TITLE, "UTF-8");
                $emailFinal     = strtolower(trim($row[3]));
                
                // NOTA: Ya no leemos ni Carrera ni Ciclo del Excel.

                // 2. BUSCAR O CREAR
                $estudiante = Estudiante::where('cedula', $cedulaFinal)
                                        ->orWhere('cedula', $cedulaCSV)
                                        ->orWhere('email', $emailFinal)
                                        ->first();

                $datosEstudiante = [
                    'cedula'    => $cedulaFinal,
                    'nombres'   => $nombresFinal,
                    'apellidos' => $apellidosFinal,
                    'email'     => $emailFinal,
                    // Si tu base de datos exige el campo carrera, pon un default, 
                    // si es nullable, puedes borrar esta línea.
                    'carrera'   => 'Software' 
                ];

                if ($estudiante) {
                    $estudiante->update($datosEstudiante);
                    $actualizados++;
                } else {
                    $nuevoEstudiante = Estudiante::create($datosEstudiante);
                    // $nuevoEstudiante->sendEmailVerificationNotification(); // Opcional
                    $nuevos++;
                }

            } catch (\Exception $e) {
                return response()->json([
                    'message' => "Error en la fila " . ($index + 1) . ": " . $e->getMessage()
                ], 500);
            }
        }

        return response()->json([
            'message' => "Carga exitosa.\n" .
                         "Nuevos registrados: $nuevos\n" .
                         "Datos actualizados: $actualizados"
        ]);
    }
}