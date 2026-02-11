<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DetalleMatricula extends Model
{
    protected $fillable = ['matricula_id', 'asignatura_id', 'estado_materia', 'nota_final', 'paralelo'];

    // Relación con la asignatura
    public function asignatura() 
    { 
        return $this->belongsTo(Asignatura::class); 
    }

    // 👇 ESTA ES LA FUNCIÓN QUE FALTABA Y CAUSABA EL ERROR
    public function matricula() 
    { 
        return $this->belongsTo(Matricula::class); 
    }
}