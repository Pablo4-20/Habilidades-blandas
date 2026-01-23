<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Evaluacion;
use App\Models\Reporte;
use App\Models\Planificacion;
use App\Models\Asignatura;
use App\Models\PeriodoAcademico;
use App\Models\DetalleMatricula;
use App\Models\Matricula;
use Illuminate\Support\Facades\DB;

class ReporteController extends Controller
{
    // ==========================================
    // HELPER: Obtener Estudiantes
    // ==========================================
    private function _getEstudiantes($asignaturaId, $periodoId)
    {
        $asignatura = Asignatura::with(['carrera', 'ciclo'])->find($asignaturaId);
        if (!$asignatura) return collect();

        // 1. Manuales
        $estudiantesDirectos = DetalleMatricula::where('asignatura_id', $asignaturaId)
            ->where('estado_materia', '!=', 'Baja')
            ->whereHas('matricula', function($q) use ($periodoId) {
                $q->where('periodo_id', $periodoId)->where('estado', 'Activo');
            })
            ->with(['matricula.estudiante'])
            ->get()
            ->map(fn($d) => optional($d->matricula)->estudiante)
            ->filter();

        // 2. Automáticos
        $idsConRegistro = DetalleMatricula::where('asignatura_id', $asignaturaId)
            ->whereHas('matricula', fn($q) => $q->where('periodo_id', $periodoId))
            ->pluck('matricula_id');

        $estudiantesCiclo = collect();
        if ($asignatura->ciclo_id) {
            $estudiantesCiclo = Matricula::where('periodo_id', $periodoId)
                ->where('ciclo_id', $asignatura->ciclo_id)
                ->where('estado', 'Activo')
                ->whereNotIn('id', $idsConRegistro)
                ->whereHas('estudiante', function($q) use ($asignatura) {
                    if ($asignatura->carrera) {
                        $q->where('carrera', $asignatura->carrera->nombre); 
                    }
                })
                ->with('estudiante')
                ->get()
                ->map(fn($m) => $m->estudiante)
                ->filter();
        }

        return $estudiantesDirectos->concat($estudiantesCiclo)->unique('id');
    }

    // ==========================================
    // 1. DATOS PARA PDF (SEPARADO POR HABILIDAD)
    // ==========================================
    public function datosParaPdf(Request $request)
    {
        $request->validate(['asignatura_id' => 'required', 'periodo' => 'required']);
        $user = $request->user();

        $periodoObj = PeriodoAcademico::where('nombre', $request->periodo)->first();
        if (!$periodoObj) return response()->json(['message' => 'Periodo no encontrado'], 404);

        $estudiantesOficiales = $this->_getEstudiantes($request->asignatura_id, $periodoObj->id);
        $idsEstudiantes = $estudiantesOficiales->pluck('id');

        $planes = Planificacion::with(['asignatura', 'docente', 'detalles.habilidad'])
            ->where('asignatura_id', $request->asignatura_id)
            ->where('docente_id', $user->id)
            ->where('periodo_academico', $request->periodo)
            ->get();

        if ($planes->isEmpty()) {
            return response()->json(['message' => 'No hay habilidades planificadas'], 404);
        }

        $infoGeneral = [
            'facultad' => 'CIENCIAS ADMINISTRATIVAS, GESTIÓN EMPRESARIAL E INFORMÁTICA',
            'carrera' => $planes[0]->asignatura->carrera->nombre ?? 'N/A',
            'docente' => $user->nombres . ' ' . $user->apellidos,
            'asignatura' => $planes[0]->asignatura->nombre,
            'ciclo' => $planes[0]->asignatura->ciclo->nombre ?? 'N/A',
            'periodo' => $request->periodo,
        ];

        $reportes = [];

        foreach ($planes as $plan) {
            // AQUÍ ESTÁ EL CAMBIO CLAVE: Iteramos sobre los DETALLES (Habilidades)
            foreach ($plan->detalles as $detalle) {
                
                if (!$detalle->habilidad) continue;

                // Filtramos notas SOLO de esta habilidad específica
                $evaluaciones = Evaluacion::where('planificacion_id', $plan->id)
                    ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id) // <--- FILTRO IMPORTANTE
                    ->whereIn('estudiante_id', $idsEstudiantes)
                    ->get();

                $conteos = [1=>0, 2=>0, 3=>0, 4=>0, 5=>0];
                foreach ($evaluaciones as $eval) { 
                    if ($eval->nivel) $conteos[$eval->nivel]++; 
                }

                // Buscamos si ya existe reporte guardado. 
                // NOTA: Para guardar individualmente, idealmente la tabla 'reportes' debería tener 'habilidad_blanda_id'.
                // Aquí buscamos por plan_id y, si tu base de datos lo soporta, podrías agregar habilidad_id.
                // Por ahora usamos la lógica base pero devolvemos los datos separados.
                $reporteDB = Reporte::where('planificacion_id', $plan->id)
                    // ->where('habilidad_blanda_id', $detalle->habilidad_blanda_id) // Descomentar si agregas columna a la BD
                    ->first();

                $reportes[] = [
                    'planificacion_id' => $plan->id,
                    'habilidad_id' => $detalle->habilidad_blanda_id, // Identificador único de la habilidad
                    'habilidad' => $detalle->habilidad->nombre,      // Nombre individual
                    'parcial_asignado' => $plan->parcial,
                    'estadisticas' => $conteos, 
                    'conclusion' => $reporteDB ? $reporteDB->conclusion_progreso : ''
                ];
            }
        }

        return response()->json([
            'info' => $infoGeneral,
            'reportes' => $reportes
        ]);
    }

    // ==========================================
    // 2. GUARDAR CONCLUSIONES
    // ==========================================
    public function guardarConclusionesMasivas(Request $request)
    {
        $request->validate(['conclusiones' => 'required|array']);

        foreach($request->conclusiones as $item) {
            // Guardamos usando planificacion_id. 
            // Si agregas 'habilidad_blanda_id' a la tabla reportes, agrégalo al updateOrCreate.
            Reporte::updateOrCreate(
                ['planificacion_id' => $item['id']],
                [
                    'conclusion_progreso' => $item['texto'],
                    'fecha_generacion' => now()
                ]
            );
        }

        return response()->json(['message' => 'Observaciones guardadas correctamente.']);
    }
}