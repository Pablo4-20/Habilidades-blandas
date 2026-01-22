<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens; 

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable; 

    protected $fillable = [
        'cedula',
        'nombres',   
        'apellidos',
        'email',
        'password',
        'rol',
        'must_change_password',
        'carrera_id', // <--- NUEVO CAMPO AGREGADO
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    // --- RELACIÓN NUEVA ---
    // Un usuario (coordinador) puede pertenecer a una carrera
    public function carrera()
    {
        return $this->belongsTo(Carrera::class, 'carrera_id');
    }
}