<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\HabilidadBlanda;
use App\Models\ActividadHabilidad; // Importante: Importar el modelo
use Illuminate\Support\Facades\DB; // Para transacciones

class HabilidadBlandaController extends Controller
{
    // 1. LISTAR (Con Actividades)
    public function index()
    {
        return HabilidadBlanda::with('actividades') // Trae la relación
            ->orderBy('nombre', 'asc')
            ->get();
    }

    // 2. CREAR (Manual desde Admin)
    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required|unique:habilidades_blandas,nombre',
            'descripcion' => 'nullable|string',
            'actividades' => 'nullable|array' // Array de textos
        ]);

        return DB::transaction(function () use ($request) {
            $habilidad = HabilidadBlanda::create([
                'nombre' => $this->formatearTexto($request->nombre),
                'descripcion' => $request->descripcion
            ]);

            // Guardar actividades si vienen
            if (!empty($request->actividades)) {
                foreach ($request->actividades as $actividadTexto) {
                    if (trim($actividadTexto) !== '') {
                        $habilidad->actividades()->create(['descripcion' => trim($actividadTexto)]);
                    }
                }
            }

            return response()->json($habilidad->load('actividades'), 201);
        });
    }

    // 3. ACTUALIZAR (Manual desde Admin)
    public function update(Request $request, $id)
    {
        $habilidad = HabilidadBlanda::findOrFail($id);

        $request->validate([
            'nombre' => 'required|unique:habilidades_blandas,nombre,' . $id,
            'descripcion' => 'nullable|string',
            'actividades' => 'nullable|array'
        ]);

        return DB::transaction(function () use ($request, $habilidad) {
            $habilidad->update([
                'nombre' => $this->formatearTexto($request->nombre),
                'descripcion' => $request->descripcion
            ]);

            // Sincronizar Actividades: Borramos las viejas y creamos las nuevas
            // (Estrategia simple para evitar inconsistencias)
            $habilidad->actividades()->delete();

            if (!empty($request->actividades)) {
                foreach ($request->actividades as $actividadTexto) {
                    if (trim($actividadTexto) !== '') {
                        $habilidad->actividades()->create(['descripcion' => trim($actividadTexto)]);
                    }
                }
            }

            return response()->json($habilidad->load('actividades'));
        });
    }

    // 4. ELIMINAR
    public function destroy($id)
    {
        HabilidadBlanda::destroy($id); // Por la relación cascade, se borran las actividades solas
        return response()->json(['message' => 'Eliminado correctamente']);
    }

    // 5. IMPORTAR MASIVA (CSV con Actividades)
    public function import(Request $request)
    {
        $request->validate(['file' => 'required|file']);
        
        $file = $request->file('file');
        $contenido = file_get_contents($file->getRealPath());
        
        // Corrección de codificación si es necesario
        if (!mb_detect_encoding($contenido, 'UTF-8', true)) {
            $contenido = mb_convert_encoding($contenido, 'UTF-8', 'ISO-8859-1');
        }

        $lines = preg_split("/\r\n|\n|\r/", $contenido);
        $separador = ',';

        // Detectar separador automáticamente
        foreach ($lines as $linea) {
            if (trim($linea) !== '') {
                if (substr_count($linea, ';') > substr_count($linea, ',')) $separador = ';';
                break;
            }
        }

        $habilidadesNuevas = 0;
        $habilidadesActualizadas = 0;
        $actividadesTotal = 0;

        DB::transaction(function () use ($lines, $separador, &$habilidadesNuevas, &$habilidadesActualizadas, &$actividadesTotal) {
            foreach ($lines as $linea) {
                // 1. IGNORAR LÍNEAS VACÍAS (ESTO SOLUCIONA EL CONTEO EXTRA)
                if (trim($linea) === '') continue;
                
                $row = str_getcsv($linea, $separador);
                
                // 2. VALIDAR QUE TENGA AL MENOS EL NOMBRE
                if (!isset($row[0]) || trim($row[0]) === '') continue;

                // 3. IGNORAR CABECERA SI EXISTE
                if (strtolower(trim($row[0])) === 'nombre') continue;

                $nombre = $this->formatearTexto($row[0]);
                $descripcion = isset($row[1]) ? trim($row[1]) : '';

                // Buscar o Crear la Habilidad
                $habilidad = HabilidadBlanda::updateOrCreate(
                    ['nombre' => $nombre],
                    ['descripcion' => $descripcion]
                );

                if ($habilidad->wasRecentlyCreated) {
                    $habilidadesNuevas++;
                } else {
                    $habilidadesActualizadas++;
                }

                // Procesar Actividades (Columnas 2 en adelante)
                for ($i = 2; $i < count($row); $i++) {
                    $actDesc = trim($row[$i]);
                    if (!empty($actDesc)) {
                        $actividad = ActividadHabilidad::firstOrCreate([
                            'habilidad_blanda_id' => $habilidad->id,
                            'descripcion' => $actDesc
                        ]);
                        
                        // Solo contamos si se creó o si ya existía (para saber cuántas actividades detectó el archivo)
                        // Si quieres contar solo las NUEVAS actividades, usa $actividad->wasRecentlyCreated
                        $actividadesTotal++;
                    }
                }
            }
        });

        return response()->json([
            'message' => "Proceso completado.",
            'resumen' => [
                'habilidades_creadas' => $habilidadesNuevas,
                'habilidades_actualizadas' => $habilidadesActualizadas,
                'actividades_procesadas' => $actividadesTotal
            ]
        ]);
    }

    private function formatearTexto($texto) {
        return mb_convert_case(trim($texto), MB_CASE_TITLE, "UTF-8");
    }
}