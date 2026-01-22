<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Estudiante;
use App\Models\Carrera; // Importante para validar carrera
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Auth\Events\Registered;
use Illuminate\Validation\Rule;
use App\Rules\ValidaCedula;

class UserController extends Controller
{
    // 1. Listar todos los usuarios
    public function index()
    {
        // Traemos también la relación 'carrera' para mostrarla en el frontend si es necesario
        return User::with('carrera')->orderBy('id', 'desc')->get();
    }

    // 2. Crear un nuevo usuario manualmente
    public function store(Request $request)
    {
        $request->validate([
            'cedula'    => ['required', 'unique:users,cedula', new ValidaCedula],
            'nombres'   => 'required|string',   
            'apellidos' => 'required|string', 
            'email'     => ['required', 'email','unique:users,email','regex:/^.+@(ueb\.edu\.ec|mailes\.ueb\.edu\.ec)$/i'],
            'rol'       => 'required|in:admin,coordinador,docente,estudiante',
            // Validamos carrera_id solo si viene en el request
            'carrera_id'=> 'nullable|exists:carreras,id' 
        ], [
            'email.regex' => 'El correo debe pertenecer al dominio ueb.edu.ec o mailes.ueb.edu.ec'
        ]);

        if (Estudiante::where('cedula', $request->cedula)->exists()) {
            return response()->json([
                'message' => 'Esta cédula ya pertenece a un Estudiante.'
            ], 422);
        }

        // Determinar carrera_id: Solo se guarda si es coordinador
        $carreraId = ($request->rol === 'coordinador') ? $request->carrera_id : null;

        $user = User::create([
            'cedula'    => $request->cedula,
            'nombres'   => mb_convert_case($request->nombres, MB_CASE_TITLE, "UTF-8"), 
            'apellidos' => mb_convert_case($request->apellidos, MB_CASE_TITLE, "UTF-8"),
            'email'     => $request->email,
            'password'  => Hash::make($request->password ?? 'password'), 
            'rol'       => $request->rol,
            'carrera_id'=> $carreraId, // <--- GUARDAMOS CARRERA
            'must_change_password' => true
        ]);

        event(new Registered($user));
        return response()->json(['message' => 'Usuario creado correctamente', 'user' => $user]);
    }

    // 3. Eliminar usuario
    public function destroy($id)
    {
        if (auth()->id() == $id) {
            return response()->json(['message' => 'No puedes eliminar tu propia cuenta.'], 403);
        }

        $user = User::findOrFail($id);
        $user->delete();
        
        return response()->json(['message' => 'Usuario eliminado correctamente']);
    }

    // --- CARGA MASIVA INTELIGENTE ---
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

        array_shift($data); 

        $count = 0;
        $actualizados = 0;

        foreach ($data as $index => $row) {
            if (empty($row) || count($row) < 6) continue;

            try {
                // --- 1. NORMALIZACIÓN ---
                $cedulaCSV   = trim($row[0]);
                $cedulaFinal = str_pad($cedulaCSV, 10, '0', STR_PAD_LEFT);
                
                if (Estudiante::where('cedula', $cedulaFinal)->exists()) {
                    throw new \Exception("La cédula $cedulaFinal ya está registrada como Estudiante.");
                }

                $nombresFinal   = mb_convert_case(trim($row[1]), MB_CASE_TITLE, "UTF-8");
                $apellidosFinal = mb_convert_case(trim($row[2]), MB_CASE_TITLE, "UTF-8");
                $emailFinal     = strtolower(trim($row[3]));
                $rolFinal       = strtolower(trim($row[5])); 
                
                // Opcional: Columna 7 podría ser el nombre de la Carrera (Ej: Software)
                $nombreCarrera  = isset($row[6]) ? trim($row[6]) : null;
                $carreraId      = null;

                if (!preg_match('/^.+@(ueb\.edu\.ec|mailes\.ueb\.edu\.ec)$/i', $emailFinal)) {
                    throw new \Exception("El correo $emailFinal no es institucional.");
                }

                // Buscar ID de carrera si es coordinador y viene el dato
                if ($rolFinal === 'coordinador' && $nombreCarrera) {
                    $carreraObj = Carrera::where('nombre', $nombreCarrera)->first();
                    if ($carreraObj) $carreraId = $carreraObj->id;
                }

                // --- 2. BÚSQUEDA ---
                $usuario = User::where('cedula', $cedulaFinal)
                               ->orWhere('cedula', $cedulaCSV)
                               ->orWhere('email', $emailFinal)
                               ->first();

                // --- 3. PREPARAR DATOS ---
                $datosUsuario = [
                    'cedula'    => $cedulaFinal,
                    'nombres'   => $nombresFinal,
                    'apellidos' => $apellidosFinal,
                    'email'     => $emailFinal,
                    'password'  => bcrypt(trim($row[4])), 
                    'rol'       => $rolFinal,
                    'carrera_id'=> $carreraId, // <--- ASIGNACIÓN MASIVA
                    'must_change_password' => true
                ];

                // --- 4. GUARDADO ---
                if ($usuario) {
                    $usuario->update($datosUsuario);
                    $actualizados++;
                } else {
                    $nuevoUsuario = User::create($datosUsuario);
                    event(new Registered($nuevoUsuario));
                    $count++;
                }

            } catch (\Exception $e) {
                return response()->json([
                    'message' => "Error en Fila " . ($index + 1) . ": " . $e->getMessage()
                ], 500);
            }
        }

        return response()->json([
            'message' => "Proceso completado: $count nuevos, $actualizados actualizados."
        ]);
    }
    
    // 4. Actualizar usuario
    public function update(Request $request, string $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'cedula'    => ['required', Rule::unique('users', 'cedula')->ignore($user->id), new ValidaCedula],
            'nombres'   => 'required|string',
            'apellidos' => 'required|string',
            'email'     => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id), 'regex:/^.+@(ueb\.edu\.ec|mailes\.ueb\.edu\.ec)$/i'],
            'rol'       => 'required',
            'carrera_id'=> 'nullable|exists:carreras,id'
        ], [
            'email.regex' => 'El correo debe pertenecer al dominio ueb.edu.ec o mailes.ueb.edu.ec'
        ]);

        $data = $request->except(['password']);
        
        // Normalizar Nombres
        if ($request->filled('nombres')) {
            $data['nombres'] = mb_convert_case($request->nombres, MB_CASE_TITLE, "UTF-8");
        }
        if ($request->filled('apellidos')) {
            $data['apellidos'] = mb_convert_case($request->apellidos, MB_CASE_TITLE, "UTF-8");
        }

        // Actualizar Password si viene
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        // Lógica de Carrera: Solo si es coordinador
        if ($request->rol === 'coordinador') {
            $data['carrera_id'] = $request->carrera_id;
        } else {
            $data['carrera_id'] = null; // Si pasa de Coord a Docente, pierde la carrera
        }

        $user->update($data);
        return response()->json($user);
    }
}