<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DetalleMatricula extends Model
{
    protected $fillable = ['matricula_id', 'asignatura_id', 'estado_materia', 'nota_final'];

    public function asignatura() { return $this->belongsTo(Asignatura::class); }
}