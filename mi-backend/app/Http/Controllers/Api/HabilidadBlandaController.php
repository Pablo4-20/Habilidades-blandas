<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\HabilidadBlanda;
use App\Models\ActividadHabilidad; 
use App\Models\MetodologiaHabilidad; 
use Illuminate\Support\Facades\DB; 

class HabilidadBlandaController extends Controller
{
    // 1. LISTAR (Con Actividades y Metodologías)
    public function index()
    {
        return HabilidadBlanda::with(['actividades', 'metodologias']) 
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

            // Heredar Actividades Globales
            $actividadesGlobales = ActividadHabilidad::select('descripcion')->distinct()->pluck('descripcion');
            foreach ($actividadesGlobales as $actDesc) {
                $habilidad->actividades()->create(['descripcion' => $actDesc]);
            }

            // Heredar Metodologías Globales
            $metodologiasGlobales = MetodologiaHabilidad::select('descripcion')->distinct()->pluck('descripcion');
            foreach ($metodologiasGlobales as $metDesc) {
                $habilidad->metodologias()->create(['descripcion' => $metDesc]);
            }

            return response()->json($habilidad->load(['actividades', 'metodologias']), 201);
        });
    }

    // 3. ACTUALIZAR (Manual desde Admin)
    public function update(Request $request, $id)
    {
        $habilidad = HabilidadBlanda::findOrFail($id);

        $request->validate([
            'nombre' => 'required|unique:habilidades_blandas,nombre,' . $id,
            'descripcion' => 'nullable|string',
            'actividades' => 'nullable|array',
            'metodologias' => 'nullable|array'
        ]);

        return DB::transaction(function () use ($request, $habilidad) {
            $habilidad->update([
                'nombre' => $this->formatearTexto($request->nombre),
                'descripcion' => $request->descripcion
            ]);

            // Sincronizar Actividades
            $habilidad->actividades()->delete();
            if (!empty($request->actividades)) {
                $actividadesUnicas = collect($request->actividades)
                    ->map(fn($t) => trim($t))->filter(fn($t) => $t !== '')
                    ->unique(fn($t) => strtolower($t))->values();
                foreach ($actividadesUnicas as $actTexto) {
                    $habilidad->actividades()->create(['descripcion' => $actTexto]);
                }
            }

            // Sincronizar Metodologías
            $habilidad->metodologias()->delete();
            if (!empty($request->metodologias)) {
                $metodologiasUnicas = collect($request->metodologias)
                    ->map(fn($t) => trim($t))->filter(fn($t) => $t !== '')
                    ->unique(fn($t) => strtolower($t))->values();
                foreach ($metodologiasUnicas as $metTexto) {
                    $habilidad->metodologias()->create(['descripcion' => $metTexto]);
                }
            }

            return response()->json($habilidad->load(['actividades', 'metodologias']));
        });
    }

    // 4. ELIMINAR
    public function destroy($id)
    {
        HabilidadBlanda::destroy($id);
        return response()->json(['message' => 'Eliminado correctamente']);
    }

    // 5. IMPORTAR MASIVA
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
            $actividadesGlobales = ActividadHabilidad::select('descripcion')->distinct()->pluck('descripcion');
            $metodologiasGlobales = MetodologiaHabilidad::select('descripcion')->distinct()->pluck('descripcion');

            foreach ($lines as $linea) {
                if (trim($linea) === '') continue;
                $row = str_getcsv($linea, $separador);
                
                if (!isset($row[0]) || trim($row[0]) === '') continue;
                if (strtolower(trim($row[0])) === 'nombre') continue;

                $nombre = $this->formatearTexto($row[0]);
                $descripcion = isset($row[1]) ? trim($row[1]) : '';

                $habilidad = HabilidadBlanda::updateOrCreate(
                    ['nombre' => $nombre],
                    ['descripcion' => $descripcion]
                );

                if ($habilidad->wasRecentlyCreated) {
                    $habilidadesNuevas++;
                    foreach ($actividadesGlobales as $actDesc) {
                        $habilidad->actividades()->create(['descripcion' => $actDesc]);
                    }
                    foreach ($metodologiasGlobales as $metDesc) {
                        $habilidad->metodologias()->create(['descripcion' => $metDesc]);
                    }
                } else {
                    $habilidadesActualizadas++;
                }
            }
        });

        return response()->json([
            'message' => "Carga exitosa: $habilidadesNuevas nuevas, $habilidadesActualizadas actualizadas.",
            'resumen' => ['creadas' => $habilidadesNuevas, 'actualizadas' => $habilidadesActualizadas]
        ]);
    }

    private function formatearTexto($texto) {
        return mb_convert_case(trim($texto), MB_CASE_TITLE, "UTF-8");
    }

    public function syncGlobalActivities(Request $request)
    {
        $request->validate(['actividades' => 'array']);
        return DB::transaction(function () use ($request) {
            ActividadHabilidad::truncate(); 
            $textos = collect($request->actividades ?? [])
                ->map(fn($texto) => trim($texto))->filter(fn($texto) => $texto !== '')
                ->unique(fn($texto) => strtolower($texto))->values()->toArray();
            
            if (empty($textos)) return response()->json(['message' => 'Todas las actividades fueron eliminadas']);
            
            $habilidades = HabilidadBlanda::all();
            $insertData = [];
            foreach ($habilidades as $habilidad) {
                foreach ($textos as $texto) {
                    $insertData[] = [
                        'habilidad_blanda_id' => $habilidad->id,
                        'descripcion' => $texto,
                        'created_at' => now(), 'updated_at' => now()
                    ];
                }
            }
            if (!empty($insertData)) ActividadHabilidad::insert($insertData);
            return response()->json(['message' => 'Actividades globales sincronizadas con éxito.']);
        });
    }

    public function syncGlobalMetodologias(Request $request)
    {
        $request->validate(['metodologias' => 'array']);
        return DB::transaction(function () use ($request) {
            MetodologiaHabilidad::truncate(); 
            $textos = collect($request->metodologias ?? [])
                ->map(fn($texto) => trim($texto))->filter(fn($texto) => $texto !== '')
                ->unique(fn($texto) => strtolower($texto))->values()->toArray();
            
            if (empty($textos)) return response()->json(['message' => 'Todas las metodologías fueron eliminadas']);
            
            $habilidades = HabilidadBlanda::all();
            $insertData = [];
            foreach ($habilidades as $habilidad) {
                foreach ($textos as $texto) {
                    $insertData[] = [
                        'habilidad_blanda_id' => $habilidad->id,
                        'descripcion' => $texto,
                        'created_at' => now(), 'updated_at' => now()
                    ];
                }
            }
            if (!empty($insertData)) MetodologiaHabilidad::insert($insertData);
            return response()->json(['message' => 'Metodologías globales sincronizadas con éxito.']);
        });
    }

    public function getGlobalActividades()
    {
        // Obtiene una lista única de todas las actividades guardadas
        $actividades = ActividadHabilidad::select('descripcion')->distinct()->pluck('descripcion');
        return response()->json($actividades);
    }

    public function getGlobalMetodologias()
    {
        // Obtiene una lista única de todas las metodologías guardadas
        $metodologias = MetodologiaHabilidad::select('descripcion')->distinct()->pluck('descripcion');
        return response()->json($metodologias);
    }
}