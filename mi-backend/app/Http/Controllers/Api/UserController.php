<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Estudiante;
use App\Models\Carrera; 
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use App\Rules\ValidaCedula;
// Importamos la notificación personalizada
use App\Notifications\CredencialesVerificacion; 

class UserController extends Controller
{
    public function index()
    {
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
            'carrera_id'=> 'nullable|exists:carreras,id' 
        ], [
            'email.regex' => 'El correo debe pertenecer al dominio ueb.edu.ec o mailes.ueb.edu.ec'
        ]);

        if (Estudiante::where('cedula', $request->cedula)->exists()) {
            return response()->json(['message' => 'Esta cédula ya pertenece a un Estudiante.'], 422);
        }

        $carreraId = ($request->rol === 'coordinador') ? $request->carrera_id : null;
        
        // 1. Capturamos la contraseña PLANA antes de encriptar
        $rawPassword = $request->password ?? 'password'; 

        $user = User::create([
            'cedula'    => $request->cedula,
            'nombres'   => mb_convert_case($request->nombres, MB_CASE_TITLE, "UTF-8"), 
            'apellidos' => mb_convert_case($request->apellidos, MB_CASE_TITLE, "UTF-8"),
            'email'     => $request->email,
            'password'  => Hash::make($rawPassword), // Aquí se guarda encriptada
            'rol'       => $request->rol,
            'carrera_id'=> $carreraId,
            'must_change_password' => true
        ]);

        // 2. Enviamos la notificación personalizada con la clave plana
        // NOTA: Quitamos 'event(new Registered($user))' para que no envíe doble correo
        $user->notify(new CredencialesVerificacion($rawPassword));

        return response()->json(['message' => 'Usuario creado y credenciales enviadas', 'user' => $user]);
    }

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
                // ... (Lógica de normalización igual que antes) ...
                $cedulaCSV   = trim($row[0]);
                $cedulaFinal = str_pad($cedulaCSV, 10, '0', STR_PAD_LEFT);
                
                if (Estudiante::where('cedula', $cedulaFinal)->exists()) {
                    throw new \Exception("La cédula $cedulaFinal ya está registrada como Estudiante.");
                }

                $nombresFinal   = mb_convert_case(trim($row[1]), MB_CASE_TITLE, "UTF-8");
                $apellidosFinal = mb_convert_case(trim($row[2]), MB_CASE_TITLE, "UTF-8");
                $emailFinal     = strtolower(trim($row[3]));
                $rolFinal       = strtolower(trim($row[5])); 
                $nombreCarrera  = isset($row[6]) ? trim($row[6]) : null;
                $carreraId      = null;

                if (!preg_match('/^.+@(ueb\.edu\.ec|mailes\.ueb\.edu\.ec)$/i', $emailFinal)) {
                    throw new \Exception("El correo $emailFinal no es institucional.");
                }

                if ($rolFinal === 'coordinador' && $nombreCarrera) {
                    $carreraObj = Carrera::where('nombre', $nombreCarrera)->first();
                    if ($carreraObj) $carreraId = $carreraObj->id;
                }

                // Capturamos la contraseña del CSV
                $rawPassword = trim($row[4]);

                $usuario = User::where('cedula', $cedulaFinal)
                               ->orWhere('cedula', $cedulaCSV)
                               ->orWhere('email', $emailFinal)
                               ->first();

                $datosUsuario = [
                    'cedula'    => $cedulaFinal,
                    'nombres'   => $nombresFinal,
                    'apellidos' => $apellidosFinal,
                    'email'     => $emailFinal,
                    'password'  => bcrypt($rawPassword), // Encriptada para DB
                    'rol'       => $rolFinal,
                    'carrera_id'=> $carreraId, 
                    'must_change_password' => true
                ];

                if ($usuario) {
                    $usuario->update($datosUsuario);
                    // Opcional: ¿Quieres reenviar credenciales al actualizar? 
                    // Si sí, descomenta la siguiente línea:
                    // $usuario->notify(new CredencialesVerificacion($rawPassword));
                    $actualizados++;
                } else {
                    $nuevoUsuario = User::create($datosUsuario);
                    
                    // ENVÍO DE CORREO con la contraseña del CSV
                    $nuevoUsuario->notify(new CredencialesVerificacion($rawPassword));
                    
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
    
    // 4. Actualizar usuario (Se mantiene igual)
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
        
        if ($request->filled('nombres')) {
            $data['nombres'] = mb_convert_case($request->nombres, MB_CASE_TITLE, "UTF-8");
        }
        if ($request->filled('apellidos')) {
            $data['apellidos'] = mb_convert_case($request->apellidos, MB_CASE_TITLE, "UTF-8");
        }

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
            // Si quieres que al cambiar clave manualmente también le llegue correo, 
            // agrégalo aquí usando $request->password
        }

        if ($request->rol === 'coordinador') {
            $data['carrera_id'] = $request->carrera_id;
        } else {
            $data['carrera_id'] = null;
        }

        $user->update($data);
        return response()->json($user);
    }
}