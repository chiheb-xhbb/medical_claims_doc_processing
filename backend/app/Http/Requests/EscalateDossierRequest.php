<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EscalateDossierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'escalation_reason' => ['required', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'escalation_reason.required' => 'The escalation reason is required.',
            'escalation_reason.string' => 'The escalation reason must be a valid string.',
            'escalation_reason.max' => 'The escalation reason cannot be longer than 1000 characters.',
        ];
    }
}