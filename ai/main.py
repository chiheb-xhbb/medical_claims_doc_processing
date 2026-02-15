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
from typing import Optional
from datetime import datetime

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
app = FastAPI(title="Medical Document Processing API")

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Stable field keys (contract v1)
REQUIRED_FIELDS = ["invoice_date", "provider_name", "total_ttc"]

# Confidence score for missing fields (triggers highlight in UI)
MISSING_FIELD_CONFIDENCE = 0.0


@app.get("/health")
def health():
    """Health check endpoint"""
    return {"status": "ok", "service": "medical-doc-ocr"}


@app.post("/process")
async def process_document(
    file: UploadFile = File(...),
    doc_type: Optional[str] = Form(None)
):
    """
    Process medical document with OCR
    Returns: Contract v1 compliant JSON with stable keys
    
    Note: MVP processes first page only for multi-page PDFs
    """
    start_time = time.time()
    request_id = str(uuid.uuid4())
    
    # Initialize stable response structure
    fields = {key: None for key in REQUIRED_FIELDS}
    confidence = {key: MISSING_FIELD_CONFIDENCE for key in REQUIRED_FIELDS}
    extra = {}
    warnings = []
    errors = []
    
    try:
        # Read and validate file
        contents = await file.read()
        
        # Check file size (max 10MB)
        if len(contents) > 10 * 1024 * 1024:
            raise ValueError("File size exceeds 10MB limit")
        
        # Validate file type
        filename = file.filename or "unknown"
        if not is_supported_file(filename):
            raise ValueError(f"Unsupported file type: {filename}")
        
        # Extract text from file (image or PDF - first page only)
        text = extract_text_from_file(contents, filename)
        
        # Extract fields
        extracted, extra_fields = extract_fields_from_text(text, doc_type or 'unknown')
        
        # Merge extracted into stable fields
        for key in REQUIRED_FIELDS:
            if key in extracted:
                fields[key] = extracted[key]
        
        # Store extra fields in meta (including text_preview for debugging)
        extra = extra_fields
        extra["text_preview"] = text[:200] if text else ""
        
        # Calculate confidence scores
        confidence = calculate_confidence(fields, text)
        
        # Generate warnings for low confidence AND missing fields
        warnings = generate_warnings(fields, confidence)
        
        # Calculate processing time
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Return contract v1 format
        return {
            "meta": {
                "doc_type": doc_type or "unknown",
                "request_id": request_id,
                "processing_time_ms": processing_time_ms,
                "ocr_engine": "tesseract",
                "extra": extra,
                "note": "MVP: first page only for multi-page PDFs"
            },
            "fields": fields,
            "confidence": confidence,
            "warnings": warnings,
            "errors": errors
        }
    
    except ValueError as e:
        # Client error (400)
        processing_time_ms = int((time.time() - start_time) * 1000)
        return JSONResponse(
            status_code=400,
            content={
                "meta": {
                    "doc_type": doc_type or "unknown",
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
        # Server error (500)
        processing_time_ms = int((time.time() - start_time) * 1000)
        return JSONResponse(
            status_code=500,
            content={
                "meta": {
                    "doc_type": doc_type or "unknown",
                    "request_id": request_id,
                    "processing_time_ms": processing_time_ms,
                    "extra": {},
                    "error": "Internal server error"
                },
                "fields": fields,
                "confidence": confidence,
                "warnings": [],
                "errors": [f"Processing failed: {str(e)}"]
            }
        )


def is_supported_file(filename: str) -> bool:
    """Check if file type is supported"""
    supported_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif']
    return any(filename.lower().endswith(ext) for ext in supported_extensions)


def extract_text_from_file(contents: bytes, filename: str) -> str:
    """
    Extract text from image or PDF using OCR
    Note: For PDF, only first page is processed (MVP limitation)
    """
    filename_lower = filename.lower()
    
    if filename_lower.endswith('.pdf'):
        # PDF: extract first page as image, then OCR
        with fitz.open(stream=contents, filetype="pdf") as pdf_document:
            if len(pdf_document) == 0:
                raise ValueError("PDF has no pages")
            
            page = pdf_document[0]
            pix = page.get_pixmap(dpi=200)  # Higher DPI for better OCR
            image = Image.open(io.BytesIO(pix.tobytes("png")))
    else:
        # Image: open directly
        try:
            image = Image.open(io.BytesIO(contents))
        except Exception as e:
            raise ValueError(f"Invalid image file: {str(e)}")
    
    # Preprocess image for better OCR (convert to grayscale)
    if image.mode != 'L':
        image = image.convert('L')
    
    # Perform OCR
    text = pytesseract.image_to_string(image, lang='fra+eng')
    return text


def extract_fields_from_text(text: str, doc_type: str) -> tuple[dict, dict]:
    """
    Extract fields from OCR text using regex patterns
    Returns: (required_fields, extra_fields)
    
    Note: Provider name heuristic uses first non-header line
    """
    required_fields = {}
    extra_fields = {}
    
    # Date patterns: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    date_pattern = r'(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}[/-]\d{2}[/-]\d{2})'
    date_match = re.search(date_pattern, text)
    if date_match:
        required_fields["invoice_date"] = normalize_date(date_match.group(1))
    
    # Amount patterns: TTC, Total, Montant + number
    amount_pattern = r'(?:total|ttc|montant)[^\d]*(\d+[.,]\d{2})\s*(?:€|EUR|DT|TND)?'
    amount_match = re.search(amount_pattern, text, re.IGNORECASE)
    if amount_match:
        required_fields["total_ttc"] = float(amount_match.group(1).replace(',', '.'))
    
    # Provider name: first non-header line
    # Skip common header words
    header_words = ['facture', 'invoice', 'labo', 'laboratoire', 'pharmacie', 'ordonnance', 'reçu']
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    
    for line in lines:
        line_lower = line.lower()
        # Skip if line is just a header word
        if not any(line_lower == hw or line_lower.startswith(hw + ' ') for hw in header_words):
            # Use this line as provider name if it looks like a name (has letters)
            if re.search(r'[A-Za-zÀ-ÿ]{2,}', line):
                required_fields["provider_name"] = line[:50]
                break
    
    # Fallback: use first line if no suitable line found
    if "provider_name" not in required_fields and lines:
        required_fields["provider_name"] = lines[0][:50]
    
    # Extra: Patient name (optional - goes to extra)
    patient_pattern = r'(?:patient|nom|client)[:\s]+([A-Za-zÀ-ÿ\s]+)'
    patient_match = re.search(patient_pattern, text, re.IGNORECASE)
    if patient_match:
        extra_fields["patient_name"] = patient_match.group(1).strip()[:50]
    
    # Extra: Raw text length for debugging
    extra_fields["text_length"] = len(text)
    
    return required_fields, extra_fields


def normalize_date(date_str: str) -> str:
    """
    Normalize date to YYYY-MM-DD format
    Input: DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD
    Output: YYYY-MM-DD
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
    
    # Return as-is if no format matches
    return date_str


def calculate_confidence(fields: dict, text: str) -> dict:
    """
    Calculate confidence scores for required fields
    Returns scores for all REQUIRED_FIELDS
    
    Scoring:
    - 0.0: Field missing (needs review)
    - 0.65: Provider name (heuristic-based)
    - 0.80: Total TTC (pattern-matched)
    - 0.85: Invoice date (pattern-matched)
    """
    confidence = {}
    
    for field_name in REQUIRED_FIELDS:
        value = fields.get(field_name)
        
        if value is None:
            # Missing field = 0.0 (will be flagged for review)
            confidence[field_name] = 0.0
        elif field_name == "invoice_date":
            confidence[field_name] = 0.85
        elif field_name == "total_ttc" and isinstance(value, (int, float)):
            confidence[field_name] = 0.80
        elif field_name == "provider_name":
            # Provider name is heuristic-based, lower confidence
            confidence[field_name] = 0.65
        else:
            confidence[field_name] = 0.60
    
    return confidence


def generate_warnings(fields: dict, confidence: dict) -> list:
    """
    Generate warnings for:
    - Missing fields (value is None)
    - Low confidence fields (< 70%)
    """
    warnings = []
    
    for field_name in REQUIRED_FIELDS:
        value = fields.get(field_name)
        score = confidence.get(field_name, 0.0)
        
        if value is None:
            warnings.append(f"Missing required field: '{field_name}'")
        elif score < 0.70:
            warnings.append(f"Low confidence for field '{field_name}': {score:.0%}")
    
    return warnings