<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Extraction extends Model
{
    use HasFactory;

    protected $fillable = [
        'document_id',
        'ai_request_id',
        'version',
        'result_json',
    ];

    protected $casts = [
        'result_json' => 'array',
    ];

    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    public function aiRequest()
    {
        return $this->belongsTo(AiRequest::class);
    }
}