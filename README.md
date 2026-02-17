# Plateforme intelligente d’automatisation du traitement des documents médicaux

## Description
Projet de Fin d’Études (GLSI) réalisé chez CARTE Assurances.
Plateforme web permettant l’automatisation du traitement des documents médicaux 
via OCR, extraction de données et validation Human-in-the-Loop.

## Architecture
Frontend : React.js  
Backend : Laravel (API REST)  
Service IA : FastAPI (Python, Tesseract, OpenCV)  
Base de données : MySQL  

## Fonctionnalités principales
- Upload de documents
- OCR (Tesseract)
- Extraction via Regex
- Scoring de confiance
- Validation HITL
- Export JSON/CSV

## Statut
Version MVP fonctionnelle – évolutions futures prévues (PaddleOCR, spaCy, etc.)
