<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\DocumentValidationController;
use App\Http\Controllers\Api\DossierController;
use App\Http\Controllers\Api\DossierEscalationController;
use App\Http\Controllers\Api\RubriqueController;
use App\Http\Controllers\Api\DocumentDecisionController;
use App\Http\Controllers\Api\AdminUserController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

Route::middleware(['auth:sanctum', 'active.user'])->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Documents
    Route::prefix('documents')->group(function () {
        Route::post('/', [DocumentController::class, 'store']);
        Route::get('/', [DocumentController::class, 'index']);
        Route::get('/{document}', [DocumentController::class, 'show']);
        Route::delete('/{document}', [DocumentController::class, 'destroy']);
        Route::post('/{document}/validate', [DocumentValidationController::class, 'validateDocument']);
        Route::post('/{document}/retry', [DocumentController::class, 'retry']);
        Route::post('/{document}/accept', [DocumentDecisionController::class, 'accept']);
        Route::post('/{document}/reject', [DocumentDecisionController::class, 'reject']);
    });

    // Dossiers
    Route::prefix('dossiers')->group(function () {
        Route::get('/', [DossierController::class, 'index']);
        Route::post('/', [DossierController::class, 'store']);
        Route::get('/{dossier}', [DossierController::class, 'show']);
        Route::put('/{dossier}', [DossierController::class, 'update']);
        Route::delete('/{dossier}', [DossierController::class, 'destroy']);
        Route::post('/{dossier}/submit', [DossierController::class, 'submit']);
        Route::post('/{dossier}/process', [DossierController::class, 'process']);

        // Hierarchical escalation workflow
        Route::post('/{dossier}/escalate', [DossierEscalationController::class, 'escalate']);
        Route::post('/{dossier}/chef/approve', [DossierEscalationController::class, 'approveDerogation']);
        Route::post('/{dossier}/chef/return', [DossierEscalationController::class, 'returnToGestionnaire']);
        Route::post('/{dossier}/chef/request-complement', [DossierEscalationController::class, 'requestComplement']);

        // Rubriques inside a dossier
        Route::post('/{dossier}/rubriques', [RubriqueController::class, 'store']);
    });

    // Rubriques
    Route::prefix('rubriques')->group(function () {
        Route::put('/{rubrique}', [RubriqueController::class, 'update']);
        Route::delete('/{rubrique}', [RubriqueController::class, 'destroy']);
        Route::post('/{rubrique}/attach-documents', [RubriqueController::class, 'attachDocuments']);
        Route::delete('/{rubrique}/documents/{document}', [RubriqueController::class, 'detachDocument']);
        Route::post('/{rubrique}/reject-all', [RubriqueController::class, 'rejectAll']);
    });

    // Admin
    Route::prefix('admin')->group(function () {
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::post('/users', [AdminUserController::class, 'store']);
        Route::patch('/users/{user}/role', [AdminUserController::class, 'updateRole']);
        Route::patch('/users/{user}/status', [AdminUserController::class, 'updateStatus']);
    });
});