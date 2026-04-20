<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DossierWorkflowEvent extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'dossier_workflow_events';

    protected $fillable = [
        'dossier_id',
        'actor_id',
        'event_type',
        'from_status',
        'to_status',
        'title',
        'description',
        'note',
        'meta',
        'created_at',
    ];

    protected $casts = [
        'meta' => 'array',
        'created_at' => 'datetime',
    ];

    protected $dateFormat = 'Y-m-d H:i:s';

    public function dossier(): BelongsTo
    {
        return $this->belongsTo(Dossier::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}