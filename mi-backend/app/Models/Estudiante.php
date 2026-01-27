<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\Notifiable;

class Estudiante extends Model
{
    use HasFactory, Notifiable;
    
    protected $fillable = [
        'cedula',
        'nombres',
        'apellidos',
        'email', 
        'carrera',
        
        // 'email_verified_at' // Eliminado
    ];

    // Se eliminó la función casts(), hasVerifiedEmail(), markEmailAsVerified(), etc.

    public function matriculas()
    {
        return $this->hasMany(Matricula::class);
    }

    public function ultimaMatricula()
    {
        return $this->hasOne(Matricula::class)->latestOfMany();
    }
    
    public function usuario()
    {
        return $this->belongsTo(User::class, 'user_id'); 
    }
}