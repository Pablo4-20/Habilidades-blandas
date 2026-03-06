<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Carrera;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CarreraController extends Controller
{
    public function index()
    {
        return Carrera::orderBy('id', 'desc')->get();
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|unique:carreras,nombre',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,svg|max:2048' // Máximo 2MB
        ]);

        $data = ['nombre' => $request->nombre];

        if ($request->hasFile('logo')) {
            // Guarda la imagen en storage/app/public/logos_carreras
            $path = $request->file('logo')->store('logos_carreras', 'public');
            $data['logo'] = $path;
        }

        $carrera = Carrera::create($data);
        return response()->json(['message' => 'Carrera creada', 'carrera' => $carrera]);
    }

    public function update(Request $request, $id)
    {
        $carrera = Carrera::findOrFail($id);
        
        $request->validate([
            'nombre' => 'required|string|unique:carreras,nombre,'.$id,
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,svg|max:2048'
        ]);

        $data = ['nombre' => $request->nombre];

        if ($request->hasFile('logo')) {
            // Eliminar logo anterior si existe para no llenar el disco
            if ($carrera->logo) {
                Storage::disk('public')->delete($carrera->logo);
            }
            $path = $request->file('logo')->store('logos_carreras', 'public');
            $data['logo'] = $path;
        }

        $carrera->update($data);
        return response()->json(['message' => 'Carrera actualizada', 'carrera' => $carrera]);
    }

    public function destroy($id)
    {
        $carrera = Carrera::findOrFail($id);
        // Si tiene logo, borrarlo del disco
        if ($carrera->logo) {
            Storage::disk('public')->delete($carrera->logo);
        }
        $carrera->delete();
        return response()->json(['message' => 'Carrera eliminada']);
    }
}