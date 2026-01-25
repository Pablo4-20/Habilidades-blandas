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

    // ==========================================
    // RELACIONES (Esto es lo que faltaba)
    // ==========================================
    
    /**
     * Un reporte pertenece a una planificación específica.
     */
    public function planificacion()
    {
        return $this->belongsTo(Planificacion::class, 'planificacion_id');
    }

    /**
     * Opcional: Si quieres acceder a la habilidad directamente desde el reporte
     */
    public function habilidad()
    {
        return $this->belongsTo(HabilidadBlanda::class, 'habilidad_blanda_id');
    }
}