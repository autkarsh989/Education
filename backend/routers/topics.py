from fastapi import APIRouter, Depends, HTTPException
from pathlib import Path
from functools import lru_cache
import json
import logging
import re
from typing import Any

from helper import get_user_class_number

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/topics", tags=["topics"])

BASE_DIR = Path(__file__).resolve().parents[1]
TOPICS_PATH = BASE_DIR / "syllabus" / "topics.json"
INGESTION_REGISTRY_PATH = BASE_DIR / "vectordb" / "ingestion_registry.json"


def _normalize_class_number(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip().lower().replace("grade", "class")
    match = re.search(r"(\d{1,2})", text)
    return match.group(1) if match else ""


def _normalize_subject(value: Any) -> str:
    return str(value or "").strip()


def _default_subjects_for_class(class_number: str) -> list[str]:
    n = _normalize_class_number(class_number)
    if n in {"11", "12"}:
        return ["Mathematics", "Physics", "Chemistry", "Biology"]
    return ["Mathematics", "Science", "English", "Social Science"]


def _get_subjects_from_ingestion_registry(class_number: str) -> list[str]:
    """Fallback subject source from ingestion registry when vector metadata lookup fails."""
    if not INGESTION_REGISTRY_PATH.exists():
        return []

    try:
        with INGESTION_REGISTRY_PATH.open("r", encoding="utf-8") as f:
            payload = json.load(f)
    except Exception as e:
        logger.warning(f"Failed to read ingestion registry: {e}")
        return []

    records = payload.get("records", []) if isinstance(payload, dict) else []
    target_class = _normalize_class_number(class_number)
    subjects_map: dict[str, str] = {}

    for item in records:
        if not isinstance(item, dict):
            continue
        if _normalize_class_number(item.get("class_number")) != target_class:
            continue
        subject = _normalize_subject(item.get("subject"))
        if not subject:
            continue
        key = subject.lower()
        if key not in subjects_map:
            subjects_map[key] = subject

    return sorted(subjects_map.values(), key=lambda s: s.lower())


@lru_cache(maxsize=1)
def load_topics_data():
    """Load topics JSON with caching to avoid repeated file I/O."""
    if not TOPICS_PATH.exists():
        raise HTTPException(status_code=500, detail="Topics data file not found on server")

    try:
        with TOPICS_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
        logger.info("Topics data loaded and cached")
        return data
    except Exception as e:
        logger.error(f"Failed to read topics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to read topics: {e}")


def _get_subjects_from_vector_db(class_number: str) -> list:
    """Get unique subjects available for a given class from the vector DB."""
    try:
        from langchain_community.vectorstores import FAISS
        from langchain_huggingface import HuggingFaceEmbeddings
        
        db_path = BASE_DIR / "vectordb" / "faiss_db_all_classes_subjects"
        
        if not db_path.exists():
            logger.warning(f"Vector DB not found at {db_path}")
            return []
        
        # Load the vector store
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        vectorstore = FAISS.load_local(
            str(db_path),
            embeddings,
            allow_dangerous_deserialization=True
        )
        
        # Get all documents with their metadata
        target_class = _normalize_class_number(class_number)
        # FAISS stores metadata in _metadatas - get unique subjects for this class
        subjects_map: dict[str, str] = {}
        
        # Access the metadata from the docstore
        if hasattr(vectorstore, 'docstore'):
            for doc_id in vectorstore.docstore._dict.keys():
                doc = vectorstore.docstore._dict[doc_id]
                if hasattr(doc, 'metadata'):
                    doc_class = _normalize_class_number(doc.metadata.get('class_number'))
                    if doc_class == target_class:
                        subject = _normalize_subject(doc.metadata.get('subject'))
                        if subject:
                            key = subject.lower()
                            if key not in subjects_map:
                                subjects_map[key] = subject
        
        return sorted(subjects_map.values(), key=lambda s: s.lower())
    except Exception as e:
        logger.error(f"Error fetching subjects from vector DB: {e}")
        return []


@router.get("/", response_model=list)
def get_topics_for_current_user(class_num: int = Depends(get_user_class_number)):
    """Return the list of topic category names for the current user's class."""
    key = f"class_{class_num}"
    data = load_topics_data()

    topics_for_class = data.get(key)
    if topics_for_class is None:
        raise HTTPException(status_code=404, detail=f"No topics found for class {class_num}")

    # Return only the topic category names (keys) as a list of strings
    logger.debug(f"Returned topics for class {class_num}: {list(topics_for_class.keys())}")
    return list(topics_for_class.keys())


@router.get("/subjects", response_model=list)
def get_subjects_for_current_user(class_num: int = Depends(get_user_class_number)):
    """Return the list of available subjects for the current user's class from the vector DB."""
    class_key = str(class_num)
    subjects = _get_subjects_from_vector_db(class_key)

    if not subjects:
        subjects = _get_subjects_from_ingestion_registry(class_key)

    if not subjects:
        subjects = _default_subjects_for_class(class_key)

    logger.debug(f"Returned subjects for class {class_num}: {subjects}")
    return subjects


