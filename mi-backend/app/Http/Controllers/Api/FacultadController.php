<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Facultad;
use Illuminate\Http\Request;

class FacultadController extends Controller
{
    public function index()
    {
        // Traemos las facultades con sus carreras asociadas
        $facultades = Facultad::with('carreras')->get();
        return response()->json($facultades);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:255',
            'tipo' => 'required|in:Facultad,Extensión'
        ]);

        $facultad = Facultad::create($request->all());
        return response()->json($facultad, 201);
    }

    public function show($id)
    {
        $facultad = Facultad::with('carreras')->findOrFail($id);
        return response()->json($facultad);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'nombre' => 'required|string|max:255',
            'tipo' => 'required|in:Facultad,Extensión'
        ]);

        $facultad = Facultad::findOrFail($id);
        $facultad->update($request->all());

        return response()->json($facultad);
    }

    public function destroy($id)
    {
        $facultad = Facultad::findOrFail($id);
        
        // Al eliminar, las carreras asociadas pondrán su facultad_id en null 
        // gracias a "nullOnDelete()" que configuramos en la migración.
        $facultad->delete();
        
        return response()->json(['message' => 'Eliminado correctamente']);
    }
}