<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\HabilidadBlanda;
use App\Models\ActividadHabilidad; 
use Illuminate\Support\Facades\DB; 

class HabilidadBlandaController extends Controller
{
    // 1. LISTAR (Con Actividades)
    public function index()
    {
        return HabilidadBlanda::with('actividades') 
            ->orderBy('nombre', 'asc')
            ->get();
    }

    // 2. CREAR (Manual desde Admin)
    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required|unique:habilidades_blandas,nombre',
            'descripcion' => 'nullable|string'
        ]);

        return DB::transaction(function () use ($request) {
            $habilidad = HabilidadBlanda::create([
                'nombre' => $this->formatearTexto($request->nombre),
                'descripcion' => $request->descripcion
            ]);

            // Buscar cuáles son las actividades globales actuales (las sacamos de otra habilidad existente)
            $actividadesGlobales = ActividadHabilidad::select('descripcion')->distinct()->pluck('descripcion');

            // Asignárselas automáticamente a la nueva habilidad
            foreach ($actividadesGlobales as $actDesc) {
                $habilidad->actividades()->create(['descripcion' => $actDesc]);
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

    // 5. IMPORTAR MASIVA (CSV solo Nombre y Descripción)
    public function import(Request $request)
    {
        $request->validate(['file' => 'required|file']);
        
        $file = $request->file('file');
        $contenido = file_get_contents($file->getRealPath());
        
        if (!mb_detect_encoding($contenido, 'UTF-8', true)) {
            $contenido = mb_convert_encoding($contenido, 'UTF-8', 'ISO-8859-1');
        }

        $lines = preg_split("/\r\n|\n|\r/", $contenido);
        $separador = ',';

        foreach ($lines as $linea) {
            if (trim($linea) !== '') {
                if (substr_count($linea, ';') > substr_count($linea, ',')) $separador = ';';
                break;
            }
        }

        $habilidadesNuevas = 0;
        $habilidadesActualizadas = 0;

        DB::transaction(function () use ($lines, $separador, &$habilidadesNuevas, &$habilidadesActualizadas) {
            
            // Obtenemos la lista de actividades globales actuales (para asignárselas a las nuevas habilidades importadas)
            $actividadesGlobales = ActividadHabilidad::select('descripcion')->distinct()->pluck('descripcion');

            foreach ($lines as $linea) {
                if (trim($linea) === '') continue;
                
                $row = str_getcsv($linea, $separador);
                
                if (!isset($row[0]) || trim($row[0]) === '') continue;
                if (strtolower(trim($row[0])) === 'nombre') continue;

                $nombre = $this->formatearTexto($row[0]);
                $descripcion = isset($row[1]) ? trim($row[1]) : '';

                // Crea o actualiza la habilidad
                $habilidad = HabilidadBlanda::updateOrCreate(
                    ['nombre' => $nombre],
                    ['descripcion' => $descripcion]
                );

                // Si es nueva, le inyectamos las actividades globales
                if ($habilidad->wasRecentlyCreated) {
                    $habilidadesNuevas++;
                    
                    foreach ($actividadesGlobales as $actDesc) {
                        $habilidad->actividades()->create(['descripcion' => $actDesc]);
                    }
                } else {
                    $habilidadesActualizadas++;
                }
            }
        });

        return response()->json([
            'message' => "Carga exitosa: $habilidadesNuevas nuevas, $habilidadesActualizadas actualizadas.",
            'resumen' => [
                'creadas' => $habilidadesNuevas,
                'actualizadas' => $habilidadesActualizadas
            ]
        ]);
    }

    private function formatearTexto($texto) {
        return mb_convert_case(trim($texto), MB_CASE_TITLE, "UTF-8");
    }


    public function syncGlobalActivities(Request $request)
    {
        $request->validate([
            'actividades' => 'array'
        ]);

        return DB::transaction(function () use ($request) {
           
            ActividadHabilidad::truncate(); 

            $actividadesTextos = $request->actividades ?? [];
            
            
            if (empty($actividadesTextos)) {
                return response()->json(['message' => 'Todas las actividades fueron eliminadas']);
            }

            
            $habilidades = HabilidadBlanda::all();
            $insertData = [];

            // 3. Por cada habilidad, preparamos la lista de actividades para insertarlas masivamente
            foreach ($habilidades as $habilidad) {
                foreach ($actividadesTextos as $texto) {
                    if (trim($texto) !== '') {
                        $insertData[] = [
                            'habilidad_blanda_id' => $habilidad->id,
                            'descripcion' => trim($texto),
                            'created_at' => now(),
                            'updated_at' => now()
                        ];
                    }
                }
            }

            // 4. Insertamos todo de golpe (más eficiente)
            if (!empty($insertData)) {
                ActividadHabilidad::insert($insertData);
            }

            return response()->json(['message' => 'Actividades globales sincronizadas con éxito a todas las habilidades.']);
        });
    }
}