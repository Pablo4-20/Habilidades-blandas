<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Matricula extends Model
{
    use HasFactory;
    
    protected $fillable = ['estudiante_id', 'periodo_id', 'ciclo_id', 'estado', 'fecha_matricula'];

    public function estudiante() { return $this->belongsTo(Estudiante::class); }
    public function periodo() { return $this->belongsTo(PeriodoAcademico::class, 'periodo_id'); }
    public function ciclo() { return $this->belongsTo(Ciclo::class); }
    
    // Relación con el detalle (materias)
    public function detalles() { return $this->hasMany(DetalleMatricula::class); }
}