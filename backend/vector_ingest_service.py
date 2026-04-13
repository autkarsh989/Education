import hashlib
import json
import shutil
import tempfile
import zipfile
import time
from datetime import datetime
from pathlib import Path

from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

BASE_DIR = Path(__file__).resolve().parent
VECTOR_DB_DIR = BASE_DIR / "vectordb" / "faiss_db_all_classes_subjects"
REGISTRY_FILE = BASE_DIR / "vectordb" / "ingestion_registry.json"

EMBEDDINGS = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
SPLITTER = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)


def _log(message: str) -> None:
    print(f"[vector-ingest] {message}", flush=True)


def ensure_paths() -> None:
    _log("Ensuring vector DB and registry paths exist")
    VECTOR_DB_DIR.parent.mkdir(parents=True, exist_ok=True)
    if not REGISTRY_FILE.exists():
        _log(f"Registry file not found, creating: {REGISTRY_FILE}")
        REGISTRY_FILE.write_text(
            json.dumps({"records": [], "updated_at": None}, indent=2),
            encoding="utf-8",
        )


def load_registry() -> dict:
    ensure_paths()
    try:
        data = json.loads(REGISTRY_FILE.read_text(encoding="utf-8"))
        _log(f"Registry loaded with {len(data.get('records', []))} existing records")
        return data
    except json.JSONDecodeError:
        _log("Registry JSON is invalid; resetting registry in-memory")
        return {"records": [], "updated_at": None}


def save_registry(data: dict) -> None:
    data["updated_at"] = datetime.utcnow().isoformat()
    REGISTRY_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
    _log(f"Registry updated and saved: {REGISTRY_FILE}")


def _file_sha256(file_path: Path) -> str:
    hasher = hashlib.sha256()
    with file_path.open("rb") as f:
        while True:
            chunk = f.read(8192)
            if not chunk:
                break
            hasher.update(chunk)
    return hasher.hexdigest()


def _extract_text_from_pdf(pdf_path: Path) -> str:
    _log(f"Extracting text from PDF: {pdf_path.name}")
    reader = PdfReader(str(pdf_path))
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    text = "\n".join(pages).strip()
    _log(f"Text extraction complete for {pdf_path.name}: {len(pages)} pages, {len(text)} chars")
    return text


def _load_or_create_store():
    if VECTOR_DB_DIR.exists() and any(VECTOR_DB_DIR.iterdir()):
        _log(f"Loading existing FAISS store from: {VECTOR_DB_DIR}")
        return FAISS.load_local(
            str(VECTOR_DB_DIR),
            EMBEDDINGS,
            allow_dangerous_deserialization=True,
        )
    _log("No existing FAISS store found; a new store will be created")
    return None


def _append_documents_to_store(texts: list[str], metadatas: list[dict]) -> int:
    if not texts:
        _log("No new document texts to process for chunking")
        return 0

    _log(f"Preparing chunks from {len(texts)} documents")
    chunks = []
    chunk_metas = []
    for text, meta in zip(texts, metadatas):
        split_chunks = SPLITTER.split_text(text)
        _log(
            "Created "
            f"{len(split_chunks)} chunks for {meta.get('source_pdf', 'unknown.pdf')} "
            f"(class={meta.get('class_number')}, subject={meta.get('subject')})"
        )
        for idx, chunk in enumerate(split_chunks):
            chunks.append(chunk)
            item_meta = dict(meta)
            item_meta["chunk_index"] = idx
            chunk_metas.append(item_meta)

    if not chunks:
        _log("Chunk list is empty after processing")
        return 0

    _log(f"Total chunks ready for embedding: {len(chunks)}")
    vectorstore = _load_or_create_store()
    if vectorstore is None:
        _log("Creating new FAISS index from chunks")
        vectorstore = FAISS.from_texts(chunks, EMBEDDINGS, metadatas=chunk_metas)
    else:
        _log("Appending chunks to existing FAISS index")
        vectorstore.add_texts(chunks, metadatas=chunk_metas)

    vectorstore.save_local(str(VECTOR_DB_DIR))
    _log(f"FAISS index saved to: {VECTOR_DB_DIR}")
    return len(chunks)


def ingest_zip(zip_path: Path, class_number: str, subject: str, zip_filename: str | None = None) -> dict:
    start_time = time.time()
    _log(
        f"Starting ingestion | zip={zip_filename or zip_path.name} | "
        f"class={class_number} | subject={subject}"
    )

    if zip_path.suffix.lower() != ".zip":
        _log("Rejected upload: file is not a .zip")
        raise ValueError("Please upload a .zip file")

    registry = load_registry()

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        local_zip_path = tmp_path / (zip_filename or zip_path.name)
        _log(f"Copying uploaded ZIP to temp path: {local_zip_path}")
        shutil.copyfile(zip_path, local_zip_path)
        _log("ZIP received and copied successfully")

        try:
            with zipfile.ZipFile(local_zip_path, "r") as zf:
                _log(f"Extracting ZIP contents: {local_zip_path.name}")
                zf.extractall(tmp_path / "unzipped")
                _log(f"ZIP extracted. Archive members: {len(zf.infolist())}")
        except zipfile.BadZipFile as exc:
            _log("ZIP extraction failed: invalid ZIP file")
            raise ValueError("Invalid ZIP file") from exc

        extracted_dir = tmp_path / "unzipped"
        pdf_files = list(extracted_dir.rglob("*.pdf"))
        _log(f"PDF scan complete. Total PDFs found: {len(pdf_files)}")
        if not pdf_files:
            raise ValueError("No PDF files found in ZIP")

        texts = []
        metas = []
        added_pdfs = 0
        skipped_pdfs = 0

        for idx, pdf in enumerate(pdf_files, start=1):
            _log(f"Processing PDF {idx}/{len(pdf_files)}: {pdf.name}")
            file_hash = _file_sha256(pdf)
            relative_name = str(pdf.relative_to(extracted_dir))

            already_exists = any(
                rec.get("class_number") == class_number
                and rec.get("subject") == subject
                and rec.get("file_hash") == file_hash
                for rec in registry.get("records", [])
            )
            if already_exists:
                _log(f"Skipping duplicate PDF (already ingested for class/subject): {relative_name}")
                skipped_pdfs += 1
                continue

            text = _extract_text_from_pdf(pdf)
            if not text:
                _log(f"Skipping PDF due to empty extracted text: {relative_name}")
                skipped_pdfs += 1
                continue

            texts.append(text)
            metas.append(
                {
                    "class_number": class_number,
                    "subject": subject,
                    "source_pdf": relative_name,
                    "file_hash": file_hash,
                    "ingested_at": datetime.utcnow().isoformat(),
                }
            )

            registry["records"].append(
                {
                    "class_number": class_number,
                    "subject": subject,
                    "source_pdf": relative_name,
                    "file_hash": file_hash,
                    "zip_file": zip_filename or zip_path.name,
                    "status": "ingested",
                    "ingested_at": datetime.utcnow().isoformat(),
                }
            )
            added_pdfs += 1
            _log(f"Prepared PDF for vectorization: {relative_name}")

    _log(
        f"PDF processing summary | found={len(pdf_files)} | "
        f"added={added_pdfs} | skipped={skipped_pdfs}"
    )
    chunks_added = _append_documents_to_store(texts, metas)
    save_registry(registry)

    elapsed = time.time() - start_time
    _log(
        f"Ingestion complete | chunks_added={chunks_added} | "
        f"duration={elapsed:.2f}s"
    )

    return {
        "message": "Ingestion completed",
        "class_number": class_number,
        "subject": subject,
        "zip_file": zip_filename or zip_path.name,
        "pdfs_found": len(pdf_files),
        "pdfs_added": added_pdfs,
        "pdfs_skipped": skipped_pdfs,
        "chunks_added": chunks_added,
        "vector_db_path": str(VECTOR_DB_DIR),
        "registry_file": str(REGISTRY_FILE),
    }
