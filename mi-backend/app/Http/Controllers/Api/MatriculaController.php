<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Matricula;
use App\Models\Estudiante;
use App\Models\Ciclo;
use App\Models\PeriodoAcademico;
use Illuminate\Support\Facades\DB;

class MatriculaController extends Controller
{
    // 1. LISTAR MATRICULADOS POR PERIODO (Para tu tabla)
    public function byPeriodo($periodo_id)
    {
        $matriculas = Matricula::with(['estudiante', 'ciclo'])
            ->where('periodo_id', $periodo_id)
            ->get()
            ->map(function ($mat) {
                return [
                    'id'              => $mat->id,
                    'cedula'          => $mat->estudiante->cedula,
                    'nombres'         => $mat->estudiante->apellidos . ' ' . $mat->estudiante->nombres,
                    'email'           => $mat->estudiante->email,
                    'carrera'         => $mat->estudiante->carrera, // Dato histórico del estudiante
                    'ciclo'           => $mat->ciclo->nombre,
                    'fecha_matricula' => $mat->fecha_matricula,
                    'estado'          => $mat->estado
                ];
            });

        return response()->json($matriculas);
    }

    // 2. CARGA MASIVA DE MATRÍCULAS
   public function import(Request $request)
{
    // 1. VALIDACIÓN: Solo pedimos el archivo (quitamos periodo_id)
    $request->validate([
        'file' => 'required|file'
    ]);

    // 2. OBTENER PERIODO ACTIVO AUTOMÁTICAMENTE
    $periodoActivo = PeriodoAcademico::where('activo', true)->first();

    if (!$periodoActivo) {
        // Retornamos error 422 personalizado si no hay periodo activo
        return response()->json([
            'message' => 'No existe un periodo académico activo configurado en el sistema.',
            'errors' => ['periodo' => ['Active un periodo académico primero.']]
        ], 422);
    }

    $file = $request->file('file');
    
    // Leer el archivo (Asumiendo que llega un CSV o TXT convertido desde el front)
    $contenido = file_get_contents($file->getRealPath());
    $primerLinea = explode(PHP_EOL, $contenido)[0] ?? '';
    $separador = str_contains($primerLinea, ';') ? ';' : ',';
    
    $data = array_map(function($linea) use ($separador) {
        return str_getcsv($linea, $separador);
    }, file($file->getRealPath()));

    array_shift($data); // Quitar encabezados

    $procesados = 0;
    $errores = 0;

    DB::beginTransaction();
    try {
        foreach ($data as $row) {
            // Estructura esperada: Cédula | Carrera | Ciclo
            if (empty($row) || count($row) < 3) continue;

            $cedula = trim($row[0]);
            // $carrera = trim($row[1]); // Podrías usarlo para validar o actualizar
            $cicloNombre = trim($row[2]);

            // A. Buscar Estudiante
            $estudiante = Estudiante::where('cedula', $cedula)->first();
            if (!$estudiante) { 
                $errores++; 
                continue; 
            }

            // B. Buscar Ciclo (Mapeo rápido de Romanos o Números)
            $mapa = ['1'=>'I','2'=>'II','3'=>'III','4'=>'IV','5'=>'V','6'=>'VI','7'=>'VII','8'=>'VIII'];
            $cicloFinal = $mapa[$cicloNombre] ?? strtoupper($cicloNombre);
            
            $cicloDb = Ciclo::where('nombre', $cicloFinal)->first();
            if (!$cicloDb) { 
                $errores++; 
                continue; 
            }

            // C. Crear Matrícula en el PERIODO ACTIVO DETECTADO
            Matricula::updateOrCreate(
                [
                    'estudiante_id' => $estudiante->id,
                    'periodo_id'    => $periodoActivo->id // <--- USAMOS EL ID AUTOMÁTICO
                ],
                [
                    'ciclo_id'        => $cicloDb->id,
                    'fecha_matricula' => now(),
                    'estado'          => 'Activo'
                ]
            );
            $procesados++;
        }
        DB::commit();
        return response()->json([
            'message' => "Proceso completado en el periodo {$periodoActivo->nombre}.\nMatriculados: $procesados.\nNo encontrados/Errores: $errores"
        ]);

    } catch (\Exception $e) {
        DB::rollback();
        return response()->json(['message' => 'Error crítico: ' . $e->getMessage()], 500);
    }
}
    
    
}