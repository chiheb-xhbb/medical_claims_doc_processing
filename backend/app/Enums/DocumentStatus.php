<?php

namespace App\Enums;

enum DocumentStatus: string
{
    case UPLOADED = 'UPLOADED';
    case PROCESSING = 'PROCESSING';
    case PROCESSED = 'PROCESSED';
    case VALIDATED = 'VALIDATED';
    case FAILED = 'FAILED';
}
