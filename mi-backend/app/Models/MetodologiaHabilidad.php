<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MetodologiaHabilidad extends Model
{
    protected $table = 'metodologias_habilidades';
    protected $fillable = ['habilidad_blanda_id', 'descripcion'];
}