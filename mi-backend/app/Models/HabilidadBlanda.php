<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HabilidadBlanda extends Model
{
    use HasFactory;

    protected $table = 'habilidades_blandas';

    protected $fillable = [
        'nombre',
        'descripcion',
    ];

    
    public function actividades()
    {
        return $this->hasMany(ActividadHabilidad::class, 'habilidad_blanda_id');
    }

    public function carreras()
    {
        return $this->belongsToMany(
            Carrera::class, 
            'carrera_habilidad_blanda', 
            'habilidad_blanda_id', 
            'carrera_id'
        )->withTimestamps();
    }
    public function metodologias()
{
    return $this->hasMany(MetodologiaHabilidad::class, 'habilidad_blanda_id');
}
}