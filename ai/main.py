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

# Setup Tesseract path. This checks if we are on a server (using env vars) or local Windows.
tesseract_path = os.getenv('TESSERACT_CMD')
if tesseract_path:
    pytesseract.pytesseract.tesseract_cmd = tesseract_path
elif os.name == 'nt':
    # Default Windows path for local development
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

app = FastAPI(title="Medical Document Processing API")

# Allow the Laravel frontend to communicate with this FastAPI backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# The exact fields our Laravel database is expecting
REQUIRED_FIELDS = ["invoice_date", "provider_name", "total_ttc"]
MISSING_FIELD_CONFIDENCE = 0.0

@app.get("/health")
def health():
    """Simple health check to make sure the AI microservice is running."""
    return {"status": "ok", "service": "medical-doc-ocr"}

@app.post("/process")
async def process_document(
    file: UploadFile = File(...),
    doc_type: Optional[str] = Form("medical_invoice")
):
    """
    Main endpoint to receive a file, run OCR, and extract the data.
    """
    start_time = time.time()
    request_id = str(uuid.uuid4())
    
    # Initialize our response objects
    fields = {key: None for key in REQUIRED_FIELDS}
    confidence = {key: MISSING_FIELD_CONFIDENCE for key in REQUIRED_FIELDS}
    extra = {}
    warnings = []
    errors = []
    
    try:
        contents = await file.read()
        
        # Security: Prevent massive files from crashing the server (10MB limit)
        if len(contents) > 10 * 1024 * 1024:
            raise ValueError("File is too large. Maximum size is 10MB.")
        
        # Validation: Check if it's an image or PDF
        filename = file.filename or "unknown"
        if not is_supported_file(filename):
            raise ValueError(f"Unsupported file format: {filename}")
        
        # Step 1: Convert the image/PDF into raw text
        text = extract_text_from_file(contents, filename)
        
        # Step 2: Use regex to find specific data like dates and amounts
        extracted, extra_fields = extract_fields_from_text(text, doc_type)
        
        # Map what we found into the required fields
        for key in REQUIRED_FIELDS:
            if key in extracted:
                fields[key] = extracted[key]
        
        # Store additional data (like patient name) and a text preview for debugging
        extra = extra_fields
        extra["text_preview"] = text[:200].replace('\n', ' ') if text else ""
        
        # Step 3: Calculate how confident the AI is in its results
        confidence = calculate_confidence(fields, text)
        warnings = generate_warnings(fields, confidence)
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Return the final JSON payload to Laravel
        return {
            "meta": {
                "doc_type": doc_type,
                "request_id": request_id,
                "processing_time_ms": processing_time_ms,
                "ocr_engine": "tesseract",
                "extra": extra,
                "note": "Currently processes only the first page of PDFs."
            },
            "fields": fields,
            "confidence": confidence,
            "warnings": warnings,
            "errors": errors
        }
    
    except ValueError as e:
        # Client errors (like bad file type) return a 400 Bad Request
        processing_time_ms = int((time.time() - start_time) * 1000)
        return JSONResponse(
            status_code=400,
            content={
                "meta": {"request_id": request_id, "processing_time_ms": processing_time_ms, "extra": {}, "error": str(e)},
                "fields": fields, "confidence": confidence, "warnings": [], "errors": [str(e)]
            }
        )
    except Exception as e:
        # Catch-all for unexpected errors so the server doesn't crash (500 Internal Error)
        processing_time_ms = int((time.time() - start_time) * 1000)
        return JSONResponse(
            status_code=500,
            content={
                "meta": {"request_id": request_id, "processing_time_ms": processing_time_ms, "extra": {}, "error": "Internal server error"},
                "fields": fields, "confidence": confidence, "warnings": [], "errors": [f"Pipeline failed: {str(e)}"]
            }
        )

def is_supported_file(filename: str) -> bool:
    """Checks the file extension against our allowed list."""
    supported_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif']
    return any(filename.lower().endswith(ext) for ext in supported_extensions)

def extract_text_from_file(contents: bytes, filename: str) -> str:
    """Handles the actual image processing and Tesseract OCR execution."""
    filename_lower = filename.lower()
    
    if filename_lower.endswith('.pdf'):
        # If it's a PDF, we render the first page into an image
        with fitz.open(stream=contents, filetype="pdf") as pdf_document:
            if len(pdf_document) == 0:
                raise ValueError("The provided PDF is empty.")
            page = pdf_document[0]
            # Use 300 DPI to ensure clear text, especially for 3-decimal amounts
            pix = page.get_pixmap(dpi=300)  
            image = Image.open(io.BytesIO(pix.tobytes("png")))
    else:
        # If it's already an image, just load it
        try:
            image = Image.open(io.BytesIO(contents))
        except Exception as e:
            raise ValueError(f"Could not read the image file: {str(e)}")
    
    # Convert image to grayscale to improve OCR accuracy
    if image.mode != 'L':
        image = image.convert('L')
    
    # Run Tesseract supporting both French and English
    return pytesseract.image_to_string(image, lang='fra+eng')

def extract_fields_from_text(text: str, doc_type: str) -> tuple[dict, dict]:
    """The brain of the operation: Uses Regex to find dates, amounts, and names."""
    required_fields = {}
    extra_fields = {}
    
    # 1. Date Extraction (Looks for standard DD/MM/YYYY or YYYY-MM-DD formats)
    date_pattern = r'(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}[/-]\d{2}[/-]\d{2})'
    date_match = re.search(date_pattern, text)
    if date_match:
        required_fields["invoice_date"] = normalize_date(date_match.group(1))
    
    # 2. Total Amount (Looks for TTC/Total, supporting 3 decimals for Tunisian Millimes)
    amt_keywords = r'(?:total\s*t\.?t\.?c\.?|ttc|net\s*a\s*payer|montant\s*total)'
    amt_value = r'(\d+[\.,]\d{2,3})'
    # Find all matches, then take the LAST one because the grand total is usually at the bottom
    matches = re.findall(f'{amt_keywords}[^\d]*{amt_value}', text, re.IGNORECASE)
    if matches:
        raw_val = matches[-1].replace(',', '.')
        required_fields["total_ttc"] = float(raw_val)
    
    # 3. Provider Name (Looks at the top lines of the document)
    header_ignore = ['facture', 'note', 'reçu', 'invoice', 'date', 'tél', 'labo', 'pharmacie']
    # Split text into lines, ignoring empty ones
    lines = [l.strip() for l in text.split('\n') if len(l.strip()) > 4]
    
    for line in lines[:8]:  # Search only the top 8 lines
        # Skip lines that are just saying "Facture" or "Date"
        if not any(x in line.lower() for x in header_ignore):
            # Clean up common OCR noise (e.g., random symbols before the actual name)
            cleaned_name = re.sub(r'^[^a-zA-ZÀ-ÿ]+', '', line)
            if len(cleaned_name) > 3:
                required_fields["provider_name"] = cleaned_name[:50]
                break
                
    # If we couldn't find a clean name, just grab the very first line as a fallback
    if "provider_name" not in required_fields and lines:
        required_fields["provider_name"] = lines[0][:50]
    
    # 4. Extra info: Patient Name (Stops reading at the end of the line to avoid grabbing addresses)
    patient_pattern = r'(?:patient|nom|client)[:\s]+([^\n]+)'
    patient_match = re.search(patient_pattern, text, re.IGNORECASE)
    if patient_match:
        extra_fields["patient_name"] = patient_match.group(1).strip()[:50]
    
    extra_fields["text_length"] = len(text)
    
    return required_fields, extra_fields

def normalize_date(date_str: str) -> str:
    """Converts any found date into the standard YYYY-MM-DD database format."""
    formats = ["%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%Y/%m/%d"]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return date_str

def calculate_confidence(fields: dict, text: str) -> dict:
    """Assigns a confidence score. Used by the UI to show warnings."""
    confidence = {}
    for field_name in REQUIRED_FIELDS:
        value = fields.get(field_name)
        if value is None:
            confidence[field_name] = 0.0
        elif field_name == "invoice_date":
            # Dates are very predictable, high confidence
            confidence[field_name] = 0.90
        elif field_name == "total_ttc" and isinstance(value, (int, float)):
            # Numbers are reliable, but OCR can misread an '8' as a 'B' occasionally
            confidence[field_name] = 0.85
        else:
            # Names and text are highly variable, moderate confidence to encourage human review
            confidence[field_name] = 0.65
    return confidence

def generate_warnings(fields: dict, confidence: dict) -> list:
    """Generates human-readable warnings if the AI isn't sure about a field."""
    warnings = []
    for field_name in REQUIRED_FIELDS:
        value = fields.get(field_name)
        score = confidence.get(field_name, 0.0)
        if value is None:
            warnings.append(f"Missing required parameter: '{field_name}'")
        elif score < 0.70:
            warnings.append(f"Sub-optimal confidence ({score:.0%}) for entity: '{field_name}'")
    return warnings