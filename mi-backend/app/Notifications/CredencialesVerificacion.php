<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;

class CredencialesVerificacion extends VerifyEmail
{
    public $password_no_encriptada;

    // Recibimos la clave plana en el constructor
    public function __construct($password)
    {
        $this->password_no_encriptada = $password;
    }

    public function toMail($notifiable)
    {
        // Generamos la URL de verificación oficial de Laravel
        $verificationUrl = $this->verificationUrl($notifiable);

        return (new MailMessage)
            ->subject('Bienvenido - Verifica tu cuenta y Credenciales')
            ->greeting('¡Hola ' . $notifiable->nombres . '!')
            ->line('Tu cuenta ha sido creada exitosamente.')
            ->line('A continuación tus credenciales de acceso:')
            ->line('--------------------------------------------------')
            ->line('Correo: ' . $notifiable->email)
            ->line('Contraseña temporal: ' . $this->password_no_encriptada)
            ->line('--------------------------------------------------')
            ->line('Por favor, haz clic en el botón de abajo para verificar tu dirección de correo electrónico.')
            ->action('Verificar Dirección de Correo', $verificationUrl)
            ->line('Si no creaste esta cuenta, no se requiere ninguna otra acción.');
    }
}