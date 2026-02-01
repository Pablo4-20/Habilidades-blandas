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
        'paralelo', 
        'parcial',
        'periodo_academico',
        'observaciones'
    ];

    public function asignatura() { return $this->belongsTo(Asignatura::class, 'asignatura_id'); }
    public function docente() { return $this->belongsTo(User::class, 'docente_id'); }
    public function detalles() { return $this->hasMany(DetallePlanificacion::class, 'planificacion_id'); }
    public function evaluaciones() { return $this->hasMany(Evaluacion::class, 'planificacion_id'); }
    public function reporte() { return $this->hasOne(Reporte::class, 'planificacion_id'); }
}