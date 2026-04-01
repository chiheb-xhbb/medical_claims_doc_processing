from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

import io
import json
import logging
import os
import re
import time
import uuid
import unicodedata
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Optional

import fitz
import numpy as np
import pytesseract
from pytesseract import Output
from PIL import Image, ImageEnhance, ImageOps

try:
    import paddle
except Exception:
    paddle = None  # type: ignore[assignment]

try:
    from paddleocr import PaddleOCR
except Exception:
    PaddleOCR = None  # type: ignore[assignment]

try:
    import spacy
except Exception:
    spacy = None  # type: ignore[assignment]


logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)
logger = logging.getLogger("medical_doc_ocr")

SUPPORTED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

REQUIRED_FIELDS = ["invoice_date", "provider_name", "total_ttc"]
MISSING_FIELD_CONFIDENCE = 0.0
LOW_CONFIDENCE_THRESHOLD = 0.70

DEFAULT_DOC_TYPE = "medical_invoice"
OCR_LANGUAGES = "fra+eng"

SERVICE_NOTE = "Single-page PDFs are supported. meta.extra contains optional non-breaking metadata."

REQUEST_WARNING_MS = int(os.getenv("OCR_REQUEST_WARNING_MS", "8000"))
TESSERACT_TIMEOUT_SECONDS = int(os.getenv("TESSERACT_TIMEOUT_SECONDS", "25"))

PADDLE_MIN_TEXT_QUALITY = float(os.getenv("PADDLE_MIN_TEXT_QUALITY", "0.22"))
TESSERACT_MIN_TEXT_QUALITY = float(os.getenv("TESSERACT_MIN_TEXT_QUALITY", "0.24"))
MIN_OCR_ALNUM_COUNT = int(os.getenv("MIN_OCR_ALNUM_COUNT", "12"))

MAX_IMAGE_SIDE = int(os.getenv("OCR_MAX_IMAGE_SIDE", "2600"))
UPSCALE_TARGET_SIDE = int(os.getenv("OCR_UPSCALE_TARGET_SIDE", "1400"))

DATE_NUMERIC_RE = re.compile(
    r"\b(?:\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4}|\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})\b",
    re.IGNORECASE,
)
DATE_TEXTUAL_RE = re.compile(
    r"\b\d{1,2}\s+"
    r"(?:janvier|fevrier|février|mars|avril|mai|juin|juillet|aout|août|"
    r"septembre|octobre|novembre|decembre|décembre)"
    r"\s+\d{4}\b",
    re.IGNORECASE,
)
DATE_KEYWORDS_RE = re.compile(
    r"\b(?:date|date\s+facture|date\s+de\s+consultation|date\s+d[' ]emission|émission|émis\s+le)\b",
    re.IGNORECASE,
)
DATE_EXCLUDE_RE = re.compile(
    r"\b(?:naissance|né|née|cin|matricule|mf|rc|tel|tél|fax)\b",
    re.IGNORECASE,
)

AMOUNT_KEYWORDS_RE = re.compile(
    r"\b(?:"
    r"total(?:\s+ttc)?|"
    r"ttc|"
    r"net\s+a\s+payer|"
    r"montant(?:\s+total)?|"
    r"total\s+general|"
    r"total\s+général|"
    r"somme\s+a\s+payer|"
    r"montant\s+a\s+payer|"
    r"a\s+payer|"
    r"prix\s+total"
    r")\b",
    re.IGNORECASE,
)
AMOUNT_FINAL_KEYWORDS_RE = re.compile(
    r"\b(?:total\s+ttc|ttc|net\s+a\s+payer|somme\s+a\s+payer|montant\s+a\s+payer)\b",
    re.IGNORECASE,
)
AMOUNT_NEGATIVE_HINTS_RE = re.compile(
    r"\b(?:tva|taxe|remise|reduction|réduction|sous[\s-]*total|subtotal|"
    r"prix\s+unitaire|quantite|quantité|qte|qté|ht|hors\s+taxe)\b",
    re.IGNORECASE,
)
CURRENCY_RE = re.compile(
    r"\b(?:dt|tnd|dinar(?:s)?(?:\s+tunisien(?:s)?)?)\b",
    re.IGNORECASE,
)
AMOUNT_RE = re.compile(
    r"(?<!\d)"
    r"("
    r"\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{2,3})"
    r"|"
    r"\d+(?:[.,]\d{2,3})"
    r"|"
    r"\d+"
    r")"
    r"(?!\d)"
)

PROVIDER_KEYWORDS_RE = re.compile(
    r"\b(?:pharmacie|laboratoire|labo|clinique|cabinet|centre|polyclinique|hopital|hôpital|dr|docteur|compagnie|societe|société)\b",
    re.IGNORECASE,
)
PROVIDER_ORG_TERMS_RE = re.compile(
    r"\b(?:compagnie|societe|société|medical|médical|medicale|médicale|distribution|centrale|santé|sante|el\s+amen)\b",
    re.IGNORECASE,
)
PROVIDER_NOISE_RE = re.compile(
    r"\b(?:facture|invoice|reçu|date|patient|assure|assuré|assuree|assurée|nom|client|"
    r"adresse|rue|avenue|av\.|tel|tél|fax|gsm|matricule|mf|rc|code|postal|"
    r"page|total|montant|ttc|tnd|dt|cnam|numero|n°|ref)\b",
    re.IGNORECASE,
)
PROVIDER_STRONG_NOISE_RE = re.compile(
    r"\b(?:facture|invoice|reçu|n°\s*facture|numero\s*facture)\b",
    re.IGNORECASE,
)
EMAIL_OR_WEB_RE = re.compile(r"(?:@|www\.|https?://)", re.IGNORECASE)

PATIENT_PATTERNS = [
    re.compile(r"(?im)\b(?:patient|nom\s+patient|client)\s*[:\-]\s*([^\n]{3,80})"),
    re.compile(r"(?im)\b(?:assure|assuré|assuree|assurée)\s*[:\-]\s*([^\n]{3,80})"),
]

FRENCH_MONTHS = {
    "janvier": 1,
    "fevrier": 2,
    "février": 2,
    "mars": 3,
    "avril": 4,
    "mai": 5,
    "juin": 6,
    "juillet": 7,
    "aout": 8,
    "août": 8,
    "septembre": 9,
    "octobre": 10,
    "novembre": 11,
    "decembre": 12,
    "décembre": 12,
}

EXTENSION_MIME_GROUPS = {
    ".pdf": {"application/pdf"},
    ".jpg": {"image/jpeg"},
    ".jpeg": {"image/jpeg"},
    ".png": {"image/png"},
    ".bmp": {"image/bmp", "image/x-ms-bmp"},
    ".tif": {"image/tiff"},
    ".tiff": {"image/tiff"},
}


@dataclass
class OCRLine:
    text: str
    score: float
    y_min: int


@dataclass
class OCRExecutionResult:
    text: str
    engine: str
    overall_confidence: float
    text_quality_score: float
    lines: list[OCRLine]
    duration_ms: int = 0


def configure_tesseract() -> None:
    tesseract_path = os.getenv("TESSERACT_CMD")
    if tesseract_path:
        pytesseract.pytesseract.tesseract_cmd = tesseract_path
    elif os.name == "nt":
        pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def parse_allowed_origins() -> list[str]:
    raw = os.getenv("FASTAPI_ALLOWED_ORIGINS", "http://localhost:5173")
    origins = [item.strip() for item in raw.split(",") if item.strip()]
    return origins or ["http://localhost:5173"]


def should_allow_credentials(origins: list[str]) -> bool:
    requested = bool_env("FASTAPI_ALLOW_CREDENTIALS", False)
    if origins == ["*"]:
        return False
    return requested


def select_paddle_device() -> str:
    explicit = os.getenv("PADDLE_DEVICE")
    if explicit:
        return explicit.strip()

    if paddle is None:
        return "cpu"

    try:
        if paddle.is_compiled_with_cuda():
            gpu_count = paddle.device.cuda.device_count()
            if gpu_count and gpu_count > 0:
                return "gpu:0"
    except Exception:
        pass

    return "cpu"


def paddle_gpu_ready(device: str) -> bool:
    return device.lower().startswith("gpu")


def init_paddle_ocr(device: str) -> Optional[Any]:
    if PaddleOCR is None:
        logger.warning("PaddleOCR import failed. Service will use Tesseract only.")
        return None

    allow_cpu_paddle = bool_env("ALLOW_CPU_PADDLE", False)
    if device == "cpu" and not allow_cpu_paddle:
        logger.info("PaddleOCR disabled on CPU. Tesseract remains the default OCR path.")
        return None

    det_model = os.getenv("PADDLE_DET_MODEL", "PP-OCRv5_mobile_det")
    rec_model = os.getenv("PADDLE_REC_MODEL", "PP-OCRv5_mobile_rec")

    try:
        logger.info("Initializing PaddleOCR on device=%s ...", device)
        ocr = PaddleOCR(
            lang=os.getenv("PADDLE_LANG", "fr"),
            device=device,
            text_detection_model_name=det_model,
            text_recognition_model_name=rec_model,
            use_doc_orientation_classify=bool_env("PADDLE_USE_DOC_ORIENTATION_CLASSIFY", False),
            use_doc_unwarping=bool_env("PADDLE_USE_DOC_UNWARPING", False),
            use_textline_orientation=bool_env("PADDLE_USE_TEXTLINE_ORIENTATION", False),
            enable_hpi=False,
            enable_mkldnn=False,
        )
        logger.info(
            "PaddleOCR initialized successfully on device=%s with det=%s rec=%s",
            device,
            det_model,
            rec_model,
        )
        return ocr
    except Exception as e:
        logger.warning("PaddleOCR initialization failed on device=%s: %s", device, str(e))
        return None


def init_spacy_pipeline() -> Optional[Any]:
    if spacy is None:
        logger.warning("spaCy import failed. spaCy post-processing disabled.")
        return None

    try:
        logger.info("Initializing spaCy...")
        nlp = spacy.load(os.getenv("SPACY_MODEL", "fr_core_news_sm"))

        if "entity_ruler" not in nlp.pipe_names:
            if "ner" in nlp.pipe_names:
                ruler = nlp.add_pipe("entity_ruler", after="ner", config={"overwrite_ents": False})
            else:
                ruler = nlp.add_pipe("entity_ruler", config={"overwrite_ents": False})

            ruler.add_patterns(
                [
                    {"label": "ORG_HINT", "pattern": "pharmacie"},
                    {"label": "ORG_HINT", "pattern": "laboratoire"},
                    {"label": "ORG_HINT", "pattern": "labo"},
                    {"label": "ORG_HINT", "pattern": "clinique"},
                    {"label": "ORG_HINT", "pattern": "cabinet"},
                    {"label": "ORG_HINT", "pattern": "centre"},
                    {"label": "ORG_HINT", "pattern": "polyclinique"},
                    {"label": "ORG_HINT", "pattern": "hopital"},
                    {"label": "ORG_HINT", "pattern": "hôpital"},
                    {"label": "ORG_HINT", "pattern": "compagnie"},
                    {"label": "ORG_HINT", "pattern": "societe"},
                    {"label": "ORG_HINT", "pattern": "société"},
                    {"label": "PROVIDER_PERSON", "pattern": [{"LOWER": {"IN": ["dr", "docteur"]}}, {"IS_ALPHA": True, "OP": "+"}]},
                ]
            )

        logger.info("spaCy initialized successfully.")
        return nlp
    except Exception as e:
        logger.warning("spaCy initialization failed: %s", str(e))
        return None


configure_tesseract()
ALLOWED_ORIGINS = parse_allowed_origins()
ALLOW_CREDENTIALS = should_allow_credentials(ALLOWED_ORIGINS)
PADDLE_DEVICE = select_paddle_device()
PADDLE_GPU_READY = paddle_gpu_ready(PADDLE_DEVICE)
PADDLE_OCR = init_paddle_ocr(PADDLE_DEVICE)
SPACY_NLP = init_spacy_pipeline()

app = FastAPI(title="Medical Document Processing API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=ALLOW_CREDENTIALS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "medical-doc-ocr"}


@app.post("/process")
def process_document(
    file: UploadFile = File(...),
    doc_type: Optional[str] = Form(DEFAULT_DOC_TYPE),
):
    start_time = time.time()
    request_id = str(uuid.uuid4())
    safe_doc_type = normalize_doc_type(doc_type)

    fields = build_empty_fields()
    confidence = build_empty_confidence()
    warnings: list[str] = []
    errors: list[str] = []
    used_engine: Optional[str] = None

    image: Optional[Image.Image] = None
    processed_image: Optional[Image.Image] = None

    logger.info(
        "request_started request_id=%s filename=%s doc_type=%s",
        request_id,
        file.filename,
        safe_doc_type,
    )

    try:
        filename = file.filename or "unknown"
        contents = file.file.read()

        validate_uploaded_file(file, filename, contents, safe_doc_type)

        image = load_image_from_file(contents, filename)
        processed_image = preprocess_image(image)

        ocr_result = run_ocr(processed_image, request_id=request_id)
        used_engine = ocr_result.engine

        nlp_doc = run_spacy(ocr_result.text)

        extracted_fields, extra_fields, extraction_signals = extract_fields_from_text(
            text=ocr_result.text,
            ocr_lines=ocr_result.lines,
            doc_type=safe_doc_type,
            nlp_doc=nlp_doc,
        )

        apply_extracted_fields(fields, extracted_fields)

        confidence = calculate_confidence(
            fields=fields,
            ocr_result=ocr_result,
            extraction_signals=extraction_signals,
        )
        warnings = generate_warnings(fields, confidence)

        extra = build_extra_payload(
            extra_fields=extra_fields,
            ocr_result=ocr_result,
            extraction_signals=extraction_signals,
        )

        processing_time_ms = get_processing_time_ms(start_time)
        log_if_slow_request(request_id, processing_time_ms, used_engine)

        logger.info(
            "request_success request_id=%s engine=%s extracted=%s warnings=%d duration_ms=%d",
            request_id,
            used_engine,
            [k for k, v in fields.items() if v is not None],
            len(warnings),
            processing_time_ms,
        )

        return build_success_response(
            doc_type=safe_doc_type,
            request_id=request_id,
            processing_time_ms=processing_time_ms,
            fields=fields,
            confidence=confidence,
            warnings=warnings,
            errors=errors,
            extra=extra,
            ocr_engine=used_engine or "unknown",
        )

    except ValueError as e:
        processing_time_ms = get_processing_time_ms(start_time)

        logger.warning(
            "request_client_error request_id=%s duration_ms=%d error=%s",
            request_id,
            processing_time_ms,
            str(e),
        )

        return build_client_error_response(
            doc_type=safe_doc_type,
            request_id=request_id,
            processing_time_ms=processing_time_ms,
            fields=fields,
            confidence=confidence,
            error_message=str(e),
            ocr_engine=used_engine,
        )

    except Exception:
        processing_time_ms = get_processing_time_ms(start_time)

        logger.exception(
            "request_server_error request_id=%s duration_ms=%d engine=%s",
            request_id,
            processing_time_ms,
            used_engine,
        )

        return build_server_error_response(
            doc_type=safe_doc_type,
            request_id=request_id,
            processing_time_ms=processing_time_ms,
            fields=fields,
            confidence=confidence,
            ocr_engine=used_engine,
        )

    finally:
        try:
            file.file.close()
        except Exception:
            pass

        try:
            if processed_image is not None and processed_image is not image:
                processed_image.close()
        except Exception:
            pass

        try:
            if image is not None:
                image.close()
        except Exception:
            pass


def normalize_doc_type(doc_type: Optional[str]) -> str:
    value = (doc_type or DEFAULT_DOC_TYPE).strip()
    return value or DEFAULT_DOC_TYPE


def validate_uploaded_file(file: UploadFile, filename: str, contents: bytes, doc_type: str) -> None:
    if not contents:
        raise ValueError("The uploaded file is empty.")

    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise ValueError("File is too large. Maximum size is 10MB.")

    if not is_supported_file(filename):
        raise ValueError(f"Unsupported file format: {filename}")

    if not extension_matches_signature(filename, contents):
        raise ValueError("The uploaded file content does not match its file extension.")

    if not content_type_is_plausible(filename, file.content_type):
        raise ValueError("The uploaded file MIME type is not compatible with its file extension.")

    logger.info(
        "upload_metadata filename=%s content_type=%s size=%d doc_type=%s",
        filename,
        file.content_type,
        len(contents),
        doc_type,
    )


def is_supported_file(filename: str) -> bool:
    filename_lower = filename.lower()
    return any(filename_lower.endswith(ext) for ext in SUPPORTED_EXTENSIONS)


def get_extension(filename: str) -> str:
    return os.path.splitext(filename.lower())[1]


def detect_file_signature(contents: bytes) -> Optional[str]:
    if contents.startswith(b"%PDF"):
        return ".pdf"
    if contents.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if contents.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if contents.startswith(b"BM"):
        return ".bmp"
    if contents.startswith(b"II*\x00") or contents.startswith(b"MM\x00*"):
        return ".tif"
    return None


def extension_matches_signature(filename: str, contents: bytes) -> bool:
    ext = get_extension(filename)
    detected = detect_file_signature(contents)

    if detected is None:
        return True

    if ext in {".jpg", ".jpeg"} and detected == ".jpg":
        return True

    if ext in {".tif", ".tiff"} and detected == ".tif":
        return True

    return ext == detected


def content_type_is_plausible(filename: str, content_type: Optional[str]) -> bool:
    if not content_type or content_type == "application/octet-stream":
        return True

    ext = get_extension(filename)
    expected = EXTENSION_MIME_GROUPS.get(ext)
    if expected is None:
        return True

    if ext == ".pdf":
        return content_type in expected

    return content_type in expected or content_type.startswith("image/")


def load_image_from_file(contents: bytes, filename: str) -> Image.Image:
    if filename.lower().endswith(".pdf"):
        return load_image_from_pdf(contents)
    return load_image_from_bytes(contents)


def load_image_from_pdf(contents: bytes) -> Image.Image:
    try:
        with fitz.open(stream=contents, filetype="pdf") as pdf_document:
            if len(pdf_document) == 0:
                raise ValueError("The provided PDF is empty.")

            if len(pdf_document) > 1:
                raise ValueError("Multi-page PDF not supported. Please upload a single-page document.")

            page = pdf_document[0]
            pix = page.get_pixmap(dpi=300)
            return Image.open(io.BytesIO(pix.tobytes("png")))
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Could not read the PDF file: {str(e)}") from e


def load_image_from_bytes(contents: bytes) -> Image.Image:
    try:
        return Image.open(io.BytesIO(contents))
    except Exception as e:
        raise ValueError(f"Could not read the image file: {str(e)}") from e


def preprocess_image(image: Image.Image) -> Image.Image:
    image = ImageOps.exif_transpose(image)

    if image.mode != "L":
        image = image.convert("L")

    width, height = image.size
    longest_side = max(width, height)

    if longest_side > MAX_IMAGE_SIDE:
        scale = MAX_IMAGE_SIDE / float(longest_side)
        new_size = (max(1, int(width * scale)), max(1, int(height * scale)))
        image = image.resize(new_size, Image.Resampling.LANCZOS)
    elif longest_side < UPSCALE_TARGET_SIDE:
        scale = UPSCALE_TARGET_SIDE / float(longest_side)
        new_size = (max(1, int(width * scale)), max(1, int(height * scale)))
        image = image.resize(new_size, Image.Resampling.LANCZOS)

    image = ImageOps.autocontrast(image)
    image = ImageEnhance.Contrast(image).enhance(1.20)

    return image


def run_ocr(image: Image.Image, request_id: str) -> OCRExecutionResult:
    if PADDLE_GPU_READY and PADDLE_OCR is not None:
        return run_paddle_first(image, request_id)

    return run_tesseract_first(image, request_id)


def run_paddle_first(image: Image.Image, request_id: str) -> OCRExecutionResult:
    paddle_failure_reason: Optional[str] = None

    try:
        paddle_result = normalize_ocr_result(run_paddle_ocr(image))
        if is_ocr_result_usable(paddle_result, engine="paddleocr"):
            logger.info(
                "ocr_engine_selected request_id=%s engine=paddleocr device=%s quality=%.3f conf=%.3f duration_ms=%d",
                request_id,
                PADDLE_DEVICE,
                paddle_result.text_quality_score,
                paddle_result.overall_confidence,
                paddle_result.duration_ms,
            )
            return paddle_result

        paddle_failure_reason = (
            f"weak_output quality={paddle_result.text_quality_score:.3f} "
            f"conf={paddle_result.overall_confidence:.3f}"
        )
        logger.warning(
            "ocr_fallback request_id=%s from_engine=paddleocr reason=%s",
            request_id,
            paddle_failure_reason,
        )
    except Exception as e:
        paddle_failure_reason = str(e)
        logger.warning(
            "ocr_fallback request_id=%s from_engine=paddleocr reason=%s",
            request_id,
            paddle_failure_reason,
        )

    tesseract_result = normalize_ocr_result(run_tesseract_ocr(image))
    if not is_ocr_result_usable(tesseract_result, engine="tesseract"):
        if paddle_failure_reason:
            raise RuntimeError(
                f"Both OCR engines failed or were unusable. Paddle reason: {paddle_failure_reason}"
            )
        raise RuntimeError("Tesseract OCR produced unusable output.")

    logger.info(
        "ocr_engine_selected request_id=%s engine=tesseract quality=%.3f conf=%.3f duration_ms=%d",
        request_id,
        tesseract_result.text_quality_score,
        tesseract_result.overall_confidence,
        tesseract_result.duration_ms,
    )
    return tesseract_result


def run_tesseract_first(image: Image.Image, request_id: str) -> OCRExecutionResult:
    tesseract_result = normalize_ocr_result(run_tesseract_ocr(image))
    if is_ocr_result_usable(tesseract_result, engine="tesseract"):
        logger.info(
            "ocr_engine_selected request_id=%s engine=tesseract quality=%.3f conf=%.3f duration_ms=%d",
            request_id,
            tesseract_result.text_quality_score,
            tesseract_result.overall_confidence,
            tesseract_result.duration_ms,
        )
        return tesseract_result

    logger.warning(
        "ocr_fallback request_id=%s from_engine=tesseract reason=weak_output quality=%.3f conf=%.3f",
        request_id,
        tesseract_result.text_quality_score,
        tesseract_result.overall_confidence,
    )

    allow_cpu_paddle = PADDLE_OCR is not None and bool_env("ALLOW_CPU_PADDLE", False)
    if allow_cpu_paddle:
        paddle_result = normalize_ocr_result(run_paddle_ocr(image))
        if is_ocr_result_usable(paddle_result, engine="paddleocr"):
            logger.info(
                "ocr_engine_selected request_id=%s engine=paddleocr device=%s quality=%.3f conf=%.3f duration_ms=%d",
                request_id,
                PADDLE_DEVICE,
                paddle_result.text_quality_score,
                paddle_result.overall_confidence,
                paddle_result.duration_ms,
            )
            return paddle_result

    return tesseract_result


def run_paddle_ocr(image: Image.Image) -> OCRExecutionResult:
    if PADDLE_OCR is None:
        raise RuntimeError("PaddleOCR is not initialized.")

    started_at = time.time()
    np_image = np.ascontiguousarray(np.array(image.convert("RGB"))[:, :, ::-1])

    lines = extract_paddle_lines_predict(np_image)

    if not lines and hasattr(PADDLE_OCR, "ocr"):
        lines = extract_paddle_lines_legacy(np_image)

    lines.sort(key=lambda item: item.y_min)
    full_text = "\n".join(line.text for line in lines if line.text)
    overall_confidence = average([line.score for line in lines if line.score > 0])
    text_quality_score = compute_text_quality_score(full_text)

    return OCRExecutionResult(
        text=full_text,
        engine="paddleocr",
        overall_confidence=overall_confidence,
        text_quality_score=text_quality_score,
        lines=lines,
        duration_ms=int((time.time() - started_at) * 1000),
    )


def extract_paddle_lines_predict(np_image: np.ndarray) -> list[OCRLine]:
    raw_results = PADDLE_OCR.predict(np_image)
    first_result = next(iter(raw_results), None)
    payload = extract_paddle_result_payload(first_result)

    rec_texts = payload.get("rec_texts") or []
    rec_scores = to_float_list(payload.get("rec_scores"))
    rec_boxes = payload.get("rec_boxes")

    lines: list[OCRLine] = []

    for idx, raw_line in enumerate(rec_texts):
        text = str(raw_line).strip()
        if not text:
            continue

        score = rec_scores[idx] if idx < len(rec_scores) else 0.0
        y_min = extract_y_min_from_box(rec_boxes, idx)

        lines.append(
            OCRLine(
                text=text,
                score=clamp(score),
                y_min=y_min,
            )
        )

    return lines


def extract_paddle_lines_legacy(np_image: np.ndarray) -> list[OCRLine]:
    lines: list[OCRLine] = []

    try:
        result = PADDLE_OCR.ocr(np_image, cls=True)
    except Exception:
        return lines

    if not result:
        return lines

    data = result[0] if isinstance(result, list) and result and isinstance(result[0], list) else result

    if not isinstance(data, list):
        return lines

    for item in data:
        if not isinstance(item, (list, tuple)) or len(item) < 2:
            continue

        box = item[0]
        rec = item[1]

        text = ""
        score = 0.0

        if isinstance(rec, (list, tuple)):
            if len(rec) >= 1:
                text = str(rec[0]).strip()
            if len(rec) >= 2:
                try:
                    score = float(rec[1])
                except Exception:
                    score = 0.0

        if not text:
            continue

        y_min = extract_y_min_from_box([box], 0)

        lines.append(
            OCRLine(
                text=text,
                score=clamp(score),
                y_min=y_min,
            )
        )

    return lines


def run_tesseract_ocr(image: Image.Image) -> OCRExecutionResult:
    started_at = time.time()

    try:
        text = pytesseract.image_to_string(
            image,
            lang=OCR_LANGUAGES,
            timeout=TESSERACT_TIMEOUT_SECONDS,
        )
        data = pytesseract.image_to_data(
            image,
            lang=OCR_LANGUAGES,
            output_type=Output.DICT,
            timeout=TESSERACT_TIMEOUT_SECONDS,
        )
    except RuntimeError as e:
        raise RuntimeError(f"Tesseract OCR failed or timed out: {str(e)}") from e

    lines = build_tesseract_lines(data)
    if not lines:
        lines = fallback_lines_from_text(text, score=0.0)

    confidence_values = []

    for raw_conf in data.get("conf", []):
        try:
            conf = float(raw_conf)
            if conf >= 0:
                confidence_values.append(conf / 100.0)
        except Exception:
            continue

    overall_confidence = average(confidence_values)
    text_quality_score = compute_text_quality_score(text)

    return OCRExecutionResult(
        text=text,
        engine="tesseract",
        overall_confidence=overall_confidence,
        text_quality_score=text_quality_score,
        lines=lines,
        duration_ms=int((time.time() - started_at) * 1000),
    )


def extract_paddle_result_payload(result_obj: Any) -> dict[str, Any]:
    if result_obj is None:
        return {}

    payload: Any = None

    if hasattr(result_obj, "json"):
        payload = result_obj.json
    elif isinstance(result_obj, dict):
        payload = result_obj

    if callable(payload):
        payload = payload()

    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except Exception:
            payload = {}

    if not isinstance(payload, dict):
        return {}

    if isinstance(payload.get("res"), dict):
        return payload["res"]

    return payload


def to_float_list(values: Any) -> list[float]:
    if values is None:
        return []

    if isinstance(values, np.ndarray):
        values = values.tolist()

    result: list[float] = []

    if isinstance(values, list):
        for value in values:
            try:
                result.append(float(value))
            except Exception:
                result.append(0.0)

    return result


def extract_y_min_from_box(rec_boxes: Any, idx: int) -> int:
    if rec_boxes is None:
        return idx

    try:
        box = rec_boxes[idx]

        if len(box) >= 4 and not isinstance(box[0], (list, tuple, np.ndarray)):
            return int(box[1])

        if len(box) > 0 and isinstance(box[0], (list, tuple, np.ndarray)):
            y_values = [int(point[1]) for point in box if len(point) >= 2]
            return min(y_values) if y_values else idx

    except Exception:
        pass

    return idx


def build_tesseract_lines(data: dict[str, Any]) -> list[OCRLine]:
    texts = data.get("text", [])
    if not texts:
        return []

    lines_map: dict[tuple[int, int, int], dict[str, Any]] = {}

    for i, raw_text in enumerate(texts):
        token = str(raw_text).strip()
        if not token:
            continue

        block_num = safe_int(get_list_value(data, "block_num", i))
        par_num = safe_int(get_list_value(data, "par_num", i))
        line_num = safe_int(get_list_value(data, "line_num", i))
        top = safe_int(get_list_value(data, "top", i))
        conf = safe_conf(get_list_value(data, "conf", i))

        key = (block_num, par_num, line_num)

        if key not in lines_map:
            lines_map[key] = {"tokens": [], "scores": [], "top": top}

        lines_map[key]["tokens"].append(token)
        if conf is not None:
            lines_map[key]["scores"].append(conf)
        lines_map[key]["top"] = min(lines_map[key]["top"], top)

    lines: list[OCRLine] = []

    for value in lines_map.values():
        line_text = " ".join(value["tokens"]).strip()
        if not line_text:
            continue

        line_score = average(value["scores"])
        lines.append(
            OCRLine(
                text=line_text,
                score=line_score,
                y_min=int(value["top"]),
            )
        )

    lines.sort(key=lambda item: item.y_min)
    return lines


def fallback_lines_from_text(text: str, score: float) -> list[OCRLine]:
    lines: list[OCRLine] = []

    for idx, raw_line in enumerate(text.splitlines()):
        line = normalize_line_text(raw_line)
        if not line:
            continue
        lines.append(OCRLine(text=line, score=score, y_min=idx))

    return lines


def normalize_ocr_result(result: OCRExecutionResult) -> OCRExecutionResult:
    normalized_lines: list[OCRLine] = []

    source_lines = result.lines or fallback_lines_from_text(result.text, score=result.overall_confidence)

    for line in source_lines:
        normalized_text = normalize_line_text(line.text)
        if not normalized_text:
            continue

        normalized_lines.append(
            OCRLine(
                text=normalized_text,
                score=clamp(line.score),
                y_min=line.y_min,
            )
        )

    normalized_text = "\n".join(line.text for line in normalized_lines)
    normalized_quality = compute_text_quality_score(normalized_text)

    return OCRExecutionResult(
        text=normalized_text,
        engine=result.engine,
        overall_confidence=clamp(result.overall_confidence),
        text_quality_score=normalized_quality,
        lines=normalized_lines,
        duration_ms=result.duration_ms,
    )


def is_ocr_result_usable(result: OCRExecutionResult, engine: str) -> bool:
    if not result.text.strip():
        return False

    alnum_count = len(re.findall(r"[A-Za-zÀ-ÿ0-9]", result.text))
    if alnum_count < MIN_OCR_ALNUM_COUNT:
        return False

    threshold = PADDLE_MIN_TEXT_QUALITY if engine == "paddleocr" else TESSERACT_MIN_TEXT_QUALITY
    return result.text_quality_score >= threshold


def run_spacy(text: str) -> Optional[Any]:
    if SPACY_NLP is None:
        return None

    if not text.strip():
        return None

    try:
        return SPACY_NLP(text)
    except Exception as e:
        logger.warning("spacy_failed error=%s", str(e))
        return None


def normalize_line_text(text: str) -> str:
    if not text:
        return ""

    text = text.replace("\xa0", " ").replace("\u202f", " ").replace("\u2009", " ")
    text = text.replace("’", "'").replace("`", "'")
    text = text.replace("“", '"').replace("”", '"')

    text = re.sub(r"(?i)\bT\s*[\.\-]?\s*T\s*[\.\-]?\s*C\b", "TTC", text)
    text = re.sub(r"(?i)\bT\s*[\.\-]?\s*N\s*[\.\-]?\s*D\b", "TND", text)
    text = re.sub(r"(?i)\bD\s*[\.\-]?\s*T\b", "DT", text)

    text = re.sub(r"[|]+", " / ", text)
    text = re.sub(r"\s*:\s*", ": ", text)
    text = re.sub(r"\s{2,}", " ", text)
    text = re.sub(r"[ \t]+", " ", text)

    return text.strip(" -_;,.")


def strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn")


def normalize_date(date_str: str) -> Optional[str]:
    raw = normalize_line_text(date_str).strip()
    if not raw:
        return None

    numeric_formats = [
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%d.%m.%Y",
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%Y.%m.%d",
    ]

    for fmt in numeric_formats:
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue

    textual_match = re.match(
        r"(?i)^\s*(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})\s*$",
        raw,
    )

    if textual_match:
        day = int(textual_match.group(1))
        month_name = textual_match.group(2).lower()
        year = int(textual_match.group(3))

        month_key = strip_accents(month_name)
        month = FRENCH_MONTHS.get(month_name) or FRENCH_MONTHS.get(month_key)

        if month:
            try:
                return date(year, month, day).strftime("%Y-%m-%d")
            except ValueError:
                return None

    return None


def normalize_amount_string(raw_amount: str) -> Optional[str]:
    value = normalize_line_text(raw_amount)
    value = re.sub(CURRENCY_RE, "", value)
    value = value.replace(" ", "")
    value = re.sub(r"[^0-9,.\-]", "", value)

    if not value or value in {".", ",", "-", "-.", "-,"}:
        return None

    negative = value.startswith("-")
    value = value.lstrip("-")

    if not value:
        return None

    if "," in value and "." in value:
        last_comma = value.rfind(",")
        last_dot = value.rfind(".")
        last_sep_index = max(last_comma, last_dot)

        integer_part = re.sub(r"[.,]", "", value[:last_sep_index])
        decimal_part = re.sub(r"[.,]", "", value[last_sep_index + 1:])

        normalized = f"{integer_part}.{decimal_part}" if decimal_part else integer_part

    elif "," in value or "." in value:
        sep = "," if "," in value else "."
        parts = value.split(sep)

        if len(parts) == 2:
            left, right = parts
            if len(right) in (2, 3):
                normalized = f"{left}.{right}"
            elif len(right) == 0:
                normalized = left
            else:
                normalized = f"{left}{right}"
        else:
            last = parts[-1]
            if len(last) in (2, 3):
                normalized = f"{''.join(parts[:-1])}.{last}"
            else:
                normalized = "".join(parts)
    else:
        normalized = value

    normalized = normalized.strip(".")
    if not normalized:
        return None

    if negative:
        normalized = f"-{normalized}"

    return normalized


def parse_amount(raw_amount: str) -> Optional[float]:
    normalized = normalize_amount_string(raw_amount)
    if normalized is None:
        return None

    try:
        return float(normalized)
    except ValueError:
        return None


def get_decimal_places(normalized_amount: Optional[str]) -> int:
    if not normalized_amount or "." not in normalized_amount:
        return 0
    return len(normalized_amount.split(".")[-1])


def parse_iso_date(value: str) -> Optional[date]:
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except Exception:
        return None


def extract_fields_from_text(
    text: str,
    ocr_lines: list[OCRLine],
    doc_type: str,
    nlp_doc: Optional[Any],
) -> tuple[dict[str, Any], dict[str, Any], dict[str, dict[str, Any]]]:
    required_fields: dict[str, Any] = {}
    extra_fields: dict[str, Any] = {}
    signals: dict[str, dict[str, Any]] = {
        "invoice_date": {},
        "provider_name": {},
        "total_ttc": {},
    }

    invoice_date, date_signals = extract_invoice_date(ocr_lines)
    if invoice_date:
        required_fields["invoice_date"] = invoice_date
    signals["invoice_date"] = date_signals

    total_ttc, amount_signals = extract_total_amount(ocr_lines)
    if total_ttc is not None:
        required_fields["total_ttc"] = total_ttc
    signals["total_ttc"] = amount_signals

    provider_name, provider_signals = extract_provider_name(ocr_lines, nlp_doc)
    if provider_name:
        required_fields["provider_name"] = provider_name
    signals["provider_name"] = provider_signals

    patient_name = extract_patient_name(text)
    if patient_name:
        extra_fields["patient_name"] = patient_name[:80]

    extra_fields["text_length"] = len(text)
    extra_fields["doc_type_profile"] = doc_type

    return required_fields, extra_fields, signals


def extract_invoice_date(ocr_lines: list[OCRLine]) -> tuple[Optional[str], dict[str, Any]]:
    candidates: list[dict[str, Any]] = []

    for line in ocr_lines:
        raw_line = line.text

        for match in DATE_NUMERIC_RE.finditer(raw_line):
            raw_value = match.group(0).strip()
            normalized = normalize_date(raw_value)
            if not normalized:
                continue

            parsed = parse_iso_date(normalized)
            has_keyword = bool(DATE_KEYWORDS_RE.search(raw_line))
            excluded_context = bool(DATE_EXCLUDE_RE.search(raw_line))
            is_future = parsed > date.today() if parsed else False

            score = (
                0.45
                + (0.20 if has_keyword else 0.0)
                + (0.15 if parsed else 0.0)
                + (0.15 * clamp(line.score))
                - (0.25 if excluded_context else 0.0)
                - (0.20 if is_future else 0.0)
            )

            candidates.append(
                {
                    "value": normalized,
                    "score": score,
                    "raw_value": raw_value,
                    "line_text": raw_line,
                    "has_keyword": has_keyword,
                    "line_score": clamp(line.score),
                    "normalized": True,
                    "is_future": is_future,
                }
            )

        for match in DATE_TEXTUAL_RE.finditer(raw_line):
            raw_value = match.group(0).strip()
            normalized = normalize_date(raw_value)
            if not normalized:
                continue

            parsed = parse_iso_date(normalized)
            has_keyword = bool(DATE_KEYWORDS_RE.search(raw_line))
            excluded_context = bool(DATE_EXCLUDE_RE.search(raw_line))
            is_future = parsed > date.today() if parsed else False

            score = (
                0.50
                + (0.20 if has_keyword else 0.0)
                + (0.15 if parsed else 0.0)
                + (0.15 * clamp(line.score))
                - (0.25 if excluded_context else 0.0)
                - (0.20 if is_future else 0.0)
            )

            candidates.append(
                {
                    "value": normalized,
                    "score": score,
                    "raw_value": raw_value,
                    "line_text": raw_line,
                    "has_keyword": has_keyword,
                    "line_score": clamp(line.score),
                    "normalized": True,
                    "is_future": is_future,
                }
            )

    if not candidates:
        return None, {
            "matched": False,
            "normalized": False,
            "has_keyword": False,
            "line_score": 0.0,
            "raw_value": None,
            "line_text": None,
            "is_future": False,
        }

    best = max(candidates, key=lambda item: item["score"])

    return best["value"], {
        "matched": True,
        "normalized": True,
        "has_keyword": bool(best["has_keyword"]),
        "line_score": float(best["line_score"]),
        "raw_value": best["raw_value"],
        "line_text": best["line_text"],
        "is_future": bool(best["is_future"]),
    }


def extract_total_amount(ocr_lines: list[OCRLine]) -> tuple[Optional[float], dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    line_count = max(len(ocr_lines), 1)
    bottom_zone_start = int(line_count * 0.55)

    for index, line in enumerate(ocr_lines):
        prev_text = ocr_lines[index - 1].text if index > 0 else ""
        next_text = ocr_lines[index + 1].text if index + 1 < len(ocr_lines) else ""

        current_text = line.text
        current_lower = current_text.lower()
        context_text = " ".join(part for part in [prev_text, current_text, next_text] if part)

        line_has_keyword = bool(AMOUNT_KEYWORDS_RE.search(current_text))
        context_has_keyword = bool(AMOUNT_KEYWORDS_RE.search(context_text))

        line_has_final_keyword = bool(AMOUNT_FINAL_KEYWORDS_RE.search(current_text))
        context_has_final_keyword = bool(AMOUNT_FINAL_KEYWORDS_RE.search(context_text))

        has_currency = bool(CURRENCY_RE.search(context_text))
        has_negative_hint_current = bool(AMOUNT_NEGATIVE_HINTS_RE.search(current_text))
        has_negative_hint_context = bool(AMOUNT_NEGATIVE_HINTS_RE.search(context_text))

        is_tva_line = bool(re.search(r"\b(?:tva|taxe)\b", current_text, re.IGNORECASE))
        is_ht_line = bool(re.search(r"\b(?:ht|hors\s+taxe|sous[\s-]*total|subtotal)\b", current_text, re.IGNORECASE))
        is_bottom_zone = index >= bottom_zone_start

        for match in AMOUNT_RE.finditer(current_text):
            raw_value = match.group(1).strip()
            normalized = normalize_amount_string(raw_value)
            parsed = parse_amount(raw_value)

            if normalized is None or parsed is None:
                continue

            if parsed <= 0:
                continue

            decimals = get_decimal_places(normalized)

            if decimals == 0 and not (context_has_keyword or has_currency):
                continue

            if 1900 <= parsed <= 2100 and decimals == 0 and not (context_has_final_keyword and has_currency):
                continue

            score = 0.10

            if line_has_final_keyword:
                score += 0.55
            elif context_has_final_keyword:
                score += 0.38
            elif line_has_keyword:
                score += 0.22
            elif context_has_keyword:
                score += 0.14

            if has_currency:
                score += 0.18

            if "ttc" in current_lower:
                score += 0.12
            elif "ttc" in context_text.lower():
                score += 0.08

            if decimals in (2, 3):
                score += 0.12
            elif decimals == 0:
                score += 0.03

            if is_bottom_zone:
                score += 0.15

            score += 0.08 * clamp(line.score)

            if decimals == 3 and has_currency:
                score += 0.05

            if 0 < parsed < 100000:
                score += 0.04

            if is_tva_line:
                score -= 0.60
            if is_ht_line:
                score -= 0.35
            if has_negative_hint_current and not line_has_final_keyword:
                score -= 0.25
            elif has_negative_hint_context and not context_has_final_keyword:
                score -= 0.10

            candidates.append(
                {
                    "value": round(parsed, 3),
                    "score": score,
                    "raw_value": raw_value,
                    "normalized_value": normalized,
                    "line_text": current_text,
                    "line_score": clamp(line.score),
                    "has_keyword": context_has_final_keyword or context_has_keyword,
                    "currency_detected": has_currency,
                    "decimals": decimals,
                    "plausible": 0 < parsed < 100000,
                }
            )

    if not candidates:
        return None, {
            "matched": False,
            "has_keyword": False,
            "currency_detected": False,
            "line_score": 0.0,
            "raw_value": None,
            "normalized_value": None,
            "decimals": 0,
            "plausible": False,
            "line_text": None,
        }

    best = max(candidates, key=lambda item: item["score"])

    return best["value"], {
        "matched": True,
        "has_keyword": bool(best["has_keyword"]),
        "currency_detected": bool(best["currency_detected"]),
        "line_score": float(best["line_score"]),
        "raw_value": best["raw_value"],
        "normalized_value": best["normalized_value"],
        "decimals": int(best["decimals"]),
        "plausible": bool(best["plausible"]),
        "line_text": best["line_text"],
    }


def extract_provider_name(ocr_lines: list[OCRLine], nlp_doc: Optional[Any]) -> tuple[Optional[str], dict[str, Any]]:
    top_lines = [line for line in ocr_lines if line.text][:12]

    if not top_lines:
        return None, {
            "matched": False,
            "source": None,
            "has_keyword": False,
            "spacy_support": False,
            "line_cleanliness": 0.0,
            "line_score": 0.0,
            "raw_value": None,
            "line_text": None,
        }

    candidates: list[dict[str, Any]] = []

    for index, line in enumerate(top_lines):
        cleaned = clean_provider_candidate(line.text)
        if not cleaned:
            continue

        has_keyword = bool(PROVIDER_KEYWORDS_RE.search(cleaned))
        has_org_term = bool(PROVIDER_ORG_TERMS_RE.search(cleaned))
        has_noise = bool(PROVIDER_NOISE_RE.search(line.text))
        has_strong_noise = bool(PROVIDER_STRONG_NOISE_RE.search(line.text))
        has_spacy_support = spacy_supports_text(cleaned, nlp_doc)
        cleanliness = compute_provider_cleanliness(cleaned)
        digit_ratio = compute_digit_ratio(cleaned)

        if has_strong_noise and not (has_keyword or has_org_term):
            continue

        if has_noise and not (has_keyword or has_org_term):
            continue

        if cleanliness < 0.35:
            continue

        score = 0.18

        if index == 0:
            score += 0.28
        elif index < 3:
            score += 0.18
        elif index < 6:
            score += 0.10

        if has_keyword:
            score += 0.28
        if has_org_term:
            score += 0.22
        if has_spacy_support:
            score += 0.22

        score += 0.18 * cleanliness
        score += 0.10 * clamp(line.score)

        if EMAIL_OR_WEB_RE.search(line.text):
            score -= 0.18
        if digit_ratio > 0.20:
            score -= 0.18
        if has_strong_noise:
            score -= 0.20

        if re.search(r"(?i)\b(?:avenue|av\.|rue|boulevard|bd|route)\b", line.text):
            score -= 0.20

        word_count = len(cleaned.split())
        if 2 <= word_count <= 6:
            score += 0.10

        candidates.append(
            {
                "value": cleaned[:80],
                "score": score,
                "source": "spacy+heuristic" if has_spacy_support else "heuristic",
                "has_keyword": has_keyword or has_org_term,
                "spacy_support": has_spacy_support,
                "line_cleanliness": cleanliness,
                "line_score": clamp(line.score),
                "raw_value": cleaned,
                "line_text": line.text,
            }
        )

    if not candidates:
        for line in top_lines[:6]:
            cleaned = clean_provider_candidate(line.text)
            if not cleaned:
                continue
            if PROVIDER_STRONG_NOISE_RE.search(line.text):
                continue
            if compute_provider_cleanliness(cleaned) >= 0.45:
                return cleaned[:80], {
                    "matched": True,
                    "source": "fallback_top_line",
                    "has_keyword": bool(PROVIDER_KEYWORDS_RE.search(cleaned) or PROVIDER_ORG_TERMS_RE.search(cleaned)),
                    "spacy_support": False,
                    "line_cleanliness": compute_provider_cleanliness(cleaned),
                    "line_score": clamp(line.score),
                    "raw_value": cleaned,
                    "line_text": line.text,
                }

        return None, {
            "matched": False,
            "source": None,
            "has_keyword": False,
            "spacy_support": False,
            "line_cleanliness": 0.0,
            "line_score": 0.0,
            "raw_value": None,
            "line_text": None,
        }

    best = max(candidates, key=lambda item: item["score"])

    return best["value"], {
        "matched": True,
        "source": best["source"],
        "has_keyword": bool(best["has_keyword"]),
        "spacy_support": bool(best["spacy_support"]),
        "line_cleanliness": float(best["line_cleanliness"]),
        "line_score": float(best["line_score"]),
        "raw_value": best["raw_value"],
        "line_text": best["line_text"],
    }


def extract_patient_name(text: str) -> Optional[str]:
    for pattern in PATIENT_PATTERNS:
        match = pattern.search(text)
        if match:
            candidate = normalize_line_text(match.group(1))
            candidate = re.sub(r"\b(?:tel|tél|fax|gsm|adresse)\b.*$", "", candidate, flags=re.IGNORECASE)
            candidate = candidate.strip(" -_;,.")
            if candidate and len(candidate) >= 3:
                return candidate
    return None


def clean_provider_candidate(text: str) -> str:
    candidate = normalize_line_text(text)

    candidate = re.sub(
        r"(?i)^(?:prestataire|fournisseur|provider|structure|raison\s+sociale)\s*[:\-]\s*",
        "",
        candidate,
    )

    candidate = re.sub(
        r"(?i)\b(?:facture|invoice|reçu)\b.*$",
        "",
        candidate,
    )

    candidate = re.split(
        r"(?i)\b(?:avenue|av\.|rue|boulevard|bd|route|lot|immeuble|appartement|"
        r"tél|tel|fax|gsm|email|e-mail|site|www|mf|matricule|rc|adresse)\b",
        candidate,
        maxsplit=1,
    )[0]

    candidate = re.sub(r"(?:\s+\d{4,}.*)$", "", candidate)
    candidate = re.sub(r"\s{2,}", " ", candidate).strip(" -_;,.")

    return candidate


def spacy_supports_text(candidate: str, nlp_doc: Optional[Any]) -> bool:
    if nlp_doc is None:
        return False

    normalized_candidate = normalize_for_compare(candidate)
    if not normalized_candidate:
        return False

    for ent in getattr(nlp_doc, "ents", []):
        if ent.label_ not in {"ORG", "ORG_HINT", "PROVIDER_PERSON"}:
            continue

        ent_text = normalize_for_compare(clean_provider_candidate(ent.text))
        if not ent_text:
            continue

        if ent_text in normalized_candidate or normalized_candidate in ent_text:
            return True

    return False


def normalize_for_compare(value: str) -> str:
    normalized = strip_accents(value.lower())
    normalized = re.sub(r"[^a-z0-9\s]", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def compute_provider_cleanliness(text: str) -> float:
    if not text:
        return 0.0

    letter_count = len(re.findall(r"[A-Za-zÀ-ÿ]", text))
    digit_count = len(re.findall(r"\d", text))
    symbol_count = len(re.findall(r"[^A-Za-zÀ-ÿ0-9\s'’\-]", text))

    total = max(len(text), 1)
    score = (letter_count / total) * 1.3 - (digit_count / total) * 0.8 - (symbol_count / total) * 0.6

    if PROVIDER_KEYWORDS_RE.search(text) or PROVIDER_ORG_TERMS_RE.search(text):
        score += 0.20

    return clamp(score)


def compute_digit_ratio(text: str) -> float:
    if not text:
        return 0.0
    digits = len(re.findall(r"\d", text))
    return digits / max(len(text), 1)


def calculate_confidence(
    fields: dict[str, Any],
    ocr_result: OCRExecutionResult,
    extraction_signals: dict[str, dict[str, Any]],
) -> dict[str, float]:
    confidence: dict[str, float] = {}
    ocr_base = clamp((0.55 * ocr_result.overall_confidence) + (0.45 * ocr_result.text_quality_score))

    for field_name in REQUIRED_FIELDS:
        value = fields.get(field_name)
        signal = extraction_signals.get(field_name, {})

        if value is None:
            confidence[field_name] = 0.0
            continue

        if field_name == "invoice_date":
            score = (
                (0.20 * ocr_base)
                + (0.30 if signal.get("matched") else 0.0)
                + (0.25 if signal.get("normalized") else 0.0)
                + (0.15 if signal.get("has_keyword") else 0.0)
                + (0.10 * clamp(signal.get("line_score", 0.0)))
                - (0.20 if signal.get("is_future") else 0.0)
            )
            confidence[field_name] = round(clamp(score), 2)

        elif field_name == "total_ttc":
            decimals = int(signal.get("decimals", 0))
            decimals_quality = 1.0 if decimals in (2, 3) else 0.5 if decimals == 0 else 0.0

            score = (
                (0.20 * ocr_base)
                + (0.20 if signal.get("matched") else 0.0)
                + (0.22 if signal.get("has_keyword") else 0.0)
                + (0.15 if signal.get("currency_detected") else 0.0)
                + (0.10 if signal.get("plausible") else 0.0)
                + (0.10 * decimals_quality)
                + (0.05 * clamp(signal.get("line_score", 0.0)))
            )
            confidence[field_name] = round(clamp(score), 2)

        elif field_name == "provider_name":
            score = (
                (0.20 * ocr_base)
                + (0.22 if signal.get("matched") else 0.0)
                + (0.20 if signal.get("has_keyword") else 0.0)
                + (0.15 if signal.get("spacy_support") else 0.0)
                + (0.15 * clamp(signal.get("line_cleanliness", 0.0)))
                + (0.08 * clamp(signal.get("line_score", 0.0)))
            )
            confidence[field_name] = round(clamp(score), 2)

        else:
            confidence[field_name] = 0.0

    return confidence


def generate_warnings(fields: dict[str, Any], confidence: dict[str, float]) -> list[str]:
    warnings: list[str] = []

    for field_name in REQUIRED_FIELDS:
        value = fields.get(field_name)
        score = confidence.get(field_name, 0.0)

        if value is None:
            warnings.append(f"Missing required field: '{field_name}'")
        elif score < LOW_CONFIDENCE_THRESHOLD:
            warnings.append(f"Low confidence ({score:.0%}) for field: '{field_name}'")

    return warnings


def build_empty_fields() -> dict[str, Any]:
    return {key: None for key in REQUIRED_FIELDS}


def build_empty_confidence() -> dict[str, float]:
    return {key: MISSING_FIELD_CONFIDENCE for key in REQUIRED_FIELDS}


def apply_extracted_fields(target_fields: dict[str, Any], extracted_fields: dict[str, Any]) -> None:
    for key in REQUIRED_FIELDS:
        if key in extracted_fields:
            target_fields[key] = extracted_fields[key]


def build_extra_payload(
    extra_fields: dict[str, Any],
    ocr_result: OCRExecutionResult,
    extraction_signals: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    payload = dict(extra_fields)
    payload["text_preview"] = ocr_result.text[:200].replace("\n", " ") if ocr_result.text else ""
    payload["ocr_overall_confidence"] = round(ocr_result.overall_confidence, 3)
    payload["ocr_text_quality"] = round(ocr_result.text_quality_score, 3)
    payload["ocr_line_count"] = len(ocr_result.lines)
    payload["ocr_duration_ms"] = ocr_result.duration_ms
    payload["provider_source"] = extraction_signals.get("provider_name", {}).get("source")
    payload["currency_detected"] = extraction_signals.get("total_ttc", {}).get("currency_detected", False)
    payload["amount_raw"] = extraction_signals.get("total_ttc", {}).get("raw_value")
    payload["date_raw"] = extraction_signals.get("invoice_date", {}).get("raw_value")
    payload["paddle_device"] = PADDLE_DEVICE if PADDLE_OCR is not None else None
    return payload


def build_success_response(
    *,
    doc_type: str,
    request_id: str,
    processing_time_ms: int,
    fields: dict[str, Any],
    confidence: dict[str, float],
    warnings: list[str],
    errors: list[str],
    extra: dict[str, Any],
    ocr_engine: str,
) -> dict[str, Any]:
    return {
        "meta": {
            "doc_type": doc_type,
            "request_id": request_id,
            "processing_time_ms": processing_time_ms,
            "ocr_engine": ocr_engine,
            "extra": extra,
            "note": SERVICE_NOTE,
        },
        "fields": fields,
        "confidence": confidence,
        "warnings": warnings,
        "errors": errors,
    }


def build_client_error_response(
    *,
    doc_type: str,
    request_id: str,
    processing_time_ms: int,
    fields: dict[str, Any],
    confidence: dict[str, float],
    error_message: str,
    ocr_engine: Optional[str],
) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={
            "meta": {
                "doc_type": doc_type,
                "request_id": request_id,
                "processing_time_ms": processing_time_ms,
                "ocr_engine": ocr_engine,
                "extra": {},
                "note": SERVICE_NOTE,
                "error": error_message,
            },
            "fields": fields,
            "confidence": confidence,
            "warnings": [],
            "errors": [error_message],
        },
    )


def build_server_error_response(
    *,
    doc_type: str,
    request_id: str,
    processing_time_ms: int,
    fields: dict[str, Any],
    confidence: dict[str, float],
    ocr_engine: Optional[str],
) -> JSONResponse:
    generic_error = "Pipeline failed. Please retry or inspect server logs with the provided request_id."

    return JSONResponse(
        status_code=500,
        content={
            "meta": {
                "doc_type": doc_type,
                "request_id": request_id,
                "processing_time_ms": processing_time_ms,
                "ocr_engine": ocr_engine,
                "extra": {},
                "note": SERVICE_NOTE,
                "error": generic_error,
            },
            "fields": fields,
            "confidence": confidence,
            "warnings": [],
            "errors": [generic_error],
        },
    )


def get_processing_time_ms(start_time: float) -> int:
    return int((time.time() - start_time) * 1000)


def log_if_slow_request(request_id: str, processing_time_ms: int, engine: Optional[str]) -> None:
    if processing_time_ms >= REQUEST_WARNING_MS:
        logger.warning(
            "slow_request request_id=%s duration_ms=%d engine=%s threshold_ms=%d",
            request_id,
            processing_time_ms,
            engine,
            REQUEST_WARNING_MS,
        )


def clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, float(value)))


def average(values: list[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def safe_int(value: Any) -> int:
    try:
        return int(value)
    except Exception:
        return 0


def safe_conf(value: Any) -> Optional[float]:
    try:
        conf = float(value)
        if conf < 0:
            return None
        return conf / 100.0
    except Exception:
        return None


def get_list_value(data: dict[str, Any], key: str, index: int) -> Any:
    values = data.get(key, [])
    if index < len(values):
        return values[index]
    return None


def compute_text_quality_score(text: str) -> float:
    cleaned = text.strip()
    if not cleaned:
        return 0.0

    compact = re.sub(r"\s+", "", cleaned)
    if not compact:
        return 0.0

    alnum_count = len(re.findall(r"[A-Za-zÀ-ÿ0-9]", compact))
    letter_ratio = alnum_count / max(len(compact), 1)

    token_count = len(re.findall(r"\b\w+\b", cleaned, flags=re.UNICODE))
    line_count = len([line for line in cleaned.splitlines() if line.strip()])

    strange_symbol_count = len(re.findall(r"[^A-Za-zÀ-ÿ0-9\s,.:;\/'’\-()%]", cleaned))
    strange_symbol_ratio = strange_symbol_count / max(len(cleaned), 1)

    score = (
        (0.45 * clamp(letter_ratio))
        + (0.20 * min(token_count / 12.0, 1.0))
        + (0.15 * min(line_count / 4.0, 1.0))
        + (0.20 * min(len(cleaned) / 60.0, 1.0))
        - (0.15 * strange_symbol_ratio)
    )

    return clamp(score)