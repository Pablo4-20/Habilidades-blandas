<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidaCedula implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        // 1. Validar que tenga exactamente 10 dígitos numéricos
        if (!preg_match('/^[0-9]{10}$/', $value)) {
            $fail('La cédula debe tener exactamente 10 dígitos.');
            return;
        }

        // 2. Validar región (ampliado hasta el 30 para extranjeros)
        $region = (int) substr($value, 0, 2);
        if ($region < 1 || $region > 30) {
            $fail('Los dos primeros dígitos no corresponden a una región válida.');
            return;
        }

        // 3. Algoritmo Módulo 10
        $ultimoDigito = (int) substr($value, 9, 1);
        $pares = (int) substr($value, 1, 1) + (int) substr($value, 3, 1) + (int) substr($value, 5, 1) + (int) substr($value, 7, 1);

        $impares = 0;
        for ($i = 0; $i < 9; $i += 2) {
            $num = (int) substr($value, $i, 1) * 2;
            if ($num > 9) $num -= 9;
            $impares += $num;
        }

        $suma = $pares + $impares;
        
        // Cálculo con enteros puros (evitamos el error de decimales de ceil)
        $digitoValidador = 10 - ($suma % 10);
        if ($digitoValidador == 10) {
            $digitoValidador = 0;
        }

        // Comparación segura
        if ($digitoValidador != $ultimoDigito) {
            $fail('La cédula ingresada no es válida.');
        }
    }
}