<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Estudiante extends Model
{
    use HasFactory;

    
    protected $fillable = [
        'cedula',
        'nombres',
        'apellidos',
        'email', 
        'carrera',
        'ciclo_actual',
    ];
}