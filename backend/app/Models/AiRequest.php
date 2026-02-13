<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'request_id',
        'document_id',
        'doc_type_sent',
        'http_status',
        'status',
        'processing_time_ms',
        'error_message',
    ];

    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    public function extraction()
    {
        return $this->hasOne(Extraction::class);
    }
}