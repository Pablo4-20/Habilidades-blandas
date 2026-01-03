<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class UnidadCurricular extends Model {
    protected $table = 'unidades_curriculares'; 
    protected $fillable = ['nombre'];
}