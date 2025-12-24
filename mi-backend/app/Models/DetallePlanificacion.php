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
        'actividades'
    ];

    /**
     * Relación con la Planificación (Padre)
     */
    public function planificacion()
    {
        return $this->belongsTo(Planificacion::class);
    }

    /**
     * Relación con la Habilidad Blanda (Catálogo Global)
     * Nombre estándar: habilidadBlanda
     */
    public function habilidadBlanda()
    {
        return $this->belongsTo(HabilidadBlanda::class, 'habilidad_blanda_id');
    }
}