<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDocumentRequest;
use App\Models\Document;
use App\Services\DocumentService;
use Illuminate\Http\JsonResponse;

class DocumentController extends Controller
{
    public function __construct(
        private DocumentService $documentService
    ) {}

    public function store(StoreDocumentRequest $request): JsonResponse
    {
        $document = $this->documentService->store(
            file: $request->file('file'),
            userId: null
        );

        return response()->json([
            'id' => $document->id,
            'status' => $document->status->value,
            'original_filename' => $document->original_filename,
            'mime_type' => $document->mime_type,
            'file_size' => $document->file_size,
            'created_at' => $document->created_at,
        ], 201);
    }

    public function show(Document $document): JsonResponse
    {
        return response()->json([
            'id' => $document->id,
            'original_filename' => $document->original_filename,
            'doc_type' => $document->doc_type,
            'status' => $document->status->value,
            'mime_type' => $document->mime_type,
            'file_size' => $document->file_size,
            'error_message' => $document->error_message,
            'created_at' => $document->created_at,
            'updated_at' => $document->updated_at,
        ]);
    }

    public function index(): JsonResponse
    {
        $documents = Document::latest()->paginate(10);

        return response()->json($documents);
    }
}