<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidaCedula implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (strlen($value) !== 10) {
            $fail('La cédula debe tener exactamente 10 dígitos.');
            return;
        }

        $region = (int) substr($value, 0, 2);
        
        // CAMBIO: Permitimos hasta la región 30
        if ($region < 1 || $region > 30) {
            $fail('Los dos primeros dígitos de la cédula no corresponden a una región válida.');
            return;
        }

        $ultimoDigito = (int) substr($value, 9, 1);
        $pares = (int) substr($value, 1, 1) + (int) substr($value, 3, 1) + (int) substr($value, 5, 1) + (int) substr($value, 7, 1);
        
        $impares = 0;
        for ($i = 0; $i < 9; $i += 2) {
            $num = (int) substr($value, $i, 1) * 2;
            if ($num > 9) $num -= 9;
            $impares += $num;
        }

        $suma = $pares + $impares;
        $decena = (ceil($suma / 10)) * 10;
        $digitoValidador = $decena - $suma;

        if ($digitoValidador == 10) $digitoValidador = 0;

        if ($digitoValidador !== $ultimoDigito) {
            $fail('La cédula ingresada no es válida.');
        }
    }
}