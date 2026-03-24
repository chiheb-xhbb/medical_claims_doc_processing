<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AttachDocumentsRequest extends FormRequest
{

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'document_ids' => ['required', 'array', 'min:1'],
            'document_ids.*' => ['required', 'integer', 'distinct', 'exists:documents,id'],
        ];
    }


    public function messages(): array
    {
        return [
            'document_ids.required' => 'You need to provide at least one document ID.',
            'document_ids.array' => 'The document IDs must be sent as an array.',
            'document_ids.min' => 'You must attach at least one document.',
            'document_ids.*.required' => 'Each document ID is required.',
            'document_ids.*.integer' => 'Each document ID must be a valid integer.',
            'document_ids.*.distinct' => 'The same document cannot be attached more than once in the same request.',
            'document_ids.*.exists' => 'One or more document IDs do not exist.',
        ];
    }
}