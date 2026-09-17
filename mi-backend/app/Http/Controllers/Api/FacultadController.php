<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Facultad;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FacultadController extends Controller
{
    public function index()
    {
        return response()->json(Facultad::with('carreras')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            // Corregido: "facultades" en lugar de "facultads"
            'nombre' => 'required|string|unique:facultades', 
            'tipo' => 'required|string',
            'logo' => 'nullable|image|max:2048'
        ]);

        $data = $request->only(['nombre', 'tipo']);

        if ($request->hasFile('logo')) {
            $data['logo'] = $request->file('logo')->store('logos_facultades', 'public');
        }

        return response()->json(Facultad::create($data), 201);
    }

    public function update(Request $request, $id)
    {
        $facultad = Facultad::findOrFail($id);

        $request->validate([
            // Corregido: "facultades" en lugar de "facultads"
            'nombre' => 'required|string|unique:facultades,nombre,' . $id, 
            'tipo' => 'required|string',
            'logo' => 'nullable|image|max:2048'
        ]);

        $facultad->nombre = $request->nombre;
        $facultad->tipo = $request->tipo;

        if ($request->hasFile('logo')) {
            if ($facultad->logo) {
                Storage::disk('public')->delete($facultad->logo);
            }
            $facultad->logo = $request->file('logo')->store('logos_facultades', 'public');
        }

        $facultad->save();
        return response()->json($facultad);
    }

    public function destroy($id)
    {
        $facultad = Facultad::findOrFail($id);
        if ($facultad->logo) {
            Storage::disk('public')->delete($facultad->logo);
        }
        $facultad->delete();
        return response()->json(['message' => 'Eliminado']);
    }
}