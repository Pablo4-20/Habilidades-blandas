<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\HabilidadBlanda;
use App\Models\ActividadHabilidad;

class ActividadHabilidadSeeder extends Seeder
{
    public function run(): void
    {
        // Datos extraídos de tu frontend (PlanificacionDocente.jsx)
        $actividadesGuia = [
            "Comunicación Efectiva" => [
                "Debates y mesas redondas", "Presentaciones orales y proyectos grupales",
                "Simulaciones y dramatizaciones", "Análisis de discursos y textos"
            ],
            "Resolución de Problemas" => [
                "Observación directa", "Estudio de casos", "Debates y discusiones",
                "Simulaciones y role-playing", "Proyectos colaborativos", "Autoevaluación y reflexión"
            ],
            "Trabajo en Equipo" => [
                "Observación directa", "Estudio de casos", "Debates y discusiones",
                "Simulaciones y role-playing", "Proyectos colaborativos"
            ],
            "Gestión del Tiempo" => [
                "Observación directa", "Análisis de resultados",
                "Retroalimentación de pares", "Uso de indicadores de desempeño"
            ],
            "Adaptabilidad" => [
                "Aprendizaje basado en problemas", "Simulación de escenarios cambiantes",
                "Proyectos interdisciplinarios", "Uso de metodologías activas"
            ],
            "Aprender a Aprender" => [
                "Aprendizaje basado en problemas", "Simulación de escenarios cambiantes",
                "Proyectos interdisciplinarios"
            ],
            "Asertividad" => [
                "Debates y discusiones guiadas", "Sesiones de preguntas y respuestas",
                "Análisis de casos", "Proyectos de innovación"
            ],
            "Creatividad" => [
                "Debates y discusiones guiadas", "Análisis de casos",
                "Proyectos de innovación", "Evaluación del proceso creativo"
            ],
            "Pensamiento Crítico" => [
                "Feedback constructivo", "Análisis de casos",
                "Debates estructurados", "Ensayos reflexivos"
            ],
            "Liderazgo" => [
                "Rubricas de evaluación de liderazgo", "Autoevaluación y metacognición",
                "Portafolios reflexivos", "Evaluación entre pares"
            ],
            "Toma de Decisiones" => [
                "Rubricas de evaluación", "Autoevaluación y metacognición",
                "Portafolios reflexivos", "Estudio de casos reales"
            ]
        ];

        foreach ($actividadesGuia as $nombreHabilidad => $actividades) {
            // Buscamos la habilidad por nombre (debe existir previamente)
            $habilidad = HabilidadBlanda::where('nombre', $nombreHabilidad)->first();
            
            if ($habilidad) {
                foreach ($actividades as $desc) {
                    ActividadHabilidad::firstOrCreate([
                        'habilidad_blanda_id' => $habilidad->id,
                        'descripcion' => $desc
                    ]);
                }
            }
        }
    }
}