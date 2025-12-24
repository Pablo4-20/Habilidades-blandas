<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    
    public function register(): void
    {
        
    }

   
    public function boot(): void
    {

        VerifyEmail::createUrlUsing(function ($notifiable) {
            return URL::temporarySignedRoute(
                'verification.verify',
                Carbon::now()->addDays(30), 
                [
                    'id' => $notifiable->getKey(),
                    'hash' => sha1($notifiable->getEmailForVerification()),
                ]
            );
        });

       
        VerifyEmail::toMailUsing(function (object $notifiable, string $url) {
            return (new MailMessage)
                ->subject('Verificación de Cuenta - UEB') 
                ->greeting('¡Hola ' . $notifiable->nombres . '!') 
                ->line('Has sido registrado en el Sistema de Habilidades Blandas.')
                ->line('Por favor, haz clic en el botón de abajo para activar tu cuenta.')
                ->line('Tienes 30 días para realizar esta activación.') 
                ->action('Verificar mi Correo', $url) 
                ->line('Si no creaste esta cuenta, ninguna acción es requerida.')
                ->salutation('Saludos, El Equipo de Administración');
        });
    }
}