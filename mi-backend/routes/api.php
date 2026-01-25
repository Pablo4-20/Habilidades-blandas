<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Controladores
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\EstudianteController;
use App\Http\Controllers\Api\HabilidadBlandaController; 
use App\Http\Controllers\Api\AsignaturaController;
use App\Http\Controllers\Api\AsignacionController;
use App\Http\Controllers\Api\CoordinadorController;
use App\Http\Controllers\Api\DocenteController;
use App\Http\Controllers\Api\PlanificacionController;
use App\Http\Controllers\Api\ReporteController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\PeriodoAcademicoController;
use App\Http\Controllers\Api\VerificationController;
use App\Http\Controllers\Api\NewPasswordController;
use App\Http\Controllers\Api\CatalogoController;
use App\Http\Controllers\Api\MatriculaController;
use App\Http\Controllers\Api\ReporteGeneralController;

// 1. LOGIN (Público)
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [NewPasswordController::class, 'forgotPassword']);
Route::post('/reset-password', [NewPasswordController::class, 'resetPassword']);

// Verificación de Email (SOLO PARA USUARIOS DEL SISTEMA)
Route::get('/email/verify/{id}/{hash}', [VerificationController::class, 'verify'])
    ->name('verification.verify'); 

// 2. RUTAS PROTEGIDAS (Requieren Token)
Route::middleware('auth:sanctum')->group(function () {

    // --- AUTH & USUARIO ---
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) { return $request->user(); });
    Route::post('/change-initial-password', [AuthController::class, 'changeInitialPassword']);
    Route::post('/email/resend', [VerificationController::class, 'resend']);

    // --- DASHBOARD ---
    Route::get('/dashboard/stats', [DashboardController::class, 'index']);

    // --- CATÁLOGOS GLOBALES ---
    Route::get('/carreras', [CatalogoController::class, 'getCarreras']);
    Route::get('/ciclos', [CatalogoController::class, 'getCiclos']);
    Route::get('/unidades', [CatalogoController::class, 'getUnidades']);

    // --- ADMINISTRADOR ---
    // Periodos
    Route::get('/periodos', [PeriodoAcademicoController::class, 'index']);
    Route::post('/periodos', [PeriodoAcademicoController::class, 'store']);
    Route::put('/periodos/{id}', [PeriodoAcademicoController::class, 'update']);
    Route::put('/periodos/{id}/estado', [PeriodoAcademicoController::class, 'toggleEstado']);
    Route::delete('/periodos/{id}', [PeriodoAcademicoController::class, 'destroy']);
    Route::get('/periodos/activos', [PeriodoAcademicoController::class, 'activos']);

    // Usuarios
    Route::apiResource('/users', UserController::class);
    Route::post('/users/import', [UserController::class, 'import']);
    
    // Estudiantes
    Route::apiResource('/estudiantes', EstudianteController::class);
    Route::post('/estudiantes/import', [EstudianteController::class, 'import']);
    
    // Asignaturas
    Route::apiResource('/asignaturas', AsignaturaController::class);
    Route::post('/asignaturas/import', [AsignaturaController::class, 'import']);

    // Habilidades Blandas
    Route::apiResource('habilidades-blandas', HabilidadBlandaController::class);
    Route::post('/habilidades-blandas/import', [HabilidadBlandaController::class, 'import']);

    // --- COORDINADOR ---
    Route::get('/reportes/filtros', [CoordinadorController::class, 'filtrosReporte']);
    Route::get('/reportes/general', [CoordinadorController::class, 'reporteGeneral']);
    Route::get('/asignaciones/auxiliares', [AsignacionController::class, 'datosAuxiliares']);
    Route::apiResource('/asignaciones', AsignacionController::class);

    Route::post('/matriculas', [MatriculaController::class, 'matricular']);
    Route::get('/matriculas/periodo/{id}', [MatriculaController::class, 'byPeriodo']);
    Route::post('/matriculas/import', [MatriculaController::class, 'import']);

    // --- DOCENTE ---
    // Cursos y Listados
    Route::get('/docente/mis-cursos', [DocenteController::class, 'misCursos']);
    Route::get('/docente/curso/{asignaturaId}/estudiantes', [DocenteController::class, 'misEstudiantes']);
    Route::get('/docente/asignaturas', [DocenteController::class, 'misAsignaturas']); // Para combos
    Route::get('/docente/estudiantes/{asignatura}', [DocenteController::class, 'verEstudiantes']);
    Route::get('/docente/habilidades/{asignatura}', [DocenteController::class, 'misHabilidades']);
    
    // Gestión Manual de Estudiantes (Arrastres y Bajas)
    Route::post('/docente/agregar-estudiante', [DocenteController::class, 'agregarEstudianteManual']);
    Route::post('/docente/eliminar-estudiante', [DocenteController::class, 'eliminarEstudiante']);

    // Planificación
    Route::get('/planificaciones/verificar/{asignatura_id}', [PlanificacionController::class, 'verificar']);
    Route::post('/planificaciones', [PlanificacionController::class, 'store']);
   
    // Evaluación y Calificación
    Route::post('/docente/rubrica', [DocenteController::class, 'rubrica']);
    Route::post('/docente/guardar-notas', [DocenteController::class, 'guardarNotas']);
    Route::get('/docente/progreso', [DocenteController::class, 'verificarProgreso']); // NUEVA RUTA DE PROGRESO

    // Reportes Docente (CORREGIDOS A ReporteController)
    Route::post('/reportes/generar', [ReporteController::class, 'generar']);
    
    Route::get('/reportes/general-coordinador', [ReporteGeneralController::class, 'index']);
    // 1. Ruta para Actas Individuales
    Route::post('/reportes/pdf-data', [ReporteController::class, 'datosParaPdf']); 
    
    // 2. Ruta para Ficha Resumen General (AGREGADA)
    Route::post('/reportes/pdf-data-general', [ReporteController::class, 'pdfDataGeneral']);

    // Guardado de observaciones
    Route::post('/reportes/guardar-todo', [ReporteController::class, 'guardarConclusionesMasivas']);
    
    // Ruta opcional para datos en JSON (si se usa en el futuro)
    Route::post('/fichas/datos', [ReporteController::class, 'obtenerFichaResumen']);
});