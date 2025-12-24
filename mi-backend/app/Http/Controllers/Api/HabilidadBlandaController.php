<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\HabilidadBlanda;

class HabilidadBlandaController extends Controller
{
    // 1. LISTAR (GET)
    public function index()
    {
        // Ordenamos alfabéticamente para el catálogo
        return HabilidadBlanda::orderBy('nombre', 'asc')->get();
    }

    // 2. CREAR (POST)
    public function store(Request $request)
    {
        // Validación simple: Nombre obligatorio y único
        $request->validate([
            'nombre' => 'required|unique:habilidades_blandas,nombre',
            'descripcion' => 'nullable|string'
        ]);

        $habilidad = HabilidadBlanda::create([
            'nombre' => $this->formatearTexto($request->nombre),
            'descripcion' => $request->descripcion
        ]);

        return response()->json($habilidad, 201);
    }

    // 3. ACTUALIZAR (PUT)
    public function update(Request $request, $id)
    {
        $habilidad = HabilidadBlanda::findOrFail($id);

        $request->validate([
            'nombre' => 'required|unique:habilidades_blandas,nombre,' . $id,
            'descripcion' => 'nullable|string'
        ]);

        $habilidad->update([
            'nombre' => $this->formatearTexto($request->nombre),
            'descripcion' => $request->descripcion
        ]);

        return response()->json($habilidad);
    }

    // 4. ELIMINAR (DELETE)
    public function destroy($id)
    {
        HabilidadBlanda::destroy($id);
        return response()->json(['message' => 'Eliminado correctamente']);
    }

    // 5. IMPORTAR MASIVA (POST)
    public function import(Request $request)
    {
        $request->validate(['file' => 'required|file']);
        
        $file = $request->file('file');
        $contenido = file_get_contents($file->getRealPath());
        
        // Manejo de encoding (tildes)
        if (!mb_detect_encoding($contenido, 'UTF-8', true)) {
            $contenido = mb_convert_encoding($contenido, 'UTF-8', 'ISO-8859-1');
        }

        // Dividir líneas
        $lines = preg_split("/\r\n|\n|\r/", $contenido);
        $separador = ',';

        // Detectar separador
        foreach ($lines as $linea) {
            if (trim($linea) !== '') {
                if (substr_count($linea, ';') > substr_count($linea, ',')) $separador = ';';
                break;
            }
        }

        $creados = 0;
        foreach ($lines as $linea) {
            if (trim($linea) === '') continue;
            
            $row = str_getcsv($linea, $separador);
            
            // Ignorar cabecera o filas vacías
            if (!isset($row[0]) || strtolower(trim($row[0])) === 'nombre') continue;

            $nombre = $this->formatearTexto($row[0]);
            $descripcion = isset($row[1]) ? trim($row[1]) : '';

            // Guardar si no existe
            $habilidad = HabilidadBlanda::firstOrCreate(
                ['nombre' => $nombre],
                ['descripcion' => $descripcion]
            );

            if ($habilidad->wasRecentlyCreated) $creados++;
        }

        return response()->json(['message' => "Importación exitosa. $creados habilidades nuevas."]);
    }

    // AUXILIAR: Formato Título (Title Case)
    private function formatearTexto($texto) {
        return mb_convert_case(trim($texto), MB_CASE_TITLE, "UTF-8");
    }
}