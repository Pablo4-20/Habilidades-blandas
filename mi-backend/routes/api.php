<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Controladores
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\EstudianteController;
use App\Http\Controllers\Api\HabilidadBlandaController; // <--- Controlador actualizado
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

// 1. LOGIN (Público)
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [NewPasswordController::class, 'forgotPassword']);
Route::post('/reset-password', [NewPasswordController::class, 'resetPassword']);

// Verificación de Email
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

    // --- CATÁLOGOS GLOBALES (Para dropdowns) ---
    Route::get('/carreras', [CatalogoController::class, 'getCarreras']);
    Route::get('/ciclos', [CatalogoController::class, 'getCiclos']);
    Route::get('/unidades', [CatalogoController::class, 'getUnidades']);

    // --- ADMINISTRADOR ---

    // Periodos Académicos
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

    // HABILIDADES BLANDAS (Catálogo Global) - CORREGIDO
    // Nota: Usamos 'habilidades-blandas' para coincidir con el frontend
    Route::apiResource('habilidades-blandas', HabilidadBlandaController::class);
    Route::post('/habilidades-blandas/import', [HabilidadBlandaController::class, 'import']);

    // --- COORDINADOR ---
    Route::get('/reportes/filtros', [CoordinadorController::class, 'filtrosReporte']);
    Route::get('/reportes/general', [CoordinadorController::class, 'reporteGeneral']);
    Route::get('/asignaciones/auxiliares', [AsignacionController::class, 'datosAuxiliares']);
    Route::apiResource('/asignaciones', AsignacionController::class);

    // --- DOCENTE ---
    Route::get('/docente/asignaturas', [DocenteController::class, 'misAsignaturas']);
    Route::get('/docente/estudiantes/{asignatura}', [DocenteController::class, 'verEstudiantes']);
    Route::get('/docente/habilidades/{asignatura}', [DocenteController::class, 'misHabilidades']);

    // Planificación
    Route::get('/planificaciones/verificar/{asignatura_id}', [PlanificacionController::class, 'verificar']);
    Route::post('/planificaciones', [PlanificacionController::class, 'store']);
   
    // Evaluación
    Route::post('/docente/rubrica', [DocenteController::class, 'rubrica']);
    Route::post('/docente/guardar-notas', [DocenteController::class, 'guardarNotas']);

    // Reportes Docente
    Route::post('/reportes/generar', [ReporteController::class, 'generar']);
    Route::post('/reportes/pdf-data', [DocenteController::class, 'pdfData']);
    Route::post('/reportes/guardar', [DocenteController::class, 'guardarConclusion']);
});