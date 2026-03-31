<?php

namespace App\Enums;

enum DossierStatus: string
{
    case RECEIVED = 'RECEIVED';
    case IN_PROGRESS = 'IN_PROGRESS';
    case TO_VALIDATE = 'TO_VALIDATE';
    case PROCESSED = 'PROCESSED';
}