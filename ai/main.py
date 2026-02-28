from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pytesseract
from PIL import Image
import fitz  # PyMuPDF
import io
import re
import time
import uuid
import os
from typing import Optional
from datetime import datetime

# Configure Tesseract executable path dynamically to ensure cross-platform portability.
tesseract_path = os.getenv('TESSERACT_CMD')
if tesseract_path:
    # Prefer environment variable for containerized or production environments.
    pytesseract.pytesseract.tesseract_cmd = tesseract_path
elif os.name == 'nt':
    # Fallback to standard Windows installation path for local development.
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
# Note: POSIX systems (Linux/macOS) typically resolve 'tesseract' via system PATH automatically.

app = FastAPI(title="Medical Document Processing API")

# Configure Cross-Origin Resource Sharing (CORS) policies.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define the expected data contract schema (v1).
REQUIRED_FIELDS = ["invoice_date", "provider_name", "total_ttc"]

# Baseline confidence threshold for identifying missing entities.
MISSING_FIELD_CONFIDENCE = 0.0


@app.get("/health")
def health():
    """Endpoint to verify service availability and operational status."""
    return {"status": "ok", "service": "medical-doc-ocr"}


@app.post("/process")
async def process_document(
    file: UploadFile = File(...),
    doc_type: Optional[str] = Form("medical_invoice")
):
    """
    Process an uploaded medical document utilizing Optical Character Recognition (OCR).
    Returns a standardized JSON payload strictly adhering to the v1 data contract.
    
    Constraint limitation: The current implementation processes only the initial page of multi-page PDFs.
    """
    start_time = time.time()
    request_id = str(uuid.uuid4())
    
    # Initialize response schema with null values to maintain a strict API contract.
    fields = {key: None for key in REQUIRED_FIELDS}
    confidence = {key: MISSING_FIELD_CONFIDENCE for key in REQUIRED_FIELDS}
    extra = {}
    warnings = []
    errors = []
    
    try:
        # Read file buffer into memory.
        contents = await file.read()
        
        # Enforce payload size constraints (10MB threshold).
        if len(contents) > 10 * 1024 * 1024:
            raise ValueError("Payload size exceeds the 10MB limit.")
        
        # Validate MIME type and file extension compatibility.
        filename = file.filename or "unknown"
        if not is_supported_file(filename):
            raise ValueError(f"Unsupported file format: {filename}")
        
        # Perform text extraction (Image or PDF parsing).
        text = extract_text_from_file(contents, filename)
        
        # Execute regex-based entity extraction.
        extracted, extra_fields = extract_fields_from_text(text, doc_type)
        
        # Map extracted entities to the standardized response schema.
        for key in REQUIRED_FIELDS:
            if key in extracted:
                fields[key] = extracted[key]
        
        # Append auxiliary data and a textual preview for diagnostic purposes.
        extra = extra_fields
        extra["text_preview"] = text[:200] if text else ""
        
        # Compute confidence matrices for extracted entities.
        confidence = calculate_confidence(fields, text)
        
        # Append diagnostic warnings for sub-optimal extraction results.
        warnings = generate_warnings(fields, confidence)
        
        # Calculate algorithmic execution time.
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        return {
            "meta": {
                "doc_type": doc_type,
                "request_id": request_id,
                "processing_time_ms": processing_time_ms,
                "ocr_engine": "tesseract",
                "extra": extra,
                "note": "Limitation: Single-page processing enforced for PDF artifacts."
            },
            "fields": fields,
            "confidence": confidence,
            "warnings": warnings,
            "errors": errors
        }
    
    except ValueError as e:
        # Handle client-side validation failures (HTTP 400 Bad Request).
        processing_time_ms = int((time.time() - start_time) * 1000)
        return JSONResponse(
            status_code=400,
            content={
                "meta": {
                    "doc_type": doc_type,
                    "request_id": request_id,
                    "processing_time_ms": processing_time_ms,
                    "extra": {},
                    "error": str(e)
                },
                "fields": fields,
                "confidence": confidence,
                "warnings": [],
                "errors": [str(e)]
            }
        )
    
    except Exception as e:
        # Handle internal server anomalies (HTTP 500 Internal Server Error).
        processing_time_ms = int((time.time() - start_time) * 1000)
        return JSONResponse(
            status_code=500,
            content={
                "meta": {
                    "doc_type": doc_type,
                    "request_id": request_id,
                    "processing_time_ms": processing_time_ms,
                    "extra": {},
                    "error": "Internal server error"
                },
                "fields": fields,
                "confidence": confidence,
                "warnings": [],
                "errors": [f"Processing pipeline failed: {str(e)}"]
            }
        )


def is_supported_file(filename: str) -> bool:
    """Evaluate file extension against the whitelist of supported formats."""
    supported_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif']
    return any(filename.lower().endswith(ext) for ext in supported_extensions)


def extract_text_from_file(contents: bytes, filename: str) -> str:
    """
    Execute Optical Character Recognition on the provided byte stream.
    PDF streams are converted to high-DPI raster images prior to OCR analysis.
    """
    filename_lower = filename.lower()
    
    if filename_lower.endswith('.pdf'):
        # Convert the primary PDF page into a high-resolution byte array.
        with fitz.open(stream=contents, filetype="pdf") as pdf_document:
            if len(pdf_document) == 0:
                raise ValueError("The provided PDF artifact contains no pages.")
            
            page = pdf_document[0]
            pix = page.get_pixmap(dpi=200)  # Enhanced DPI yields superior OCR fidelity.
            image = Image.open(io.BytesIO(pix.tobytes("png")))
    else:
        # Decode raw image bytes.
        try:
            image = Image.open(io.BytesIO(contents))
        except Exception as e:
            raise ValueError(f"Corrupted or invalid image byte stream: {str(e)}")
    
    # Apply greyscale preprocessing to optimize Tesseract contrast detection.
    if image.mode != 'L':
        image = image.convert('L')
    
    # Execute the underlying Tesseract C++ engine.
    text = pytesseract.image_to_string(image, lang='fra+eng')
    return text


def extract_fields_from_text(text: str, doc_type: str) -> tuple[dict, dict]:
    """
    Apply regular expressions and heuristic parsing to extract semantic entities.
    Returns a tuple containing mapped required entities and unmapped supplementary data.
    """
    required_fields = {}
    extra_fields = {}
    
    # Isolate standardized temporal markers (Dates).
    date_pattern = r'(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}[/-]\d{2}[/-]\d{2})'
    date_match = re.search(date_pattern, text)
    if date_match:
        required_fields["invoice_date"] = normalize_date(date_match.group(1))
    
    # Isolate fiscal values utilizing proximity heuristics to keywords (TTC, Total).
    amount_pattern = r'(?:total|ttc|montant)[^\d]*(\d+[.,]\d{2})\s*(?:€|EUR|DT|TND)?'
    amount_match = re.search(amount_pattern, text, re.IGNORECASE)
    if amount_match:
        required_fields["total_ttc"] = float(amount_match.group(1).replace(',', '.'))
    
    # Heuristic determination of provider identity based on structural positioning.
    # Excludes common document headers to isolate the corporate entity.
    header_words = ['facture', 'invoice', 'labo', 'laboratoire', 'pharmacie', 'ordonnance', 'reçu']
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    
    for line in lines:
        line_lower = line.lower()
        if not any(line_lower == hw or line_lower.startswith(hw + ' ') for hw in header_words):
            if re.search(r'[A-Za-zÀ-ÿ]{2,}', line):
                required_fields["provider_name"] = line[:50]
                break
    
    # Fallback protocol if structural heuristics fail.
    if "provider_name" not in required_fields and lines:
        required_fields["provider_name"] = lines[0][:50]
    
    # Supplementary entity extraction: Patient demographics.
    patient_pattern = r'(?:patient|nom|client)[:\s]+([A-Za-zÀ-ÿ\s]+)'
    patient_match = re.search(patient_pattern, text, re.IGNORECASE)
    if patient_match:
        extra_fields["patient_name"] = patient_match.group(1).strip()[:50]
    
    # Volumetric metric for payload diagnostics.
    extra_fields["text_length"] = len(text)
    
    return required_fields, extra_fields


def normalize_date(date_str: str) -> str:
    """
    Standardize diverse date string representations into ISO 8601 subset format (YYYY-MM-DD).
    """
    formats = [
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%Y-%m-%d",
        "%Y/%m/%d",
    ]
    
    for fmt in formats:
        try:
            parsed = datetime.strptime(date_str, fmt)
            return parsed.strftime("%Y-%m-%d")
        except ValueError:
            continue
    
    # Return unparsed string if it deviates from expected formatting protocols.
    return date_str


def calculate_confidence(fields: dict, text: str) -> dict:
    """
    Compute deterministic confidence coefficients for extracted entities.
    Variables are scored based on the rigidity of their extraction pattern.
    """
    confidence = {}
    
    for field_name in REQUIRED_FIELDS:
        value = fields.get(field_name)
        
        if value is None:
            # Null entities mandate a 0.0 coefficient to trigger manual review workflows.
            confidence[field_name] = 0.0
        elif field_name == "invoice_date":
            # Strict regex matching yields high statistical confidence.
            confidence[field_name] = 0.85
        elif field_name == "total_ttc" and isinstance(value, (int, float)):
            confidence[field_name] = 0.80
        elif field_name == "provider_name":
            # Structural heuristics exhibit higher variance, necessitating a lower coefficient.
            confidence[field_name] = 0.65
        else:
            confidence[field_name] = 0.60
    
    return confidence


def generate_warnings(fields: dict, confidence: dict) -> list:
    """
    Compile a diagnostic array of warnings based on threshold validations.
    Triggers on entity omission or sub-optimal confidence coefficients.
    """
    warnings = []
    
    for field_name in REQUIRED_FIELDS:
        value = fields.get(field_name)
        score = confidence.get(field_name, 0.0)
        
        if value is None:
            warnings.append(f"Entity omission detected for required parameter: '{field_name}'")
        elif score < 0.70:
            warnings.append(f"Sub-optimal confidence coefficient ({score:.0%}) for entity: '{field_name}'")
    
    return warnings