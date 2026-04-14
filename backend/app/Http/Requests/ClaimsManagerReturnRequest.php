<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;

class ClaimsManagerReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user) {
            return false;
        }

        return in_array($user->role?->value ?? $user->role, [
            UserRole::CLAIMS_MANAGER->value,
            UserRole::ADMIN->value,
        ], true);
    }

    public function rules(): array
    {
        return [
            'return_note' => ['required', 'string', 'min:5', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'return_note.required' => 'A return note is required.',
            'return_note.min' => 'The return note must be at least 5 characters.',
            'return_note.max' => 'The return note may not be greater than 2000 characters.',
        ];
    }
}