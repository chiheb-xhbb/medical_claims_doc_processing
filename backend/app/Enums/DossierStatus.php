<?php

namespace App\Enums;

enum DossierStatus: string
{
    case RECEIVED = 'RECEIVED';
    case IN_PROGRESS = 'IN_PROGRESS';
    case TO_VALIDATE = 'TO_VALIDATE';
    case EN_DEROGATION = 'EN_DEROGATION';
    case COMPLEMENT_ATTENDU = 'COMPLEMENT_ATTENDU';
    case PROCESSED = 'PROCESSED';
}