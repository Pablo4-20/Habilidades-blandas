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

    // 👇 AGREGAR ESTA FUNCIÓN
    public function actividades()
    {
        return $this->hasMany(ActividadHabilidad::class, 'habilidad_blanda_id');
    }
}