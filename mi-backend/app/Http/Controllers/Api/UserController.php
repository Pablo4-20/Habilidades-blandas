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
use App\Notifications\CredencialesVerificacion; 

class UserController extends Controller
{
    public function index()
    {
        return User::with('carrera')->orderBy('id', 'desc')->get();
    }

    public function store(Request $request)
    {
        // 1. CONDICIONAR LA REGLA DE LA CÉDULA
        $reglasCedula = ['required', 'unique:users,cedula'];
        
        // Solo exigimos la validación matemática si es docente
        if ($request->rol === 'docente') {
            $reglasCedula[] = new ValidaCedula;
        }

        $request->validate([
            'cedula'    => $reglasCedula,
            'nombres'   => 'required|string',   
            'apellidos' => 'required|string', 
            'email'     => ['required', 'email','unique:users,email','regex:/^.+@(ueb\.edu\.ec|mailes\.ueb\.edu\.ec)$/i'],
            'rol'       => 'required|in:admin,coordinador,docente,estudiante',
            'carrera_id'=> 'nullable|exists:carreras,id' 
        ]);

        if (Estudiante::where('cedula', $request->cedula)->exists()) {
            return response()->json(['message' => 'Esta cédula ya pertenece a un Estudiante.'], 422);
        }

        $carreraId = ($request->rol === 'coordinador') ? $request->carrera_id : null;
        $rawPassword = $request->password ?? 'password'; 

        $user = User::create([
            'cedula'    => $request->cedula,
            'nombres'   => mb_convert_case($request->nombres, MB_CASE_TITLE, "UTF-8"), 
            'apellidos' => mb_convert_case($request->apellidos, MB_CASE_TITLE, "UTF-8"),
            'email'     => $request->email,
            'password'  => Hash::make($rawPassword), 
            'rol'       => $request->rol,
            'carrera_id'=> $carreraId,
            'must_change_password' => true
        ]);

        try {
            // Intenta enviar el correo
            $user->notify(new CredencialesVerificacion($rawPassword));
            return response()->json(['message' => 'Usuario creado y correo enviado con éxito', 'user' => $user]);
        } catch (\Exception $e) {
            // Si el correo falla, igual responde con éxito porque el usuario SÍ se creó
            return response()->json([
                'message' => 'Usuario creado exitosamente, PERO no se pudo enviar el correo de credenciales. Revisa la configuración de Gmail.', 
                'user' => $user
            ]);
        }
    }

    public function destroy($id)
    {
        if (auth()->id() == $id) return response()->json(['message' => 'No puedes eliminarte.'], 403);
        $user = User::findOrFail($id);
        $user->delete();
        return response()->json(['message' => 'Eliminado']);
    }

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

        $creados = 0;       
        $actualizados = 0;
        $errores = [];

        foreach ($data as $index => $row) {
            if (empty($row) || count($row) < 6) continue;

            try {
                $cedulaCSV   = trim($row[0]);
                $cedulaFinal = str_pad($cedulaCSV, 10, '0', STR_PAD_LEFT);
                
                if (Estudiante::where('cedula', $cedulaFinal)->exists()) {
                    $errores[] = "Fila " . ($index + 1) . ": Cédula registrada como estudiante.";
                    continue;
                }

                $nombresFinal   = mb_convert_case(trim($row[1]), MB_CASE_TITLE, "UTF-8");
                $apellidosFinal = mb_convert_case(trim($row[2]), MB_CASE_TITLE, "UTF-8");
                $emailFinal     = strtolower(trim($row[3]));
                $rolFinal       = strtolower(trim($row[5])); 
                $nombreCarrera  = isset($row[6]) ? mb_strtoupper(trim($row[6]), 'UTF-8') : null;
                $carreraId      = null;

                if (!preg_match('/^.+@(ueb\.edu\.ec|mailes\.ueb\.edu\.ec)$/i', $emailFinal)) {
                    $errores[] = "Fila " . ($index + 1) . ": Correo no institucional.";
                    continue;
                }

                if ($rolFinal === 'coordinador' && $nombreCarrera) {
                    $carreraObj = Carrera::where('nombre', $nombreCarrera)->first();
                    if ($carreraObj) $carreraId = $carreraObj->id;
                }

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
                    'password'  => bcrypt($rawPassword), 
                    'rol'       => $rolFinal,
                    'carrera_id'=> $carreraId, 
                    'must_change_password' => true
                ];

                if ($usuario) {
                    $usuario->update($datosUsuario);
                    $actualizados++;
                } else {
                    $nuevoUsuario = User::create($datosUsuario);
                    $nuevoUsuario->notify(new CredencialesVerificacion($rawPassword));
                    $creados++;
                }

            } catch (\Exception $e) {
                $errores[] = "Fila " . ($index + 1) . ": " . $e->getMessage();
            }
        }

        return response()->json([
            'message' => "Proceso completado.",
            'creados' => $creados,
            'actualizados' => $actualizados,
            'errores' => $errores
        ]);
    }
    
    public function update(Request $request, string $id)
    {
        $user = User::findOrFail($id);
        
        // 2. CONDICIONAR LA REGLA EN EL UPDATE TAMBIÉN
        $reglasCedula = ['required', Rule::unique('users', 'cedula')->ignore($user->id)];
        if ($request->rol === 'docente') {
            $reglasCedula[] = new ValidaCedula;
        }

        $request->validate([
            'cedula'    => $reglasCedula,
            'nombres'   => 'required|string',
            'apellidos' => 'required|string',
            'email'     => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id), 'regex:/^.+@(ueb\.edu\.ec|mailes\.ueb\.edu\.ec)$/i'],
            'rol'       => 'required',
            'carrera_id'=> 'nullable|exists:carreras,id'
        ]);

        $data = $request->except(['password']);
        if ($request->filled('nombres')) $data['nombres'] = mb_convert_case($request->nombres, MB_CASE_TITLE, "UTF-8");
        if ($request->filled('apellidos')) $data['apellidos'] = mb_convert_case($request->apellidos, MB_CASE_TITLE, "UTF-8");
        if ($request->filled('password')) $data['password'] = Hash::make($request->password);
        
        $data['carrera_id'] = ($request->rol === 'coordinador') ? $request->carrera_id : null;

        $user->update($data);
        return response()->json($user);
    }
}