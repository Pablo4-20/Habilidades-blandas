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

    // --- CARGA MASIVA (CORREGIDA) ---
    public function import(Request $request)
    {
        $request->validate(['file' => 'required|file']);
        $user = $request->user();
        
        $periodoActivo = PeriodoAcademico::where('activo', true)->first();
        if (!$periodoActivo) return response()->json(['message' => 'No hay periodo activo.'], 422);

        $carreraForzada = ($user->rol === 'coordinador' && $user->carrera_id) ? $user->carrera->nombre : null;

        $file = $request->file('file');
        $contenido = file_get_contents($file->getRealPath());
        
        $lines = preg_split("/\r\n|\n|\r/", $contenido);
        $separador = str_contains($lines[0] ?? '', ';') ? ';' : ',';

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
                
                if (count($row) < 3 || strtolower(trim($row[0])) === 'cedula' || strtolower(trim($row[0])) === 'identificacion') continue;

                $filasTotales++;
                $cedula = trim($row[0]);
                $carreraFinal = $carreraForzada ? $carreraForzada : trim($row[1]);
                $cicloNombre = $this->normalizarCiclo(trim($row[2]));
                
                $rawParalelo = isset($row[3]) ? trim($row[3]) : '';
                $paralelo = ($rawParalelo !== '') ? strtoupper($rawParalelo) : 'A';

                // 1. Validar ESTUDIANTE
                $estudiante = Estudiante::where('cedula', $cedula)->first();
                if (!$estudiante) {
                    $erroresEstudiante++; 
                    continue; 
                }

                // 2. Validar CICLO
                $cicloNuevo = Ciclo::where('nombre', $cicloNombre)->first();
                if (!$cicloNuevo) {
                    $erroresCiclo++; 
                    continue;
                }

                if ($estudiante->carrera !== $carreraFinal) {
                    $estudiante->update(['carrera' => $carreraFinal]);
                }

                // 3. MATRICULAR (Lógica Anti-Duplicados)
                
                // Paso A: Buscamos si YA existe una matrícula exacta en ese paralelo
                // Esto evita el error "Unique violation" si intentamos actualizar otra a este paralelo y ya existe.
                $matriculaExacta = Matricula::where('estudiante_id', $estudiante->id)
                    ->where('periodo_id', $periodoActivo->id)
                    ->where('paralelo', $paralelo)
                    ->with('ciclo')
                    ->first();

                if ($matriculaExacta) {
                    // Ya existe en el paralelo correcto. Solo verificamos si hay que subir el ciclo.
                    $pesoActual = $this->getPesoCiclo($matriculaExacta->ciclo->nombre);
                    $pesoNuevo = $this->getPesoCiclo($cicloNuevo->nombre);

                    if ($pesoNuevo > $pesoActual) {
                        $matriculaExacta->update([
                            'ciclo_id' => $cicloNuevo->id,
                            'updated_at' => now()
                        ]);
                        $actualizados++;
                    } else {
                        $sinCambios++;
                    }
                } else {
                    // Paso B: No existe en ese paralelo.
                    // Buscamos si existe en OTRO paralelo para moverla (Actualizar la A a B)
                    // Como ya sabemos que la exacta (B) no existe (paso A), es seguro hacer el update.
                    $matriculaOtra = Matricula::where('estudiante_id', $estudiante->id)
                        ->where('periodo_id', $periodoActivo->id)
                        ->with('ciclo')
                        ->first();

                    if ($matriculaOtra) {
                        // Existe en otro paralelo, la movemos al nuevo
                        $matriculaOtra->update([
                            'ciclo_id' => $cicloNuevo->id,
                            'paralelo' => $paralelo,
                            'updated_at' => now()
                        ]);
                        $actualizados++;
                    } else {
                        // Paso C: No existe ninguna, creamos nueva
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
            }
            
            DB::commit();
            
            $mensaje = "Proceso finalizado sobre $filasTotales filas detectadas.\n\n";
            $mensaje .= "✅ Nuevos Matriculados: $procesados\n";
            $mensaje .= "🔄 Actualizados/Movidos: $actualizados\n";
            
            if ($erroresEstudiante > 0) $mensaje .= "\n⚠️ $erroresEstudiante filas omitidas: Estudiantes no registrados.";
            if ($erroresCiclo > 0) $mensaje .= "\n⚠️ $erroresCiclo filas omitidas: Ciclo no válido.";
            if ($sinCambios > 0) $mensaje .= "\nℹ️ $sinCambios filas sin cambios.";

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