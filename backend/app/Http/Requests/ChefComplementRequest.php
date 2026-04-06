<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ChefComplementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'decision_note' => ['required', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'decision_note.required' => 'A complement request note is required.',
            'decision_note.string' => 'The decision note must be a valid string.',
            'decision_note.max' => 'The decision note cannot be longer than 1000 characters.',
        ];
    }
}