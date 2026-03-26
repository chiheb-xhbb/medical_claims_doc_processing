<?php

namespace App\Models;

use App\Enums\DocumentDecisionStatus;
use App\Enums\DocumentStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'original_filename',
        'file_path',
        'mime_type',
        'file_size',
        'doc_type',
        'status',
        'error_message',
        'user_id',
        'validated_by',
        'validated_at',
    ];

    protected $casts = [
        'status' => DocumentStatus::class,
        'decision_status' => DocumentDecisionStatus::class,
        'file_size' => 'integer',
        'validated_at' => 'datetime',
        'decision_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function aiRequests(): HasMany
    {
        return $this->hasMany(AiRequest::class);
    }

    public function extractions(): HasMany
    {
        return $this->hasMany(Extraction::class);
    }

    public function fieldCorrections(): HasMany
    {
        return $this->hasMany(FieldCorrection::class);
    }

    public function validator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    public function decisionMaker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decision_by');
    }

    // kept temporarily during the rubrique refactor
    public function dossier(): BelongsTo
    {
        return $this->belongsTo(Dossier::class);
    }

    public function rubrique(): BelongsTo
    {
        return $this->belongsTo(Rubrique::class);
    }
}