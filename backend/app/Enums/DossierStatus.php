<?php

namespace App\Enums;

enum DossierStatus: string {
    case RECU = 'RECU';
    case EN_TRAITEMENT = 'EN_TRAITEMENT';
    case A_VALIDER = 'A_VALIDER';
    case VALIDE = 'VALIDE';
    case REJETE = 'REJETE';
    case EXPORTE = 'EXPORTE';
}