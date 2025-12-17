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
use App\Http\Controllers\Api\PlanificacionController; // Asegúrate de tener este
use App\Http\Controllers\Api\ReporteController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\PeriodoAcademicoController;
use App\Http\Controllers\Api\VerificationController;
use App\Http\Controllers\Api\NewPasswordController;

Route::middleware('auth:sanctum')->group(function () {
    // ... tus otras rutas ...
    Route::post('/change-initial-password', [AuthController::class, 'changeInitialPassword']);
    // Rutas para el Coordinador
    Route::get('/reportes/filtros', [CoordinadorController::class, 'filtrosReporte']);
    Route::get('/reportes/general', [CoordinadorController::class, 'reporteGeneral']);
});

// 1. LOGIN (Público)
Route::post('/login', [AuthController::class, 'login']);

Route::post('/forgot-password', [NewPasswordController::class, 'forgotPassword']);
Route::post('/reset-password', [NewPasswordController::class, 'resetPassword']);

Route::get('/email/verify/{id}/{hash}', [VerificationController::class, 'verify'])
    ->name('verification.verify'); // Este nombre es OBLIGATORIO para Laravel

// Ruta para reenviar correo (requiere autenticación)
Route::middleware('auth:sanctum')->post('/email/resend', [VerificationController::class, 'resend']);

// 2. RUTAS PROTEGIDAS (Requieren Token)
Route::middleware('auth:sanctum')->group(function () {
    
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) { return $request->user(); });

    // Dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'index']);

    // --- ADMINISTRADOR ---

    // Periodos Académicos
    Route::get('/periodos', [PeriodoAcademicoController::class, 'index']);
    Route::post('/periodos', [PeriodoAcademicoController::class, 'store']);
    Route::put('/periodos/{id}', [PeriodoAcademicoController::class, 'update']);
    Route::put('/periodos/{id}/estado', [PeriodoAcademicoController::class, 'toggleEstado']);
    Route::delete('/periodos/{id}', [PeriodoAcademicoController::class, 'destroy']);
    

    Route::get('/periodos/activos', [PeriodoAcademicoController::class, 'activos']);

    Route::apiResource('/users', UserController::class);
    Route::post('/users/import', [UserController::class, 'import']);
    
    Route::apiResource('/estudiantes', EstudianteController::class);
    Route::post('/estudiantes/import', [EstudianteController::class, 'import']);
    
    Route::apiResource('/habilidades', HabilidadBlandaController::class);
    Route::post('/habilidades/import', [HabilidadBlandaController::class, 'import']);
    
    Route::apiResource('/asignaturas', AsignaturaController::class);
    Route::post('/asignaturas/import', [AsignaturaController::class, 'import']);

    // --- COORDINADOR ---
    Route::get('/asignaciones/auxiliares', [AsignacionController::class, 'datosAuxiliares']);
    Route::apiResource('/asignaciones', AsignacionController::class);

    // --- DOCENTE  ---
    Route::get('/docente/asignaturas', [DocenteController::class, 'misAsignaturas']);
    Route::get('/docente/estudiantes/{asignatura}', [DocenteController::class, 'verEstudiantes']);
    Route::get('/docente/habilidades/{asignatura}', [DocenteController::class, 'misHabilidades']);


    
Route::get('/planificaciones/verificar/{asignatura_id}', [App\Http\Controllers\Api\PlanificacionController::class, 'verificar']);
    Route::post('/planificaciones', [App\Http\Controllers\Api\PlanificacionController::class, 'store']);
   
    // Evaluación
    Route::post('/docente/rubrica', [DocenteController::class, 'rubrica']);
    Route::post('/docente/guardar-notas', [DocenteController::class, 'guardarNotas']);

    // Reportes
    Route::post('/reportes/generar', [ReporteController::class, 'generar']);
    Route::post('/reportes/pdf-data', [App\Http\Controllers\Api\DocenteController::class, 'pdfData']);
Route::post('/reportes/guardar', [App\Http\Controllers\Api\DocenteController::class, 'guardarConclusion']);
    Route::get('/reportes/general', [ReporteController::class, 'reporteGeneral']);
});