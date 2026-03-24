<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDossierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'assured_identifier' => ['required', 'string', 'size:8'],
            'episode_description' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'assured_identifier.required' => 'The insured CIN is required.',
            'assured_identifier.size' => 'The insured CIN must be exactly 8 characters.',
            'episode_description.max' => 'The episode description cannot be longer than 255 characters.',
            'notes.max' => 'The notes field cannot be longer than 1000 characters.',
        ];
    }
}