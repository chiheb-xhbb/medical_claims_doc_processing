<?php

namespace App\Http\Controllers\Api;

use App\Enums\DocumentStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDocumentRequest;
use App\Jobs\ProcessDocumentJob;
use App\Models\Document;
use App\Models\User;
use App\Services\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function __construct(
        private DocumentService $documentService
    ) {}

    public function store(StoreDocumentRequest $request): JsonResponse
    {
        $docType = $request->validated('doc_type') ?? 'medical_invoice';

        $document = $this->documentService->store(
            file: $request->file('file'),
            userId: auth()->id(),
            docType: $docType
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

    public function show(Request $request, Document $document): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $this->canViewDocument($user, $document)) {
            abort(403, 'Unauthorized access to this document.');
        }

        $latestExtraction = $document->extractions()
            ->latest('version')
            ->first();

        return response()->json([
            'id' => $document->id,
            'original_filename' => $document->original_filename,
            'doc_type' => $document->doc_type,
            'status' => $document->status->value,
            'mime_type' => $document->mime_type,
            'file_size' => $document->file_size,
            'error_message' => $document->error_message,
            'validated_by' => $document->validated_by,
            'validated_at' => $document->validated_at,
            'created_at' => $document->created_at,
            'updated_at' => $document->updated_at,
            'latest_extraction' => $latestExtraction ? [
                'version' => $latestExtraction->version,
                'fields' => $latestExtraction->result_json['fields'] ?? [],
                'confidence' => $latestExtraction->result_json['confidence'] ?? [],
                'warnings' => $latestExtraction->result_json['warnings'] ?? [],
                'meta' => $latestExtraction->result_json['meta'] ?? [],
            ] : null,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $query = Document::query();

        if ($this->hasRole($user, UserRole::AGENT)) {
            $query->where('user_id', $user->id);
        } elseif (! $this->hasRole($user, UserRole::GESTIONNAIRE, UserRole::ADMIN)) {
            return response()->json([
                'message' => 'You are not allowed to view documents.',
            ], 403);
        }

        $documents = $query
            ->latest()
            ->paginate(10);

        return response()->json($documents);
    }

    public function retry(Document $document): JsonResponse
    {
        // For now, a user can only retry their own failed documents.
        if ($document->user_id !== auth()->id()) {
            abort(403, 'Unauthorized retry attempt.');
        }

        return DB::transaction(function () use ($document) {
            // Lock the row to avoid duplicate retry actions at the same time.
            $document = Document::whereKey($document->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($document->status !== DocumentStatus::FAILED) {
                return response()->json([
                    'message' => 'Only FAILED documents can be retried.',
                    'current_status' => $document->status->value,
                ], 400);
            }

            // Retry only makes sense if the original file is still present.
            if (!Storage::disk('local')->exists($document->file_path)) {
                return response()->json([
                    'message' => 'Cannot retry this document because the source file is missing.',
                ], 422);
            }

            $document->update([
                'status' => DocumentStatus::UPLOADED,
                'error_message' => null,
            ]);

            // Re-dispatch OCR/extraction only after the status update is committed.
            ProcessDocumentJob::dispatch($document->id)->afterCommit();

            return response()->json([
                'message' => 'Document queued for reprocessing.',
                'document' => [
                    'id' => $document->id,
                    'status' => $document->status->value,
                ],
            ], 202);
        });
    }

    private function canViewDocument(User $user, Document $document): bool
    {
        if ($this->hasRole($user, UserRole::GESTIONNAIRE, UserRole::ADMIN)) {
            return true;
        }

        return $this->hasRole($user, UserRole::AGENT)
            && (int) $document->user_id === (int) $user->id;
    }

    private function hasRole(User $user, UserRole ...$roles): bool
    {
        $currentRole = $user->role instanceof UserRole
            ? $user->role
            : UserRole::tryFrom((string) $user->role);

        if (! $currentRole) {
            return false;
        }

        return in_array($currentRole, $roles, true);
    }
}
