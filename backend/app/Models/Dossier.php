<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use App\Enums\DossierStatus;

class Dossier extends Model
{
    use HasFactory;

    protected $fillable = [
        'numero_dossier', 
        'assured_identifier', 
        'episode_description', 
        'created_by', 
        'status', 
        'notes'
    ];

    protected $casts = [
        'status' => DossierStatus::class,
        'montant_total' => 'decimal:3',
        'submitted_at' => 'datetime',
        'validated_at' => 'datetime',
    ];

    protected static function boot() 
    {
        parent::boot();
        
        static::creating(function ($dossier) {
            if (empty($dossier->numero_dossier)) {
                $random = strtoupper(Str::random(6));
                $dossier->numero_dossier = 'DOS-' . now()->format('Ymd') . '-' . $random;
            }
        });
    }


    public function documents() 
    { 
        return $this->hasMany(Document::class); 
    }
    
    public function creator() 
    { 
        return $this->belongsTo(User::class, 'created_by'); 
    }
    
    public function validator() 
    { 
        return $this->belongsTo(User::class, 'validated_by'); 
    }


     //buissness logic

    public function isTotalFrozen(): bool
    {
        return in_array($this->status, [
            DossierStatus::VALIDE, 
            DossierStatus::REJETE, 
            DossierStatus::EXPORTE
        ]);
    }

    public function canBeDeleted(): bool
    {
        return !in_array($this->status, [
            DossierStatus::VALIDE, 
            DossierStatus::EXPORTE
        ]);
    }

    public function getCurrentTotal(): float
    {
        $total = 0.0;
        
        $validatedDocuments = $this->documents()->where('status', 'VALIDATED')->get();
        
        foreach ($validatedDocuments as $document) {
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
        return $this->isTotalFrozen() 
            ? (float) $this->montant_total 
            : $this->getCurrentTotal();
    }

    public function updateTotal(): void
    {
        if (!$this->isTotalFrozen()) {
            $this->montant_total = $this->getCurrentTotal();
            $this->saveQuietly();
        }
    }
}