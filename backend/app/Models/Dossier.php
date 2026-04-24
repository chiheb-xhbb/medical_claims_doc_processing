<?php

namespace App\Models;

use App\Enums\DossierStatus;
use App\Enums\DocumentDecisionStatus;
use App\Enums\DocumentStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class Dossier extends Model
{
    use HasFactory;

    protected $fillable = [
        'numero_dossier',
        'assured_identifier',
        'episode_description',
        'created_by',
        'status',
        'notes',
        'returned_to_preparation_by',
        'returned_to_preparation_at',
        'returned_to_preparation_note',
        'awaiting_complement_source',
        'awaiting_complement_by',
        'awaiting_complement_at',
        'awaiting_complement_note',
    ];

    protected $casts = [
        'status' => DossierStatus::class,
        'montant_total' => 'decimal:3',
        'submitted_at' => 'datetime',
        'processed_at' => 'datetime',
        'escalated_at' => 'datetime',
        'chef_decision_at' => 'datetime',
        'returned_to_preparation_at' => 'datetime',
        'awaiting_complement_at' => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($dossier) {
            if (empty($dossier->numero_dossier)) {
                $random = strtoupper(Str::random(6));
                $dossier->numero_dossier = 'DOS-' . now()->format('Ymd') . '-' . $random;
            }
        });
    }

    public function rubriques(): HasMany
    {
        return $this->hasMany(Rubrique::class);
    }

    public function documents(): HasManyThrough
    {
        return $this->hasManyThrough(Document::class, Rubrique::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function escalator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'escalated_by');
    }

    public function chefDecisionMaker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'chef_decision_by');
    }

    public function returnedToPreparationBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'returned_to_preparation_by');
    }
    
    public function awaitingComplementBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'awaiting_complement_by');
    }

    public function workflowEvents(): HasMany
    {
        return $this->hasMany(DossierWorkflowEvent::class)
            ->orderBy('created_at', 'asc');
    }

    public function isFrozen(): bool
    {
        return $this->status === DossierStatus::PROCESSED;
    }

    public function canBeDeleted(): bool
    {
        return $this->status === DossierStatus::RECEIVED;
    }

    public function canBeSubmitted(): bool
    {
        return in_array($this->status, [
            DossierStatus::IN_PROGRESS,
            DossierStatus::AWAITING_COMPLEMENT,
        ], true)
            && $this->rubriques()->exists()
            && $this->documents()->exists();
    }

    public function canBeProcessed(): bool
    {
        if ($this->status !== DossierStatus::UNDER_REVIEW) {
            return false;
        }

        if (! $this->documents()->exists()) {
            return false;
        }

        return ! $this->documents()
            ->where('documents.decision_status', DocumentDecisionStatus::PENDING->value)
            ->exists();
    }

    public function canBeEscalated(): bool
    {
        return $this->status === DossierStatus::UNDER_REVIEW && ! $this->isFrozen();
    }

    public function canBeChefReviewed(): bool
    {
        return $this->status === DossierStatus::IN_ESCALATION;
    }

    public function canBeResubmittedAfterComplement(): bool
    {
        return $this->status === DossierStatus::AWAITING_COMPLEMENT
            && $this->rubriques()->exists()
            && $this->documents()->exists();
    }

    public function getRequestedTotal(): float
    {
        return $this->getFinancialSummary()['requested_total'];
    }

    public function getCurrentTotal(): float
    {
        return $this->getAcceptedTotal();
    }

    public function getAcceptedTotal(): float
    {
        return $this->getFinancialSummary()['accepted_total'];
    }

    public function getRejectedTotal(): float
    {
        return $this->getFinancialSummary()['rejected_total'];
    }

    public function getFinalReimbursableTotal(): ?float
    {
        return $this->status === DossierStatus::PROCESSED
            ? (float) $this->montant_total
            : null;
    }

    public function getFinancialSummary(): array
    {
        $requestedTotal = 0.0;
        $acceptedTotal = 0.0;
        $rejectedTotal = 0.0;

        $documents = $this->getFinancialSummaryDocuments();

        foreach ($documents as $document) {
            $documentTotal = $document->getLatestExtractedTotalTtc();
            $requestedTotal += $documentTotal;

            $decisionStatus = $document->decision_status?->value ?? $document->decision_status;

            if ($decisionStatus === DocumentDecisionStatus::ACCEPTED->value) {
                $acceptedTotal += $documentTotal;
            }

            if ($decisionStatus === DocumentDecisionStatus::REJECTED->value) {
                $rejectedTotal += $documentTotal;
            }
        }

        return [
            'requested_total' => $requestedTotal,
            'accepted_total' => $acceptedTotal,
            'rejected_total' => $rejectedTotal,
            'final_reimbursable_total' => $this->getFinalReimbursableTotal(),
        ];
    }

    public function toFinancialTotalsPayload(): array
    {
        $financialSummary = $this->getFinancialSummary();
        $acceptedTotal = $financialSummary['accepted_total'];
        $finalReimbursableTotal = $financialSummary['final_reimbursable_total'];

        return [
            'requested_total' => $financialSummary['requested_total'],
            'current_total' => $acceptedTotal,
            'display_total' => $finalReimbursableTotal ?? $acceptedTotal,
            'financial_summary' => $financialSummary,
        ];
    }

    public function getDisplayTotal(): float
    {
        $financialSummary = $this->getFinancialSummary();

        return (float) ($financialSummary['final_reimbursable_total'] ?? $financialSummary['accepted_total']);
    }

    public function updateTotal(): void
    {
        if (! $this->isFrozen()) {
            $this->montant_total = $this->getCurrentTotal();
            $this->saveQuietly();
        }
    }

    private function getFinancialSummaryDocuments(): Collection
    {
        $loadedDocuments = $this->getLoadedFinancialSummaryDocuments();

        if ($loadedDocuments !== null) {
            return $loadedDocuments;
        }

        return $this->documents()
            ->where('documents.status', DocumentStatus::VALIDATED->value)
            ->with('latestExtraction')
            ->get();
    }

    private function getLoadedFinancialSummaryDocuments(): ?Collection
    {
        if ($this->relationLoaded('documents')) {
            return collect($this->getRelation('documents'))
                ->filter(fn (Document $document) => $this->isValidatedDocument($document))
                ->values();
        }

        if (! $this->relationLoaded('rubriques')) {
            return null;
        }

        if (! $this->rubriques->every(fn (Rubrique $rubrique) => $rubrique->relationLoaded('documents'))) {
            return null;
        }

        return $this->rubriques
            ->flatMap(fn (Rubrique $rubrique) => $rubrique->documents)
            ->filter(fn (Document $document) => $this->isValidatedDocument($document))
            ->values();
    }

    private function isValidatedDocument(Document $document): bool
    {
        return ($document->status?->value ?? $document->status) === DocumentStatus::VALIDATED->value;
    }

}
