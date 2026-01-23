<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Reporte extends Model
{
    use HasFactory;

    protected $fillable = [
        'planificacion_id',
        'habilidad_blanda_id',
        'conclusion_progreso',
        'fecha_generacion'
    ];
}