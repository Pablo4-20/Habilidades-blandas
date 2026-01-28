<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DetallePlanificacion extends Model
{
    use HasFactory;

    protected $table = 'detalle_planificaciones';

    protected $fillable = [
        'planificacion_id',
        'habilidad_blanda_id',
        'actividades',
        'resultado_aprendizaje'
    ];

    // --- ESTA ES LA RELACIÓN QUE FALTABA ---
    public function habilidad()
    {
        return $this->belongsTo(HabilidadBlanda::class, 'habilidad_blanda_id');
    }

    // Relación inversa con Planificación (opcional pero recomendada)
    public function planificacion()
    {
        return $this->belongsTo(Planificacion::class, 'planificacion_id');
    }
}