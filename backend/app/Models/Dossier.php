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
    ];

    protected $casts = [
        'status' => DossierStatus::class,
        'montant_total' => 'decimal:3',
        'submitted_at' => 'datetime',
        'processed_at' => 'datetime',
        'escalated_at' => 'datetime',
        'chef_decision_at' => 'datetime',
        'returned_to_preparation_at' => 'datetime',
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
        $total = 0.0;

        $validatedDocuments = $this->documents()
            ->where('documents.status', DocumentStatus::VALIDATED->value)
            ->get();

        foreach ($validatedDocuments as $document) {
            $latestExtraction = $document->extractions()->latest('version')->first();

            if ($latestExtraction) {
                $fields = $latestExtraction->result_json['fields'] ?? [];
                $total += (float) ($fields['total_ttc'] ?? 0);
            }
        }

        return $total;
    }

    public function getCurrentTotal(): float
    {
        $total = 0.0;

        $acceptedDocuments = $this->documents()
            ->where('documents.status', DocumentStatus::VALIDATED->value)
            ->where('documents.decision_status', DocumentDecisionStatus::ACCEPTED->value)
            ->get();

        foreach ($acceptedDocuments as $document) {
            $latestExtraction = $document->extractions()->latest('version')->first();

            if ($latestExtraction) {
                $fields = $latestExtraction->result_json['fields'] ?? [];
                $total += (float) ($fields['total_ttc'] ?? 0);
            }
        }

        return $total;
    }

    public function getDisplayTotal(): float
    {
        return $this->isFrozen()
            ? (float) $this->montant_total
            : $this->getCurrentTotal();
    }

    public function updateTotal(): void
    {
        if (! $this->isFrozen()) {
            $this->montant_total = $this->getCurrentTotal();
            $this->saveQuietly();
        }
    }
}