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
            'user_id' => $document->user_id,
            'dossier_id' => $document->dossier_id,
            'rubrique_id' => $document->rubrique_id,
            'decision_status' => $document->decision_status?->value ?? $document->decision_status,
            'decision_by' => $document->decision_by,
            'decision_at' => $document->decision_at,
            'decision_note' => $document->decision_note,
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

        $search = trim((string) $request->query('search', ''));
        $status = trim((string) $request->query('status', ''));
        $docType = trim((string) $request->query('doc_type', ''));
        $fromDate = trim((string) $request->query('from_date', ''));
        $toDate = trim((string) $request->query('to_date', ''));
        $sortBy = trim((string) $request->query('sort_by', 'created_at'));
        $sortDirection = strtolower(trim((string) $request->query('sort_direction', 'desc')));
        $perPage = max(1, min((int) $request->query('per_page', 10), 50));

        $allowedStatuses = array_map(
            fn (DocumentStatus $case) => $case->value,
            DocumentStatus::cases()
        );
        $allowedSortFields = ['id', 'status', 'created_at'];
        $allowedSortDirections = ['asc', 'desc'];

        if (! in_array($sortBy, $allowedSortFields, true)) {
            $sortBy = 'created_at';
        }

        if (! in_array($sortDirection, $allowedSortDirections, true)) {
            $sortDirection = 'desc';
        }

        $query = Document::query();

        if ($this->hasRole($user, UserRole::AGENT)) {
            $query->where('user_id', $user->id);
        } elseif (! $this->hasRole($user, UserRole::CLAIMS_MANAGER, UserRole::ADMIN)) {
            return response()->json([
                'message' => 'You are not allowed to view documents.',
            ], 403);
        }

        $query
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($subQuery) use ($search) {
                    $subQuery->where('original_filename', 'like', "%{$search}%");

                    if (ctype_digit($search)) {
                        $subQuery->orWhere('id', (int) $search);
                    }
                });
            })
            ->when(in_array($status, $allowedStatuses, true), function ($q) use ($status) {
                $q->where('status', $status);
            })
            ->when($docType !== '', function ($q) use ($docType) {
                $q->where('doc_type', $docType);
            })
            ->when($fromDate !== '', function ($q) use ($fromDate) {
                $q->whereDate('created_at', '>=', $fromDate);
            })
            ->when($toDate !== '', function ($q) use ($toDate) {
                $q->whereDate('created_at', '<=', $toDate);
            });

        $query->orderBy($sortBy, $sortDirection);

        if ($sortBy !== 'id') {
            $query->orderBy('id', $sortDirection);
        }

        $documents = $query
            ->paginate($perPage)
            ->appends($request->query());

        return response()->json($documents);
    }

    public function destroy(Request $request, Document $document): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $result = DB::transaction(function () use ($document, $user) {
            /** @var Document $lockedDocument */
            $lockedDocument = Document::query()
                ->whereKey($document->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $this->canDeleteDocument($user, $lockedDocument)) {
                return response()->json([
                    'message' => 'You are not allowed to delete this document.',
                ], 403);
            }

            $currentStatus = $lockedDocument->status instanceof DocumentStatus
                ? $lockedDocument->status->value
                : (string) $lockedDocument->status;

            if (! in_array($currentStatus, [
                DocumentStatus::UPLOADED->value,
                DocumentStatus::FAILED->value,
                DocumentStatus::PROCESSED->value,
            ], true)) {
                return response()->json([
                    'message' => 'Only UPLOADED, FAILED, or PROCESSED documents can be deleted.',
                    'current_status' => $currentStatus,
                ], 422);
            }

            if ($lockedDocument->rubrique_id !== null || $lockedDocument->dossier_id !== null) {
                return response()->json([
                    'message' => 'You cannot delete a document that is already attached to a dossier/rubrique.',
                ], 422);
            }

            $filePath = $lockedDocument->file_path;
            $lockedDocument->delete();

            return $filePath;
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        if (is_string($result) && $result !== '') {
            Storage::disk('local')->delete($result);
        }

        return response()->json([
            'message' => 'Document deleted successfully.',
        ], 200);
    }

    public function retry(Document $document): JsonResponse
    {
        if ($document->user_id !== auth()->id()) {
            abort(403, 'Unauthorized retry attempt.');
        }

        return DB::transaction(function () use ($document) {
            $document = Document::whereKey($document->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($document->status !== DocumentStatus::FAILED) {
                return response()->json([
                    'message' => 'Only FAILED documents can be retried.',
                    'current_status' => $document->status->value,
                ], 400);
            }

            if (! Storage::disk('local')->exists($document->file_path)) {
                return response()->json([
                    'message' => 'Cannot retry this document because the source file is missing.',
                ], 422);
            }

            $document->update([
                'status' => DocumentStatus::UPLOADED,
                'error_message' => null,
            ]);

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
        if ($this->hasRole($user, UserRole::CLAIMS_MANAGER, UserRole::ADMIN)) {
            return true;
        }

        return $this->hasRole($user, UserRole::AGENT)
            && (int) $document->user_id === (int) $user->id;
    }

    private function canDeleteDocument(User $user, Document $document): bool
    {
        if ($this->hasRole($user, UserRole::ADMIN, UserRole::CLAIMS_MANAGER)) {
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
