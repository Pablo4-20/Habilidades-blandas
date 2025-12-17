<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json(['message' => 'Credenciales incorrectas'], 401);
        }

        $user = User::where('email', $request->email)->firstOrFail();
// 2. 🔒 NUEVO: Validar Verificación de Correo
        if ($user->email_verified_at === null) {
            return response()->json([
                'message' => 'Tu cuenta no ha sido verificada. Por favor revisa tu correo y activa tu cuenta.'
            ], 403); // 403 = Forbidden (Prohibido)
        }
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            // CORRECCIÓN: Usamos 'nombres' en lugar de 'name'
            'message' => 'Bienvenido ' . $user->nombres, 
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user 
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Sesión cerrada correctamente']);
    }
}