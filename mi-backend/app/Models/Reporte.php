<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Reporte extends Model
{
    use HasFactory;

    protected $table = 'reportes';

    protected $fillable = [
        'planificacion_id',
        'habilidad_blanda_id',
        'conclusion_progreso',     // Lo que llena el docente
        'observacion_coordinador', // <--- ¡IMPORTANTE! Agregar este campo
        'fecha_generacion'
    ];

    public function planificacion()
    {
        return $this->belongsTo(Planificacion::class);
    }

    public function habilidad()
    {
        return $this->belongsTo(HabilidadBlanda::class, 'habilidad_blanda_id');
    }
}