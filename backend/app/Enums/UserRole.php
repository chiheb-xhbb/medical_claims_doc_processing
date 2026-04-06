<?php

namespace App\Enums;

enum UserRole: string
{
    case AGENT = 'AGENT';
    case GESTIONNAIRE = 'GESTIONNAIRE';
    case CHEF_HIERARCHIQUE = 'CHEF_HIERARCHIQUE';
    case ADMIN = 'ADMIN';
}