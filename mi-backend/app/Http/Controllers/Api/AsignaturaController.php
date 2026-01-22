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
    // 1. LISTAR (CON FILTRO DE SEGURIDAD)
    public function index(Request $request) {
        $user = $request->user();
        
        $query = Asignatura::with(['carrera', 'ciclo', 'unidadCurricular']);

        // [SEGURIDAD] Si es coordinador, filtramos solo SU carrera
        if ($user->rol === 'coordinador' && $user->carrera_id) {
            $query->where('carrera_id', $user->carrera_id);
        }

        return $query->orderBy('carrera_id', 'asc')
            ->orderBy('unidad_curricular_id', 'asc')
            ->orderBy('ciclo_id', 'asc')
            ->orderBy('nombre', 'asc')
            ->get();
    }

    // 2. CREAR INDIVIDUAL (FORZAR CARRERA)
    public function store(Request $request) {
        $user = $request->user();

        // Validaciones dinámicas
        $rules = [
            'nombre' => 'required',
            'ciclo_id' => 'required',
            'unidad_curricular_id' => 'required'
        ];

        // Si es admin, exigimos que seleccione la carrera.
        // Si es coordinador, la carrera la ponemos nosotros (no es required en el form).
        if ($user->rol !== 'coordinador') {
            $rules['carrera_id'] = 'required';
        }

        $request->validate($rules);

        // DETERMINAR ID DE CARRERA
        $carreraIdFinal = ($user->rol === 'coordinador' && $user->carrera_id)
            ? $user->carrera_id  // Forzamos la del usuario
            : $request->carrera_id; // Usamos la del formulario

        $nombreFormateado = $this->formatearTexto($request->nombre);
        
        $existe = Asignatura::where('nombre', $nombreFormateado)
                            ->where('carrera_id', $carreraIdFinal)
                            ->exists();

        if ($existe) return response()->json(['message' => "La asignatura ya existe en esta carrera."], 422);

        $data = $request->all();
        $data['nombre'] = $nombreFormateado;
        $data['carrera_id'] = $carreraIdFinal; // Guardamos la ID segura

        $asignatura = Asignatura::create($data);
        return response()->json($asignatura, 201);
    }

    public function update(Request $request, $id) {
        $user = $request->user();
        $asignatura = Asignatura::findOrFail($id);

        // [SEGURIDAD] Verificar permiso de edición
        if ($user->rol === 'coordinador' && $user->carrera_id) {
            if ($asignatura->carrera_id !== $user->carrera_id) {
                return response()->json(['message' => 'No tiene permisos para editar esta asignatura.'], 403);
            }
        }

        $nombreFormateado = $this->formatearTexto($request->nombre);
        $data = $request->all();
        $data['nombre'] = $nombreFormateado;
        
        // El coordinador no puede cambiar la carrera de una asignatura
        if ($user->rol === 'coordinador') {
            unset($data['carrera_id']);
        }

        $asignatura->update($data);
        return response()->json($asignatura);
    }

    public function destroy(Request $request, $id) { // Inyectamos Request para verificar usuario
        $user = $request->user();
        $asignatura = Asignatura::findOrFail($id);

        // [SEGURIDAD]
        if ($user->rol === 'coordinador' && $user->carrera_id) {
            if ($asignatura->carrera_id !== $user->carrera_id) {
                return response()->json(['message' => 'No tiene permisos para eliminar esto.'], 403);
            }
        }

        $asignatura->delete();
        return response()->json(['message' => 'Eliminado']);
    }

    // 3. CARGA MASIVA (INTELIGENTE Y SEGURA)
    public function import(Request $request) {
        $request->validate(['file' => 'required|file']);
        $user = $request->user();
        
        // Determinar si forzamos carrera
        $forcedCarreraId = null;
        if ($user->rol === 'coordinador' && $user->carrera_id) {
            $forcedCarreraId = $user->carrera_id;
        }

        $file = $request->file('file');
        $contenido = file_get_contents($file->getRealPath());

        // 1. DIVIDIR LÍNEAS
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
            if (trim($linea) === '') continue;

            $row = str_getcsv($linea, $separador);
            
            if (!isset($row[0]) || trim($row[0]) === '') continue;
            if (strtolower(trim($row[0])) === 'nombre') continue;

            if (count($row) < 4) {
                $errores[] = "Fila " . ($index + 1) . ": Formato incompleto.";
                continue;
            }

            // 1. PROCESAMIENTO
            $nombre = $this->formatearTexto($row[0]);
            $carreraNombre = $this->formatearTexto($row[1]); 
            $cicloRaw = trim($row[2]);
            $cicloNombre = $this->convertirCicloARomano($cicloRaw); 
            $unidadNombre = $this->formatearTexto($row[3]); 

            // 2. OBTENER ID CARRERA (SEGURIDAD)
            $carreraIdFinal = null;

            if ($forcedCarreraId) {
                // Si es coordinador, USAMOS SU ID (Ignoramos el nombre del Excel si difiere)
                $carreraIdFinal = $forcedCarreraId;
            } else {
                // Si es Admin, buscamos por nombre
                $carrera = Carrera::where('nombre', 'LIKE', "%$carreraNombre%")->first();
                if (!$carrera) {
                    $errores[] = "Fila " . ($index + 1) . ": Carrera '$carreraNombre' no existe.";
                    continue;
                }
                $carreraIdFinal = $carrera->id;
            }

            $ciclo = Ciclo::where('nombre', $cicloNombre)->first();
            $unidad = UnidadCurricular::where('nombre', 'LIKE', "%$unidadNombre%")->first();

            if (!$ciclo) {
                $errores[] = "Fila " . ($index + 1) . ": Ciclo '$cicloNombre' inválido.";
                continue;
            }
            if (!$unidad) {
                $errores[] = "Fila " . ($index + 1) . ": Unidad '$unidadNombre' no encontrada.";
                continue;
            }

            // 3. GUARDAR (FORZANDO LA CARRERA SI APLICA)
            $asignatura = Asignatura::updateOrCreate(
                [
                    'nombre' => $nombre, 
                    'carrera_id' => $carreraIdFinal // <-- Aquí está la clave
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
            
            $cleanPalabra = rtrim($palabra, '.,;'); 

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