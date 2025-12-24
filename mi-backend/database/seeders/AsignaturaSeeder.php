<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Asignatura;
use App\Models\Carrera;
use App\Models\Ciclo;
use App\Models\UnidadCurricular;

class AsignaturaSeeder extends Seeder
{
    public function run(): void
    {
        // Tu lista de materias (Mantenemos el formato texto para que sea legible)
        $asignaturas = [
            // ================= CARRERA DE SOFTWARE =================
            // Ciclo I
            ['nombre' => 'Algoritmos y Lógica de Programación', 'carrera' => 'Software', 'ciclo' => 'I', 'unidad' => 'Unidad Básica'],
            ['nombre' => 'Algebra lineal', 'carrera' => 'Software', 'ciclo' => 'I', 'unidad' => 'Unidad Básica'],
            ['nombre' => 'Calculo I', 'carrera' => 'Software', 'ciclo' => 'I', 'unidad' => 'Unidad Básica'],
            ['nombre' => 'Lenguaje y Comunicación', 'carrera' => 'Software', 'ciclo' => 'I', 'unidad' => 'Unidad Básica'],
            ['nombre' => 'Estructuras Discretas', 'carrera' => 'Software', 'ciclo' => 'I', 'unidad' => 'Unidad Básica'],
            ['nombre' => 'Arquitectura de Computadores', 'carrera' => 'Software', 'ciclo' => 'I', 'unidad' => 'Unidad Básica'],
            ['nombre' => 'Fundamentos de Física para Ingeniería', 'carrera' => 'Software', 'ciclo' => 'I', 'unidad' => 'Unidad Básica'],
            // Ciclo II
            ['nombre' => 'Calculo II', 'carrera' => 'Software', 'ciclo' => 'II', 'unidad' => 'Unidad Básica'],
            ['nombre' => 'Programación Orientada a Objetos', 'carrera' => 'Software', 'ciclo' => 'II', 'unidad' => 'Unidad Básica'],
            ['nombre' => 'Realidad Nacional y Diversidad Cultural', 'carrera' => 'Software', 'ciclo' => 'II', 'unidad' => 'Unidad Básica'],
            ['nombre' => 'Estructura de Datos', 'carrera' => 'Software', 'ciclo' => 'II', 'unidad' => 'Unidad Básica'],
            // Ciclo III
            ['nombre' => 'Ingeniería de Requerimientos', 'carrera' => 'Software', 'ciclo' => 'III', 'unidad' => 'Unidad Básica'],
            ['nombre' => 'Sistemas de Información', 'carrera' => 'Software', 'ciclo' => 'III', 'unidad' => 'Unidad Básica'],
            ['nombre' => 'Cálculo III', 'carrera' => 'Software', 'ciclo' => 'III', 'unidad' => 'Unidad Básica'],
            ['nombre' => 'Trabajo en Equipo y Comunicación Eficaz', 'carrera' => 'Software', 'ciclo' => 'III', 'unidad' => 'Unidad Básica'],
            ['nombre' => 'Estadística y Probabilidades', 'carrera' => 'Software', 'ciclo' => 'III', 'unidad' => 'Unidad Básica'],
            ['nombre' => 'Programación Web I', 'carrera' => 'Software', 'ciclo' => 'III', 'unidad' => 'Unidad Básica'],
            // Ciclo IV
            ['nombre' => 'Modelamiento y Diseño del Software', 'carrera' => 'Software', 'ciclo' => 'IV', 'unidad' => 'Unidad Profesional'],
            ['nombre' => 'Bases de Datos', 'carrera' => 'Software', 'ciclo' => 'IV', 'unidad' => 'Unidad Profesional'],
            ['nombre' => 'Sistemas Operativos', 'carrera' => 'Software', 'ciclo' => 'IV', 'unidad' => 'Unidad Profesional'],
            ['nombre' => 'Sostenibilidad Ambiental', 'carrera' => 'Software', 'ciclo' => 'IV', 'unidad' => 'Unidad Profesional'],
            ['nombre' => 'Métodos Numéricos', 'carrera' => 'Software', 'ciclo' => 'IV', 'unidad' => 'Unidad Profesional'],
            ['nombre' => 'Programación Web II', 'carrera' => 'Software', 'ciclo' => 'IV', 'unidad' => 'Unidad Profesional'],
            ['nombre' => 'Arquitectura de Software', 'carrera' => 'Software', 'ciclo' => 'IV', 'unidad' => 'Unidad Profesional'],
            // Ciclo V
            ['nombre' => 'Administración de Bases de Datos', 'carrera' => 'Software', 'ciclo' => 'V', 'unidad' => 'Unidad Profesional'],
            ['nombre' => 'Fundamentos de Redes y Conectividad', 'carrera' => 'Software', 'ciclo' => 'V', 'unidad' => 'Unidad Profesional'],
            ['nombre' => 'Investigación de Operaciones', 'carrera' => 'Software', 'ciclo' => 'V', 'unidad' => 'Unidad Profesional'],
            ['nombre' => 'Programación Móvil', 'carrera' => 'Software', 'ciclo' => 'V', 'unidad' => 'Unidad Profesional'],
            ['nombre' => 'Mantenimiento y Configuración de Software', 'carrera' => 'Software', 'ciclo' => 'V', 'unidad' => 'Unidad Profesional'],
            // Ciclo VI
            ['nombre' => 'Interacción Hombre Máquina', 'carrera' => 'Software', 'ciclo' => 'VI', 'unidad' => 'Unidad Profesional'],
            ['nombre' => 'Redes de Datos', 'carrera' => 'Software', 'ciclo' => 'VI', 'unidad' => 'Unidad Profesional'],
            ['nombre' => 'Liderazgo y Emprendimiento', 'carrera' => 'Software', 'ciclo' => 'VI', 'unidad' => 'Unidad Profesional'],
            ['nombre' => 'Simulación', 'carrera' => 'Software', 'ciclo' => 'VI', 'unidad' => 'Unidad Profesional'],
            ['nombre' => 'Aplicaciones Distribuidas', 'carrera' => 'Software', 'ciclo' => 'VI', 'unidad' => 'Unidad Profesional'],
            ['nombre' => 'Seguridad de Software', 'carrera' => 'Software', 'ciclo' => 'VI', 'unidad' => 'Unidad Profesional'],
            // Ciclo VII
            ['nombre' => 'Epistemología y Metodología de la Investigación', 'carrera' => 'Software', 'ciclo' => 'VII', 'unidad' => 'Unidad Profesional'],
            ['nombre' => 'Inteligencia Artificial', 'carrera' => 'Software', 'ciclo' => 'VII', 'unidad' => 'Unidad Profesional'],
            ['nombre' => 'Prácticas Profesionales', 'carrera' => 'Software', 'ciclo' => 'VII', 'unidad' => 'Unidad Profesional'],
            ['nombre' => 'Gestión de las Tecnologías de la Información', 'carrera' => 'Software', 'ciclo' => 'VII', 'unidad' => 'Unidad de Integración Curricular'],
            // Ciclo VIII
            ['nombre' => 'Calidad de Software', 'carrera' => 'Software', 'ciclo' => 'VIII', 'unidad' => 'Unidad de Integración Curricular'],
            ['nombre' => 'Deontología Informática', 'carrera' => 'Software', 'ciclo' => 'VIII', 'unidad' => 'Unidad de Integración Curricular'],
            ['nombre' => 'Prácticas de Servicio Comunitario', 'carrera' => 'Software', 'ciclo' => 'VIII', 'unidad' => 'Unidad de Integración Curricular'],
            ['nombre' => 'Trabajo de Titulación e Integración Curricular', 'carrera' => 'Software', 'ciclo' => 'VIII', 'unidad' => 'Unidad de Integración Curricular'],

            // ================= CARRERA DE TI (Solo algunos ejemplos para no saturar) =================
            ['nombre' => 'Algoritmos y Fundamentos de Programación', 'carrera' => 'TI', 'ciclo' => 'I', 'unidad' => 'Unidad Básica'],
            // ... (puedes copiar el resto de tu lista de TI aquí)
        ];

        // LOGICA DE CONVERSIÓN: Texto -> ID
        foreach ($asignaturas as $item) {
            
            // 1. Buscamos los IDs correspondientes en los catálogos
            $carrera = Carrera::where('nombre', $item['carrera'])->first();
            $ciclo = Ciclo::where('nombre', $item['ciclo'])->first();
            $unidad = UnidadCurricular::where('nombre', $item['unidad'])->first();

            // 2. Si encontramos todo, creamos o actualizamos la asignatura
            if ($carrera && $ciclo && $unidad) {
                Asignatura::updateOrCreate(
                    [
                        'nombre' => $item['nombre'],
                        'carrera_id' => $carrera->id
                    ],
                    [
                        'ciclo_id' => $ciclo->id,
                        'unidad_curricular_id' => $unidad->id
                    ]
                );
            }
        }
    }
}