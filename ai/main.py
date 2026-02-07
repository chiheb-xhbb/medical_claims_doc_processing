import os
import uuid
import tempfile
from typing import Dict, Any, Optional, List

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# -----------------------------
# Response Schemas
# -----------------------------
class ProcessResponse(BaseModel):
    fields: Dict[str, Optional[str]] = Field(default_factory=dict)
    confidence: Dict[str, float] = Field(default_factory=dict)
    warnings: List[str] = Field(default_factory=list)
    meta: Dict[str, Any] = Field(default_factory=dict)


# -----------------------------
# App
# -----------------------------
app = FastAPI(title="AI Document Service", version="0.1.0")

# Allow local dev calls (React/Laravel)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/process", response_model=ProcessResponse)
async def process(
    file: UploadFile = File(...),
    doc_type: Optional[str] = None,  # optional hint: "pharmacy_invoice", "lab_report", ...
):
    """
    MVP endpoint:
    - receives a file (pdf/jpg/png)
    - saves it temporarily
    - returns dummy extracted fields (OCR not implemented yet)
    """

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    filename = file.filename.lower()
    allowed = (".pdf", ".png", ".jpg", ".jpeg")
    if not filename.endswith(allowed):
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {allowed}")

    # Save to temp file
    request_id = str(uuid.uuid4())
    suffix = os.path.splitext(filename)[1]

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            temp_path = tmp.name
            content = await file.read()
            tmp.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    # TODO later:
    # 1) preprocess image/pages (OpenCV)
    # 2) OCR (PaddleOCR/Tesseract)
    # 3) extract fields (regex/spacy)
    # 4) compute confidence + warnings

    # Dummy output (stable field keys)
    fields = {
        "invoice_date": None,
        "provider_name": None,
        "total_ttc": None,
        "total_ht": None,
        "tva": None,
    }
    confidence = {k: 0.0 for k in fields.keys()}
    warnings = ["OCR/extraction not implemented yet (dummy response)"]

    return ProcessResponse(
        fields=fields,
        confidence=confidence,
        warnings=warnings,
        meta={
            "request_id": request_id,
            "original_filename": file.filename,
            "doc_type": doc_type,
            "temp_path": temp_path,  # for debugging; you can remove later
            "size_bytes": len(content),
        },
    )