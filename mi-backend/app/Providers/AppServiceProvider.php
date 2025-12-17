<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
// 👇 IMPORTANTE: Agrega estos dos imports
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // 👇 Personalización del correo de verificación
        VerifyEmail::toMailUsing(function (object $notifiable, string $url) {
            return (new MailMessage)
                ->subject('Verificación de Cuenta - UEB') // Asunto del correo
                ->greeting('¡Hola ' . $notifiable->nombres . '!') // Saludo con el nombre del usuario
                ->line('Has sido registrado en el Sistema de Habilidades Blandas.')
                ->line('Por favor, haz clic en el botón de abajo para activar tu cuenta y establecer tu contraseña si es necesario.')
                ->action('Verificar mi Correo', $url) // Texto del botón y enlace
                ->line('Si no creaste esta cuenta, ninguna acción es requerida.')
                ->salutation('Saludos, El Equipo de Administración');
        });
    }
}