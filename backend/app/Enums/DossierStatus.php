<?php

namespace App\Enums;

enum DossierStatus: string
{
    case RECEIVED = 'RECEIVED';
    case IN_PROGRESS = 'IN_PROGRESS';
    case UNDER_REVIEW = 'UNDER_REVIEW';
    case IN_ESCALATION = 'IN_ESCALATION';
    case AWAITING_COMPLEMENT = 'AWAITING_COMPLEMENT';
    case PROCESSED = 'PROCESSED';
}