<?php

namespace App\Enums;

enum UserRole: string
{
    case AGENT = 'AGENT';
    case GESTIONNAIRE = 'GESTIONNAIRE';
    case ADMIN = 'ADMIN';
}