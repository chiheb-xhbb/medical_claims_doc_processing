<?php

namespace App\Models;

use App\Enums\DocumentDecisionStatus;
use App\Enums\RubriqueStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Rubrique extends Model
{
    use HasFactory;

    protected $fillable = [
        'dossier_id',
        'title',
        'status',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'status' => RubriqueStatus::class,
        'rejected_at' => 'datetime',
    ];

    public function dossier(): BelongsTo
    {
        return $this->belongsTo(Dossier::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function refreshStatusFromDocuments(): void
    {
        $documents = $this->documents()->get();

        if ($documents->isEmpty()) {
            $this->status = RubriqueStatus::PENDING;
            $this->saveQuietly();

            return;
        }

        $decisionStatuses = $documents
            ->pluck('decision_status')
            ->map(fn ($status) => $status?->value ?? $status)
            ->filter()
            ->values();

        if (
            $decisionStatuses->isEmpty()
            || $decisionStatuses->every(fn ($status) => $status === DocumentDecisionStatus::PENDING->value)
        ) {
            $this->status = RubriqueStatus::PENDING;
        } elseif ($decisionStatuses->every(fn ($status) => $status === DocumentDecisionStatus::ACCEPTED->value)) {
            $this->status = RubriqueStatus::ACCEPTED;
        } elseif ($decisionStatuses->every(fn ($status) => $status === DocumentDecisionStatus::REJECTED->value)) {
            $this->status = RubriqueStatus::REJECTED;
        } else {
            $this->status = RubriqueStatus::PARTIAL;
        }

        $this->saveQuietly();
    }

    public function rejectWholeRubrique(?int $decisionBy = null, ?string $decisionNote = null): void
    {
        foreach ($this->documents as $document) {
            $document->decision_status = DocumentDecisionStatus::REJECTED;
            $document->decision_by = $decisionBy;
            $document->decision_at = now();

            if ($decisionNote !== null) {
                $document->decision_note = $decisionNote;
            }

            $document->save();
        }

        $this->rejected_by = $decisionBy;
        $this->rejected_at = now();
        $this->status = RubriqueStatus::REJECTED;
        $this->saveQuietly();

        $this->dossier?->updateTotal();
    }

    public function rejector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }
}