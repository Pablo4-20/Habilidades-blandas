<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\Notifiable;
use Illuminate\Auth\Notifications\VerifyEmail;

class Estudiante extends Model
{
    use HasFactory, Notifiable;

    
    protected $fillable = [
        'cedula',
        'nombres',
        'apellidos',
        'email', 
        'carrera',
        'ciclo_actual',
        'email_verified_at',
    ];
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
        ];
    }
    public function hasVerifiedEmail()
    {
        return ! is_null($this->email_verified_at);
    }

    // 2. Marcar el correo como verificado
    public function markEmailAsVerified()
    {
        return $this->forceFill([
            'email_verified_at' => $this->freshTimestamp(),
        ])->save();
    }

    // 3. Obtener el email para enviar el correo
    public function getEmailForVerification()
    {
        return $this->email;
    }

    // 4. Enviar la notificación de verificación
    public function sendEmailVerificationNotification()
    {
        $this->notify(new VerifyEmail);
    }
    public function matriculas()
    {
        return $this->hasMany(Matricula::class);
    }

    // 2. Relación MÁGICA: Obtener solo la última matrícula (La actual)
    public function ultimaMatricula()
    {
        return $this->hasOne(Matricula::class)->latestOfMany();
    }
    
    // 3. Relación con el Usuario (para sacar nombres)
    public function usuario()
    {
        return $this->belongsTo(User::class, 'user_id'); // Asumiendo que tienes user_id
    }
}