<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Planificacion extends Model
{
    use HasFactory;

    protected $table = 'planificaciones';

    protected $fillable = [
        'asignatura_id',
        'docente_id',
        'parcial',
        'periodo_academico',
        // 'observaciones', // Descomenta solo si agregaste la columna observaciones
    ];

    // ✅ RELACIÓN CON ASIGNATURA
    public function asignatura()
    {
        return $this->belongsTo(Asignatura::class, 'asignatura_id');
    }

    // ✅ RELACIÓN CON DOCENTE (Usuario)
    public function docente()
    {
        return $this->belongsTo(User::class, 'docente_id');
    }

    // ❌ ELIMINADO: public function habilidad()
    // Motivo: Ahora una planificación tiene MUCHAS habilidades, no una sola.
    // Usamos la relación 'detalles' para acceder a ellas.

    // ✅ RELACIÓN CON DETALLES (Aquí están las habilidades y actividades)
    public function detalles()
    {
        return $this->hasMany(DetallePlanificacion::class, 'planificacion_id');
    }

    // ✅ RELACIÓN CON EVALUACIONES
    public function evaluaciones()
    {
        return $this->hasMany(Evaluacion::class, 'planificacion_id');
    }

    // ✅ RELACIÓN CON REPORTE
    public function reporte()
    {
        return $this->hasOne(Reporte::class, 'planificacion_id');
    }
}