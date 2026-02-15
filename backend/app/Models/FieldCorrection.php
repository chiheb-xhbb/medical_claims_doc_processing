<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FieldCorrection extends Model
{
    use HasFactory;
    protected $fillable = [
        'document_id',
        'field_name',
        'original_value',
        'corrected_value',
        'user_id',
    ];
    
    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
