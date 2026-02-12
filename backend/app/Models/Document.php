<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Enums\DocumentStatus;

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
    ];

    protected $casts = [
        'status' => DocumentStatus::class,
        'file_size' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}