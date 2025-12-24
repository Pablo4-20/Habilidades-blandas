<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\HabilidadBlanda;

class HabilidadBlandaSeeder extends Seeder
{
    public function run(): void
    {
        // 1. DICCIONARIO GLOBAL (Banco de Habilidades)
        // Usamos las claves como 'nombre' y el valor como 'descripcion' (o sugerencias)
        $habilidades = [
            'Adaptabilidad' => "Aprendizaje basado en problemas.\nSimulación de escenarios cambiantes.\nProyectos interdisciplinarios.",
            'Aprender a Aprender' => "Problemas abiertos con recursos limitados.\nPromover la experimentación y el manejo del error.\nAutoevaluación constante.",
            'Asertividad' => "Debates y discusiones guiadas.\nSesiones de preguntas y respuestas activas.\nAnálisis de casos.",
            'Creatividad' => "Proyectos de innovación.\nLluvias de ideas.\nPresentaciones orales de proyectos.",
            'Pensamiento Crítico' => "Análisis de casos.\nDebates estructurados.\nEnsayos reflexivos.\nSimulación de tomas de decisiones.",
            'Liderazgo' => "Rúbricas de evaluación de liderazgo.\nActividades colaborativas.\nAutoevaluación y metacognición.",
            'Toma de Decisiones' => "Simulación y estudios de caso.\nProblemas abiertos y desestructurados.\nAnálisis de riesgos.",
            'Autocontrol' => "Manejo de presión en entregas.\nResolución de conflictos simulados.",
            'Trabajo en Equipo' => "Proyectos colaborativos.\nEvaluación entre pares.\nAnálisis de productos grupales.",
            'Comunicación Efectiva' => "Debates y mesas redondas.\nPresentaciones orales.\nAnálisis de discursos.",
            'Resolución de Problemas' => "Estudio de casos reales.\nDepuración de código ajeno.\nHackathons internos.",
            'Gestión del Tiempo' => "Uso de herramientas de planificación.\nEntregas por hitos.\nGestión de cronogramas."
        ];

        // 2. CARGA MASIVA SIMPLE
        // Ya no recorremos materias ($mapa), solo guardamos las habilidades para que existan.
        foreach ($habilidades as $nombre => $descripcion) {
            HabilidadBlanda::firstOrCreate(
                ['nombre' => $nombre], // Buscamos por nombre para no duplicar
                ['descripcion' => $descripcion] // Si no existe, guardamos esto
            );
        }
    }
}