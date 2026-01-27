<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActividadHabilidad extends Model
{
    use HasFactory;

    protected $table = 'actividades_habilidades';

    protected $fillable = [
        'habilidad_blanda_id',
        'descripcion',
    ];

    public function habilidad()
    {
        return $this->belongsTo(HabilidadBlanda::class, 'habilidad_blanda_id');
    }
}