<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Auth\Events\Verified;

class VerificationController extends Controller
{
    public function verify(Request $request, $id)
    {
        // 1. Encontrar usuario
        $user = User::findOrFail($id);

        // 2. Verificar firma del enlace
        if (!$request->hasValidSignature()) {
            

            return redirect(env('FRONTEND_URL') . '/login?error=invalid_link');
        }

        // 3. Verificar correo
        if (!$user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
        }

        
        return redirect(env('FRONTEND_URL') . '/login?verified=true');
    } 

    public function resend(Request $request)
    {
        if ($request->user()->hasVerifiedEmail()) {
            return response()->json(['message' => 'El correo ya está verificado.'], 400);
        }

        $request->user()->sendEmailVerificationNotification();

        return response()->json(['message' => 'Enlace de verificación reenviado.']);
    }
}