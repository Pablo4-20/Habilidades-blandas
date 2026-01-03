<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Evaluacion extends Model
{
    use HasFactory;

    protected $table = 'evaluaciones';

    protected $fillable = [
        'planificacion_id',
        'estudiante_id',
        'habilidad_blanda_id', 
        'nivel',
        //'fecha_evaluacion'
    ];

    // Relaciones
    public function planificacion()
    {
        return $this->belongsTo(Planificacion::class);
    }

    public function estudiante()
    {
        return $this->belongsTo(Estudiante::class);
    }
    
    public function habilidad()
    {
        return $this->belongsTo(HabilidadBlanda::class, 'habilidad_blanda_id');
    }
}