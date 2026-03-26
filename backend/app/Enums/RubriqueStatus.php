<?php

namespace App\Enums;

enum RubriqueStatus: string
{
    case PENDING = 'PENDING';
    case ACCEPTED = 'ACCEPTED';
    case REJECTED = 'REJECTED';
    case PARTIAL = 'PARTIAL';
}