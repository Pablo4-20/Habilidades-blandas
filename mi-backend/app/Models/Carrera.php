<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Carrera extends Model
{
    use HasFactory;
    
    // Eliminamos 'facultad' y 'extension', agregamos 'facultad_id'
    protected $fillable = ['nombre', 'logo', 'facultad_id'];

    public function habilidadesBlandas()
    {
        return $this->belongsToMany(
            HabilidadBlanda::class, 
            'carrera_habilidad_blanda', 
            'carrera_id', 
            'habilidad_blanda_id'
        )->withTimestamps();
    }

    // Nueva relación: Una carrera pertenece a una facultad
    public function facultad()
    {
        return $this->belongsTo(Facultad::class);
    }
}