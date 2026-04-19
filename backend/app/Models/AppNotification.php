<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppNotification extends Model
{
    use HasFactory;

    protected $table = 'app_notifications';

    protected $fillable = [
        'user_id',
        'actor_id',
        'dossier_id',
        'rubrique_id',
        'document_id',
        'type',
        'title',
        'message',
        'action_url',
        'is_read',
        'read_at',
        'meta',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'meta' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function dossier(): BelongsTo
    {
        return $this->belongsTo(Dossier::class);
    }

    public function rubrique(): BelongsTo
    {
        return $this->belongsTo(Rubrique::class);
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }
}