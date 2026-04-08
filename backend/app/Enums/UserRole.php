<?php

namespace App\Enums;

enum UserRole: string
{
    case AGENT = 'AGENT';
    case CLAIMS_MANAGER = 'CLAIMS_MANAGER';
    case SUPERVISOR = 'SUPERVISOR';
    case ADMIN = 'ADMIN';
}