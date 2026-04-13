import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse

from vector_ingest_service import ingest_zip, load_registry

router = APIRouter(prefix="/vector-ingest", tags=["Vector Ingestion"])
BASE_DIR = Path(__file__).resolve().parents[1]
LOCAL_HTML = BASE_DIR / "vector_ingest_local.html"


@router.get("/ui", response_class=HTMLResponse)
def upload_ui():
    return HTMLResponse(content=LOCAL_HTML.read_text(encoding="utf-8"))


@router.post("/upload-zip")
async def upload_zip_and_ingest(
    class_number: str = Form(...),
    subject: str = Form(...),
    zip_file: UploadFile = File(...),
):
    if not zip_file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Please upload a .zip file")

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        zip_path = tmp_path / zip_file.filename

        with zip_path.open("wb") as out:
            shutil.copyfileobj(zip_file.file, out)

        try:
            result = ingest_zip(
                zip_path=zip_path,
                class_number=class_number,
                subject=subject,
                zip_filename=zip_file.filename,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    return JSONResponse(result)


@router.get("/records")
def get_ingestion_records():
    return load_registry()
