<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Carrera extends Model
 {
    use HasFactory;
    protected $fillable = ['nombre', 'logo'];


    public function habilidadesBlandas()
    {
        return $this->belongsToMany(
            HabilidadBlanda::class, 
            'carrera_habilidad_blanda', 
            'carrera_id', 
            'habilidad_blanda_id'
        )->withTimestamps();
    }
}

