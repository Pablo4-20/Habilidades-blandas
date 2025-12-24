<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Asignatura extends Model
{
    use HasFactory;

    protected $fillable = [
        'nombre',
        'carrera_id',
        'ciclo_id',
        'unidad_curricular_id',
    ];

    public function carrera()
    {
        return $this->belongsTo(Carrera::class);
    }

    public function ciclo()
    {
        return $this->belongsTo(Ciclo::class);
    }

    public function unidadCurricular()
    {
        return $this->belongsTo(UnidadCurricular::class);
    }

    // Relaciones existentes (déjalas si las usas)
    public function asignaciones()
    {
        return $this->hasMany(Asignacion::class);
    }
}