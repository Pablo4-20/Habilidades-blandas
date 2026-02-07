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
    public function byPeriodo(Request $request, $periodo_id)
    {
        $user = $request->user();
        $query = Matricula::with(['estudiante', 'ciclo'])->where('periodo_id', $periodo_id);

        if ($user->rol === 'coordinador' && $user->carrera_id) {
            $nombreCarrera = $user->carrera->nombre;
            $query->whereHas('estudiante', function($q) use ($nombreCarrera) {
                $q->where('carrera', $nombreCarrera);
            });
        }

        $matriculas = $query->get()->map(function ($mat) {
            return [
                'id' => $mat->id,
                'cedula' => $mat->estudiante->cedula,
                'nombres' => $mat->estudiante->apellidos . ' ' . $mat->estudiante->nombres,
                'email' => $mat->estudiante->email,
                'carrera' => $mat->estudiante->carrera,
                'ciclo' => $mat->ciclo->nombre,
                'paralelo' => $mat->paralelo, 
                'fecha_matricula' => $mat->fecha_matricula,
                'estado' => $mat->estado
            ];
        });

        return response()->json($matriculas);
    }

    // --- CARGA MASIVA  ---
    public function import(Request $request)
    {
        $request->validate(['file' => 'required|file']);
        $user = $request->user();
        
        $periodoActivo = PeriodoAcademico::where('activo', true)->first();
        if (!$periodoActivo) return response()->json(['message' => 'No hay periodo activo.'], 422);

        $carreraForzada = ($user->rol === 'coordinador' && $user->carrera_id) ? $user->carrera->nombre : null;

        $file = $request->file('file');
        $contenido = file_get_contents($file->getRealPath());
        
        // Normalizar saltos de línea
        $lines = preg_split("/\r\n|\n|\r/", $contenido);
        
        // Detectar separador automáticamente (si hay ; usa ; si no ,)
        $separador = str_contains($lines[0] ?? '', ';') ? ';' : ',';

        // CONTADORES PARA EL REPORTE
        $procesados = 0;
        $actualizados = 0;
        $sinCambios = 0;
        $erroresEstudiante = 0; 
        $erroresCiclo = 0;      
        $filasTotales = 0;

        DB::beginTransaction();
        try {
            foreach ($lines as $index => $linea) {
                if (trim($linea) === '') continue;
                
                $row = str_getcsv($linea, $separador);
                
                // Validación básica de estructura
                if (count($row) < 3 || strtolower(trim($row[0])) === 'cedula' || strtolower(trim($row[0])) === 'identificacion') continue;

                $filasTotales++;
                $cedula = trim($row[0]);
                $carreraFinal = $carreraForzada ? $carreraForzada : trim($row[1]);
                $cicloNombre = $this->normalizarCiclo(trim($row[2]));
                
                // Lógica Paralelo
                $rawParalelo = isset($row[3]) ? trim($row[3]) : '';
                $paralelo = ($rawParalelo !== '') ? strtoupper($rawParalelo) : 'A';

                // 1. Validar existencia del ESTUDIANTE
                $estudiante = Estudiante::where('cedula', $cedula)->first();
                if (!$estudiante) {
                    $erroresEstudiante++; 
                    continue; 
                }

                // 2. Validar existencia del CICLO
                $cicloNuevo = Ciclo::where('nombre', $cicloNombre)->first();
                if (!$cicloNuevo) {
                    $erroresCiclo++; 
                    continue;
                }

                // Actualizar carrera si es necesario
                if ($estudiante->carrera !== $carreraFinal) {
                    $estudiante->update(['carrera' => $carreraFinal]);
                }

                // 3. MATRICULAR
                $matriculaExistente = Matricula::where('estudiante_id', $estudiante->id)
                    ->where('periodo_id', $periodoActivo->id)
                    ->with('ciclo')
                    ->first();

                if ($matriculaExistente) {
                    $pesoActual = $this->getPesoCiclo($matriculaExistente->ciclo->nombre);
                    $pesoNuevo = $this->getPesoCiclo($cicloNuevo->nombre);

                    // Actualizar si sube de ciclo O cambia de paralelo
                    if ($pesoNuevo > $pesoActual || ($pesoNuevo == $pesoActual && $matriculaExistente->paralelo !== $paralelo)) {
                        $matriculaExistente->update([
                            'ciclo_id' => $cicloNuevo->id,
                            'paralelo' => $paralelo,
                            'updated_at' => now()
                        ]);
                        $actualizados++;
                    } else {
                        $sinCambios++;
                    }
                } else {
                    Matricula::create([
                        'estudiante_id' => $estudiante->id,
                        'periodo_id'    => $periodoActivo->id,
                        'ciclo_id'      => $cicloNuevo->id,
                        'paralelo'      => $paralelo,
                        'fecha_matricula' => now(),
                        'estado'        => 'Activo'
                    ]);
                    $procesados++;
                }
            }
            
            DB::commit();
            
            
            $mensaje = "Proceso finalizado sobre $filasTotales filas detectadas.\n\n";
            $mensaje .= "✅ Nuevos Matriculados: $procesados\n";
            $mensaje .= "🔄 Actualizados: $actualizados\n";
            
            
            if ($erroresEstudiante > 0) {
                $mensaje .= "\n⚠️ $erroresEstudiante filas omitidas: Estudiantes no registrados en el sistema (Gestión Usuarios).";
            }
            if ($erroresCiclo > 0) {
                $mensaje .= "\n⚠️ $erroresCiclo filas omitidas: Ciclo no válido.";
            }
            if ($sinCambios > 0) {
                $mensaje .= "\nℹ️ $sinCambios filas sin cambios (ya estaban matriculados correctamente).";
            }

            return response()->json([
                'message' => $mensaje,
                'status' => ($procesados + $actualizados) > 0 ? 'success' : 'warning'
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['message' => 'Error crítico: ' . $e->getMessage()], 500);
        }
    }

    private function normalizarCiclo($texto) {
        $mapa = ['1'=>'I','2'=>'II','3'=>'III','4'=>'IV','5'=>'V','6'=>'VI','7'=>'VII','8'=>'VIII','9'=>'IX','10'=>'X'];
        return $mapa[$texto] ?? strtoupper($texto);
    }

    private function getPesoCiclo($nombreRomano) {
        $pesos = ['I' => 1, 'II' => 2, 'III' => 3, 'IV' => 4, 'V' => 5, 'VI' => 6, 'VII' => 7, 'VIII' => 8, 'IX' => 9, 'X' => 10];
        return $pesos[$nombreRomano] ?? 0;
    }
}