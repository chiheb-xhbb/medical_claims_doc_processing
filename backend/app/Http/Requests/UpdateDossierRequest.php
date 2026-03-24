<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDossierRequest extends FormRequest
{
    /**
     * For this MVP, we let the controller handle ownership checks.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Only notes and episode description can be updated here.
     * Both fields are optional, and null is allowed if the user wants to clear them.
     */
    public function rules(): array
    {
        return [
            'episode_description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * Keep the validation messages simple and clear.
     */
    public function messages(): array
    {
        return [
            'episode_description.string' => 'The episode description must be a valid string.',
            'episode_description.max' => 'The episode description cannot be longer than 255 characters.',
            'notes.string' => 'The notes field must be a valid string.',
            'notes.max' => 'The notes field cannot be longer than 1000 characters.',
        ];
    }
}