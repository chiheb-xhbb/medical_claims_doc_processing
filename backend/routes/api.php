<?php


use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\DocumentValidationController;
use App\Http\Controllers\Api\DossierController;
use App\Http\Controllers\Api\RubriqueController;
use App\Http\Controllers\Api\DocumentDecisionController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

//Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    // Documents
    Route::prefix('documents')->group(function () {
        Route::post('/', [DocumentController::class, 'store']);
        Route::get('/', [DocumentController::class, 'index']);
        Route::get('/{document}', [DocumentController::class, 'show']);
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
});