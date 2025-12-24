<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidaCedula implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        // 1. Longitud exacta
        if (strlen($value) !== 10) {
            $fail('La cédula debe tener 10 dígitos.');
            return;
        }

        // 2. Solo números
        if (!is_numeric($value)) {
            $fail('La cédula debe contener solo números.');
            return;
        }

        // 3. Código de provincia (01-24 o 30)
        $provincia = substr($value, 0, 2);
        if ($provincia < 1 || $provincia > 24) {
            $fail('El código de provincia de la cédula es inválido.');
            return;
        }

        // 4. Tercer dígito (menor a 6 para personas naturales)
        $tercerDigito = $value[2];
        if ($tercerDigito >= 6) {
            $fail('El tercer dígito es inválido para cédula personal.');
            return;
        }

        // 5. Algoritmo Módulo 10
        $coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
        $total = 0;

        for ($i = 0; $i < 9; $i++) {
            $valor = $value[$i] * $coeficientes[$i];
            $total += ($valor >= 10) ? $valor - 9 : $valor;
        }

        $digitoVerificador = $value[9];
        $decenaSuperior = ceil($total / 10) * 10;
        $calculado = $decenaSuperior - $total;
        
        if ($calculado == 10) $calculado = 0;

        if ($calculado != $digitoVerificador) {
            $fail('La cédula ingresada es inválida (Dígito verificador incorrecto).');
        }
    }
}