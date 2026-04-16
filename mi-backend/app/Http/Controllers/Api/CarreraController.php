<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Carrera;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CarreraController extends Controller
{
    // Listar carreras incluyendo sus habilidades blandas
    public function index()
    {
        $carreras = Carrera::with('habilidadesBlandas')->get();
        return response()->json($carreras);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:255|unique:carreras',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $data = $request->only(['nombre']);

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('logos', 'public');
            $data['logo'] = $path;
        }

        $carrera = Carrera::create($data);
        return response()->json($carrera, 201);
    }

    // Ver una carrera específica con sus habilidades
    public function show($id)
    {
        $carrera = Carrera::with('habilidadesBlandas')->findOrFail($id);
        return response()->json($carrera);
    }

    public function update(Request $request, $id)
    {
        $carrera = Carrera::findOrFail($id);

        $request->validate([
            'nombre' => 'required|string|max:255|unique:carreras,nombre,' . $id,
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $carrera->nombre = $request->nombre;

        if ($request->hasFile('logo')) {
            if ($carrera->logo) {
                Storage::disk('public')->delete($carrera->logo);
            }
            $path = $request->file('logo')->store('logos', 'public');
            $carrera->logo = $path;
        }

        $carrera->save();
        return response()->json($carrera);
    }

    public function destroy($id)
    {
        $carrera = Carrera::findOrFail($id);
        if ($carrera->logo) {
            Storage::disk('public')->delete($carrera->logo);
        }
        $carrera->delete();
        return response()->json(['message' => 'Carrera eliminada correctamente']);
    }

    /**
     * Nuevo método para sincronizar habilidades con la carrera
     */
    public function asignarHabilidades(Request $request, $id)
    {
        $request->validate([
            'habilidades' => 'required|array',
            'habilidades.*' => 'exists:habilidades_blandas,id'
        ]);

        $carrera = Carrera::findOrFail($id);
        
        // sync() reemplaza todas las asociaciones anteriores por las nuevas
        $carrera->habilidadesBlandas()->sync($request->habilidades);

        return response()->json([
            'message' => 'Habilidades actualizadas para la carrera',
            'carrera' => $carrera->load('habilidadesBlandas')
        ]);
    }
}