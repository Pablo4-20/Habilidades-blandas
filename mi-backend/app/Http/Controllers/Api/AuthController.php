<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
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
        
        // 2.  Validar Verificación de Correo
        if ($user->email_verified_at === null) {
            return response()->json([
                'message' => 'Tu cuenta no ha sido verificada. Por favor revisa tu correo y activa tu cuenta.'
            ], 403); 
        }
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Bienvenido ' . $user->nombres, 
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
            'require_password_change' => (bool) $user->must_change_password
        ]);
    }

    // Para el primer inicio de sesión obligatorio
    public function changeInitialPassword(Request $request)
    {
        $request->validate([
            'password' => 'required|min:8|confirmed',
        ]);

        $user = $request->user();

        $user->update([
            'password' => Hash::make($request->password),
            'must_change_password' => false 
        ]);

        return response()->json(['message' => 'Contraseña actualizada correctamente.']);
    }

    // --- NUEVO MÉTODO: Para el cambio de contraseña desde la configuración ---
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|min:8|confirmed',
        ]);

        $user = $request->user();

        // 1. Verificamos que la contraseña actual ingresada sea la correcta
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'La contraseña actual no coincide con nuestros registros.'
            ], 400); 
        }

        // 2. Si es correcta, guardamos la nueva
        $user->update([
            'password' => Hash::make($request->new_password)
        ]);

        return response()->json(['message' => 'Contraseña actualizada correctamente.']);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Sesión cerrada correctamente']);
    }
}