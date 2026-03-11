from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pytesseract
from PIL import Image
import fitz  # PyMuPDF for PDF processing
import io
import re
import time
import uuid
import os
from typing import Optional
from datetime import datetime

# Configure Tesseract path.
# In production/server environments, use TESSERACT_CMD.
# In local Windows development, fall back to the default installation path.
tesseract_path = os.getenv('TESSERACT_CMD')
if tesseract_path:
    pytesseract.pytesseract.tesseract_cmd = tesseract_path
elif os.name == 'nt':
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

app = FastAPI(title="Medical Document Processing API")

# CORS configuration for local development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REQUIRED_FIELDS = ["invoice_date", "provider_name", "total_ttc"]
MISSING_FIELD_CONFIDENCE = 0.0


@app.get("/health")
def health():
    """Simple health check."""
    return {"status": "ok", "service": "medical-doc-ocr"}


@app.post("/process")
async def process_document(
    file: UploadFile = File(...),
    doc_type: Optional[str] = Form("medical_invoice")
):
    """
    Receive a file, run OCR, extract structured fields,
    and return a normalized JSON payload.
    """
    start_time = time.time()
    request_id = str(uuid.uuid4())

    fields = {key: None for key in REQUIRED_FIELDS}
    confidence = {key: MISSING_FIELD_CONFIDENCE for key in REQUIRED_FIELDS}
    extra = {}
    warnings = []
    errors = []

    try:
        contents = await file.read()

        if not contents:
            raise ValueError("The uploaded file is empty.")

        # Prevent overly large uploads from exhausting memory.
        if len(contents) > 10 * 1024 * 1024:
            raise ValueError("File is too large. Maximum size is 10MB.")

        filename = file.filename or "unknown"

        if not is_supported_file(filename):
            raise ValueError(f"Unsupported file format: {filename}")

        # Step 1: OCR
        text = extract_text_from_file(contents, filename)

        # Step 2: Structured extraction
        extracted, extra_fields = extract_fields_from_text(text, doc_type)

        for key in REQUIRED_FIELDS:
            if key in extracted:
                fields[key] = extracted[key]

        extra = extra_fields
        extra["text_preview"] = text[:200].replace('\n', ' ') if text else ""

        # Step 3: Confidence + warnings
        confidence = calculate_confidence(fields, text)
        warnings = generate_warnings(fields, confidence)

        processing_time_ms = int((time.time() - start_time) * 1000)

        return {
            "meta": {
                "doc_type": doc_type,
                "request_id": request_id,
                "processing_time_ms": processing_time_ms,
                "ocr_engine": "tesseract",
                "extra": extra,
                "note": "Only single-page PDFs are supported.",
            },
            "fields": fields,
            "confidence": confidence,
            "warnings": warnings,
            "errors": errors,
        }

    except ValueError as e:
        # Client/input errors -> 400
        processing_time_ms = int((time.time() - start_time) * 1000)
        return JSONResponse(
            status_code=400,
            content={
                "meta": {
                    "request_id": request_id,
                    "processing_time_ms": processing_time_ms,
                    "extra": {},
                    "error": str(e),
                },
                "fields": fields,
                "confidence": confidence,
                "warnings": [],
                "errors": [str(e)],
            }
        )

    except Exception as e:
        # Unexpected server-side errors -> 500
        processing_time_ms = int((time.time() - start_time) * 1000)
        safe_error = f"{type(e).__name__}: {str(e)}"

        return JSONResponse(
            status_code=500,
            content={
                "meta": {
                    "request_id": request_id,
                    "processing_time_ms": processing_time_ms,
                    "extra": {},
                    "error": safe_error,
                },
                "fields": fields,
                "confidence": confidence,
                "warnings": [],
                "errors": [f"Pipeline failed: {safe_error}"],
            }
        )


def is_supported_file(filename: str) -> bool:
    """Check supported file extensions."""
    supported_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif']
    return any(filename.lower().endswith(ext) for ext in supported_extensions)


def extract_text_from_file(contents: bytes, filename: str) -> str:
    """
    Convert an image or PDF to text using OCR.
    For the MVP, only single-page PDFs are accepted.
    """
    filename_lower = filename.lower()

    if filename_lower.endswith('.pdf'):
        with fitz.open(stream=contents, filetype="pdf") as pdf_document:
            if len(pdf_document) == 0:
                raise ValueError("The provided PDF is empty.")

            if len(pdf_document) > 1:
                raise ValueError("Multi-page PDF not supported. Please upload a single-page document.")

            page = pdf_document[0]
            pix = page.get_pixmap(dpi=300)
            image = Image.open(io.BytesIO(pix.tobytes("png")))
    else:
        try:
            image = Image.open(io.BytesIO(contents))
        except Exception as e:
            raise ValueError(f"Could not read the image file: {str(e)}")

    # Convert to grayscale to improve OCR quality.
    if image.mode != 'L':
        image = image.convert('L')

    return pytesseract.image_to_string(image, lang='fra+eng')


def extract_fields_from_text(text: str, doc_type: str) -> tuple[dict, dict]:
    """Extract key business fields from OCR text."""
    required_fields = {}
    extra_fields = {}

    # 1. Date extraction
    date_pattern = r'(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}[/-]\d{2}[/-]\d{2})'
    date_match = re.search(date_pattern, text)
    if date_match:
        required_fields["invoice_date"] = normalize_date(date_match.group(1))

    # 2. Total amount extraction
    amt_keywords = r'(?:total\s*t\.?t\.?c\.?|ttc|net\s*a\s*payer|montant\s*total)'
    amt_value = r'(\d+[\.,]\d{2,3})'
    matches = re.findall(f'{amt_keywords}[^\d]*{amt_value}', text, re.IGNORECASE)
    if matches:
        raw_val = matches[-1].replace(',', '.')
        required_fields["total_ttc"] = float(raw_val)

    # 3. Provider name extraction from top lines
    header_ignore = ['facture', 'note', 'reçu', 'invoice', 'date', 'tél', 'labo', 'pharmacie']
    lines = [line.strip() for line in text.split('\n') if len(line.strip()) > 4]

    for line in lines[:8]:
        if not any(x in line.lower() for x in header_ignore):
            cleaned_name = re.sub(r'^[^a-zA-ZÀ-ÿ]+', '', line)
            if len(cleaned_name) > 3:
                required_fields["provider_name"] = cleaned_name[:50]
                break

    if "provider_name" not in required_fields and lines:
        required_fields["provider_name"] = lines[0][:50]

    # 4. Optional patient name
    patient_pattern = r'(?:patient|nom|client)[:\s]+([^\n]+)'
    patient_match = re.search(patient_pattern, text, re.IGNORECASE)
    if patient_match:
        extra_fields["patient_name"] = patient_match.group(1).strip()[:50]

    extra_fields["text_length"] = len(text)

    return required_fields, extra_fields


def normalize_date(date_str: str) -> str:
    """Normalize dates to YYYY-MM-DD when possible."""
    formats = ["%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%Y/%m/%d"]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return date_str


def calculate_confidence(fields: dict, text: str) -> dict:
    """Assign simple confidence scores for UI review."""
    confidence = {}

    for field_name in REQUIRED_FIELDS:
        value = fields.get(field_name)

        if value is None:
            confidence[field_name] = 0.0
        elif field_name == "invoice_date":
            confidence[field_name] = 0.90
        elif field_name == "total_ttc" and isinstance(value, (int, float)):
            confidence[field_name] = 0.85
        else:
            confidence[field_name] = 0.65

    return confidence


def generate_warnings(fields: dict, confidence: dict) -> list:
    """Generate human-readable warnings for incomplete/uncertain extraction."""
    warnings = []

    for field_name in REQUIRED_FIELDS:
        value = fields.get(field_name)
        score = confidence.get(field_name, 0.0)

        if value is None:
            warnings.append(f"Missing required parameter: '{field_name}'")
        elif score < 0.70:
            warnings.append(f"Sub-optimal confidence ({score:.0%}) for entity: '{field_name}'")

    return warnings