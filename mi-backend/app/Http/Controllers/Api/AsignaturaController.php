<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Asignatura;
use App\Models\Carrera;
use App\Models\Ciclo;
use App\Models\UnidadCurricular;

class AsignaturaController extends Controller
{
    public function index() {
        return Asignatura::with(['carrera', 'ciclo', 'unidadCurricular'])
            ->orderBy('carrera_id', 'asc')
            ->orderBy('unidad_curricular_id', 'asc')
            ->orderBy('ciclo_id', 'asc')
            ->orderBy('nombre', 'asc')
            ->get();
    }

    public function store(Request $request) {
        $request->validate([
            'nombre' => 'required',
            'carrera_id' => 'required',
            'ciclo_id' => 'required',
            'unidad_curricular_id' => 'required'
        ]);
        $nombreFormateado = $this->formatearTexto($request->nombre);
        
        $existe = Asignatura::where('nombre', $nombreFormateado)
                            ->where('carrera_id', $request->carrera_id)
                            ->exists();

        if ($existe) return response()->json(['message' => "La asignatura ya existe."], 422);

        $data = $request->all();
        $data['nombre'] = $nombreFormateado;
        $asignatura = Asignatura::create($data);
        return response()->json($asignatura, 201);
    }

    public function update(Request $request, $id) {
        $asignatura = Asignatura::findOrFail($id);
        $nombreFormateado = $this->formatearTexto($request->nombre);
        $data = $request->all();
        $data['nombre'] = $nombreFormateado;
        $asignatura->update($data);
        return response()->json($asignatura);
    }

    public function destroy($id) {
        Asignatura::destroy($id);
        return response()->json(['message' => 'Eliminado']);
    }

    
    public function import(Request $request) {
        $request->validate(['file' => 'required|file']);
        
        $file = $request->file('file');
        $contenido = file_get_contents($file->getRealPath());

        // 1. DIVIDIR LÍNEAS (Universal)
        $lines = preg_split("/\r\n|\n|\r/", $contenido);
        
        // 2. DETECTAR SEPARADOR
        $separador = ',';
        foreach ($lines as $linea) {
            if (trim($linea) !== '') {
                if (substr_count($linea, ';') > substr_count($linea, ',')) {
                    $separador = ';';
                }
                break;
            }
        }

        $creados = 0;
        $actualizados = 0;
        $errores = [];

        foreach ($lines as $index => $linea) {
            // Ignorar líneas totalmente vacías
            if (trim($linea) === '') continue;

            $row = str_getcsv($linea, $separador);
            
            // Ignorar filas sin nombre
            if (!isset($row[0]) || trim($row[0]) === '') continue;

            // Ignorar cabecera si dice "Nombre"
            if (strtolower(trim($row[0])) === 'nombre') continue;

            // Verificar columnas mínimas
            if (count($row) < 4) {
                // Solo reportar error si la fila parece tener datos pero está incompleta
                $errores[] = "Fila " . ($index + 1) . ": Formato incompleto (menos de 4 columnas).";
                continue;
            }

            // 1. PROCESAMIENTO
            $nombre = $this->formatearTexto($row[0]);
            $carreraNombre = $this->formatearTexto($row[1]); 
            $cicloRaw = trim($row[2]);
            $cicloNombre = $this->convertirCicloARomano($cicloRaw); 
            $unidadNombre = $this->formatearTexto($row[3]); 

            // 2. BÚSQUEDA DE IDs
            $carrera = Carrera::where('nombre', 'LIKE', "%$carreraNombre%")->first();
            $ciclo = Ciclo::where('nombre', $cicloNombre)->first();
            $unidad = UnidadCurricular::where('nombre', 'LIKE', "%$unidadNombre%")->first();

            // 3. REPORTE DE ERRORES EXACTOS
            if (!$carrera) {
                $errores[] = "Fila " . ($index + 1) . ": Carrera '$carreraNombre' no existe (Asignatura: $nombre).";
                continue;
            }
            if (!$ciclo) {
                $errores[] = "Fila " . ($index + 1) . ": Ciclo '$cicloNombre' inválido para '$nombre'.";
                continue;
            }
            if (!$unidad) {
                $errores[] = "Fila " . ($index + 1) . ": Unidad '$unidadNombre' no encontrada.";
                continue;
            }

            // 4. GUARDAR
            $asignatura = Asignatura::updateOrCreate(
                [
                    'nombre' => $nombre, 
                    'carrera_id' => $carrera->id
                ], 
                [
                    'ciclo_id' => $ciclo->id,
                    'unidad_curricular_id' => $unidad->id
                ]
            );

            if ($asignatura->wasRecentlyCreated) {
                $creados++;
            } else {
                $actualizados++;
            }
        }

        return response()->json([
            'message' => "Proceso finalizado.",
            'creados' => $creados,
            'actualizados' => $actualizados,
            'errores' => $errores
        ]);
    }

    // --- FUNCIONES AUXILIARES ---
    private function formatearTexto($texto) {
        if (!$texto) return '';
        $texto = mb_convert_case(trim($texto), MB_CASE_TITLE, "UTF-8");
        
        $palabras = explode(' ', $texto);
        $nuevasPalabras = array_map(function($palabra) {
            $numeros = ['1'=>'I','2'=>'II','3'=>'III','4'=>'IV','5'=>'V','6'=>'VI','7'=>'VII','8'=>'VIII','9'=>'IX','10'=>'X'];
            $correcciones = ['Ii'=>'II','Iii'=>'III','Iv'=>'IV','Vi'=>'VI','Vii'=>'VII','Viii'=>'VIII','Ix'=>'IX','Xi'=>'XI'];
            
            $cleanPalabra = rtrim($palabra, '.,;'); // Limpiar puntuación

            if (isset($numeros[$cleanPalabra])) return $numeros[$cleanPalabra];
            if (isset($correcciones[$cleanPalabra])) return $correcciones[$cleanPalabra];
            return $palabra;
        }, $palabras);
        return implode(' ', $nuevasPalabras);
    }

    private function convertirCicloARomano($input) {
        $input = trim($input);
        $mapa = ['1'=>'I','01'=>'I','2'=>'II','02'=>'II','3'=>'III','03'=>'III','4'=>'IV','04'=>'IV','5'=>'V','05'=>'V','6'=>'VI','06'=>'VI','7'=>'VII','07'=>'VII','8'=>'VIII','08'=>'VIII','9'=>'IX','09'=>'IX','10'=>'X'];
        if (isset($mapa[$input])) return $mapa[$input];
        return strtoupper($input);
    }
}