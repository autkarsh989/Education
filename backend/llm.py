import os
import json
import re
import logging
from typing import Any
from dotenv import load_dotenv
from litellm import completion
from pathlib import Path

logger = logging.getLogger(__name__)
load_dotenv()

# ======================================================
# 🔥 Runtime Editable CONFIG (Controlled via /config)
# ======================================================

CONFIG = {
    "model_name": os.getenv("MODEL_NAME", "ollama/qwen2.5:3b"),
    "api_key": os.getenv("GEMINI_API_KEY"),
    "api_base": 'http://localhost:11434',
}

# ======================================================
# Helper: Centralized LLM Call
# ======================================================

def _llm_call(messages):
    return completion(
        model=CONFIG["model_name"],
        api_key=CONFIG["api_key"],
        api_base=CONFIG.get("api_base"),
        messages=messages,
    )


# ======================================================
# RAG Retrieval with Metadata Filtering
# ======================================================

def _retrieve_relevant_context(query: str, class_number: str, subject: str, k: int = 4) -> str:
    """
    Retrieve relevant context from FAISS vector DB using metadata filters.
    
    Args:
        query: The question/query string
        class_number: The student's class number as string (e.g., "10")
        subject: The subject to filter by (e.g., "Biology")
        k: Number of documents to retrieve
    
    Returns:
        Combined context from matching documents
    """
    try:
        from langchain_community.vectorstores import FAISS
        from langchain_huggingface import HuggingFaceEmbeddings
        
        base_dir = os.path.dirname(__file__)
        db_path = os.path.join(base_dir, "vectordb", "faiss_db_all_classes_subjects")
        
        if not os.path.exists(db_path):
            logger.warning(f"Vector DB not found at {db_path}")
            return ""
        
        # Load embeddings and vector store
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        vectorstore = FAISS.load_local(
            db_path,
            embeddings,
            allow_dangerous_deserialization=True
        )
        
        # Retrieve similar documents
        docs = vectorstore.similarity_search(query, k=k)
        
        # Filter by class and subject metadata
        target_class = _normalize_class_number(class_number)
        target_subject = _normalize_subject(subject)
        filtered_docs = []
        for doc in docs:
            if hasattr(doc, 'metadata'):
                doc_class = _normalize_class_number(doc.metadata.get('class_number'))
                doc_subject = _normalize_subject(doc.metadata.get('subject'))
                # Match if class and subject both match
                if doc_class == target_class and doc_subject == target_subject:
                    filtered_docs.append(doc)
        
        # If no exact matches, use all retrieved docs (fallback)
        if not filtered_docs:
            logger.debug(f"No exact metadata matches for class={class_number}, subject={subject}. Using all retrieved docs.")
            filtered_docs = docs
        
        # Combine context from all relevant documents
        context = "\n\n".join([doc.page_content for doc in filtered_docs[:k]])
        return context
        
    except Exception as e:
        logger.error(f"Error retrieving context from vector DB: {e}")
        return ""


# ======================================================
# Prompt Loader
# ======================================================

def load_prompt_for_class(class_number: int) -> dict:
    base_dir = os.path.dirname(__file__)
    base_prompt_path = os.path.join(base_dir, "prompts", "two.json")

    if not os.path.exists(base_prompt_path):
        return {
            "role": "system",
            "content": {"type": "text", "text": "You are a helpful tutor."}
        }

    try:
        with open(base_prompt_path, "r", encoding="utf-8") as f:
            prompt = json.load(f)
    except Exception:
        return {
            "role": "system",
            "content": {"type": "text", "text": "You are a helpful tutor."}
        }

    return prompt


# ======================================================
# Generate Hint
# ======================================================

def generate_hint(
    question: str,
    last_context: str = "",
    image_b64: str | None = None,
    user_class: int | str | None = None,
    subject: str | None = None,
    parent_feedback: str | None = None,
    **kwargs
) -> str:
    """
    Generate a hint for the student question using RAG.
    
    Args:
        question: The student's question
        last_context: Previous conversation context
        image_b64: Base64 encoded image if provided
        user_class: Student's class level
        subject: Subject to filter vector DB retrieval
        parent_feedback: Optional parent feedback
    
    Returns:
        Generated hint text
    """

    from helper import normalize_class_to_number

    class_number = normalize_class_to_number(user_class)
    system_prompt = load_prompt_for_class(class_number)

    # Retrieve relevant context from vector DB if subject is provided
    rag_context = ""
    if subject:
        rag_context = _retrieve_relevant_context(question, str(class_number), subject, k=4)
    
    feedback_section = f"\nParent feedback: {parent_feedback}" if parent_feedback else ""
    
    # Build RAG context section if available
    rag_section = f"\nRelevant material:\n{rag_context}" if rag_context else ""

    content = [{
        "type": "text",
        "text": f"Student class: class_{class_number}\n"
                f"Subject: {subject or 'General'}\n"
                f"Student question: {question}\n"
                f"Previous context: {last_context}{rag_section}{feedback_section}\n"
                f"Respond concisely with helpful guidance."
    }]

    if image_b64:
        image_data_url = f"data:image/png;base64,{image_b64}"
        content.append({
            "type": "image_url",
            "image_url": image_data_url
        })

    messages = [
        system_prompt,
        {"role": "user", "content": content}
    ]

    response = _llm_call(messages)
    return response["choices"][0]["message"]["content"].strip()


# ======================================================
# Get Chat Title
# ======================================================

def get_chat_title(text: str) -> str:
    """Generate a short chat title from the initial message."""
    try:
        messages = [
            {
                "role": "system",
                "content": "Generate a short 3-4 word chat title."
            },
            {"role": "user", "content": text}
        ]

        response = _llm_call(messages)
        return response["choices"][0]["message"]["content"].strip()

    except Exception as e:
        logger.error(f"Error generating chat title: {e}")
        return "Chat"


# ======================================================
# Generate Parent Report
# ======================================================

def generate_parent_report(child: dict, comparison: dict | None = None) -> str:
    """Generate an encouraging parent report about the child's progress."""

    system_prompt = {
        "role": "system",
        "content": "Write a short encouraging parent report (70-120 words)."
    }

    user_content = json.dumps({
        "child": child,
        "comparison": comparison
    })

    messages = [
        system_prompt,
        {"role": "user", "content": user_content},
    ]

    resp = _llm_call(messages)
    return resp["choices"][0]["message"]["content"].strip()


# ======================================================
# Generate Contest Questions (Dynamic)
# ======================================================

def _extract_json_payload(raw_text: str) -> Any:
    """Extract JSON object/array from an LLM response safely."""
    text = (raw_text or "").strip()
    if not text:
        return None

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    fenced_match = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL | re.IGNORECASE)
    if fenced_match:
        candidate = fenced_match.group(1).strip()
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    generic_match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
    if generic_match:
        candidate = generic_match.group(1)
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    return None


def _normalize_class_number(value: Any) -> str:
    """Normalize class metadata values to numeric string form, e.g. class_10 -> 10."""
    if value is None:
        return ""
    text = str(value).strip().lower().replace("grade", "class")
    match = re.search(r"(\d{1,2})", text)
    return match.group(1) if match else ""


def _normalize_subject(value: Any) -> str:
    return str(value or "").strip().lower()


def _default_subjects_for_class(class_number: str) -> list[str]:
    """Fallback subjects when vector metadata lookup is unavailable."""
    n = _normalize_class_number(class_number)
    if n in {"11", "12"}:
        return ["Mathematics", "Physics", "Chemistry", "Biology"]
    return ["Mathematics", "Science", "English", "Social Science"]

def _get_available_subjects(class_number: str) -> list[str]:
    """Get unique subjects available for a given class from the vector DB."""
    try:
        from langchain_community.vectorstores import FAISS
        from langchain_huggingface import HuggingFaceEmbeddings
        
        base_dir = os.path.dirname(__file__)
        db_path = os.path.join(base_dir, "vectordb", "faiss_db_all_classes_subjects")
        
        if not os.path.exists(db_path):
            logger.warning(f"Vector DB not found at {db_path}")
            return []
        
        # Load the vector store
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        vectorstore = FAISS.load_local(
            db_path,
            embeddings,
            allow_dangerous_deserialization=True
        )
        
        # Get all documents with their metadata
        target_class = _normalize_class_number(class_number)
        subjects = set()
        
        # Access the metadata from the docstore
        if hasattr(vectorstore, 'docstore'):
            for doc_id in vectorstore.docstore._dict.keys():
                doc = vectorstore.docstore._dict[doc_id]
                if hasattr(doc, 'metadata'):
                    doc_class = _normalize_class_number(doc.metadata.get('class_number'))
                    if doc_class == target_class:
                        subject = doc.metadata.get('subject')
                        if subject:
                            subjects.add(subject)
        
        return sorted(list(subjects))
    except Exception as e:
        logger.error(f"Error fetching subjects from vector DB: {e}")
        return []


def generate_contest_questions(
    class_number: str,
    num_questions: int = 5,
    contest_id: str | None = None,
) -> list[dict[str, Any]]:
    """
    Generate concise, subject-relevant MCQs using a single LLM call.
    
    Args:
        class_number: The class level (e.g., "10", "class_10")
        num_questions: Number of questions to generate
    
    Returns:
        List of question dictionaries with options, correct answer, explanation
    """
    try:
        # Normalize class number format
        if not class_number.startswith("class_"):
            class_number = f"class_{class_number.replace('class_', '')}"

        # Extract numeric part for subject fetching
        numeric_class = class_number.replace("class_", "")

        # Get available subjects
        subjects = _get_available_subjects(numeric_class)

        if not subjects:
            subjects = _default_subjects_for_class(numeric_class)
            logger.warning(
                "No vector subjects found for class %s. Using default subject list: %s",
                numeric_class,
                ", ".join(subjects),
            )

        selected_subjects = subjects[: min(3, len(subjects))]
        context_parts: list[str] = []
        for subject in selected_subjects:
            context_prompt = f"Key topics and concepts in {subject} for class {numeric_class} for asking in test"
            rag_context = _retrieve_relevant_context(context_prompt, numeric_class, subject, k=3)
            if rag_context:
                context_parts.append(f"[{subject}]\n{rag_context}")

        combined_context = "\n\n".join(context_parts)

        system_prompt = (
            "You are an expert school quiz creator. "
            "Generate only short, syllabus-focused MCQ questions for students. "
            "Do not ask about textbook metadata, chapter numbering, portal names, publication details, "
            "or anything not directly testing subject knowledge.\n" \
            "Ask only subject realted question not related to chapter number/content/book etc. Do not give irrelevant questions ."
        )

        user_prompt = f"""
Class: {numeric_class}
Contest ID: {contest_id or 'none'}
Allowed subjects: {', '.join(selected_subjects)}
Questions required: {num_questions}

Curriculum context:
{combined_context or 'Use standard syllabus concepts for this class.'}

Rules:
1. Return exactly {num_questions} MCQs.
2. Each question must be short (max 16 words).
3. Each option must be short (max 8 words).
4. Exactly 4 options per question.
5. One correct answer exactly matching one option.
6. Explanation must be short (max 18 words).
7. Questions must be direct concept/application checks.
8. Avoid repeated questions.

Return ONLY valid JSON (no markdown) in this format:
{{
  "questions": [
    {{
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correct_answer": "...",
      "subject": "...",
      "explanation": "..."
    }}
  ]
}}
"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        response = _llm_call(messages)
        response_text = response["choices"][0]["message"]["content"].strip()
        payload = _extract_json_payload(response_text)

        if isinstance(payload, dict):
            raw_questions = payload.get("questions", [])
        elif isinstance(payload, list):
            raw_questions = payload
        else:
            raw_questions = []

        sanitized: list[dict[str, Any]] = []
        seen_questions: set[str] = set()

        for idx, item in enumerate(raw_questions):
            if not isinstance(item, dict):
                continue

            question_text = str(item.get("question", "")).strip().replace("\n", " ")
            if not question_text:
                continue

            dedupe_key = question_text.lower()
            if dedupe_key in seen_questions:
                continue
            seen_questions.add(dedupe_key)

            options_raw = item.get("options", [])
            if isinstance(options_raw, dict):
                options_raw = list(options_raw.values())
            elif not isinstance(options_raw, list):
                options_raw = []

            options = [str(opt).strip().replace("\n", " ") for opt in options_raw if str(opt).strip()]
            options = options[:4]
            if len(options) < 4:
                continue

            correct_answer = str(
                item.get("correct_answer", item.get("answer", item.get("correctOption", "")))
            ).strip()
            if correct_answer not in options:
                mapped = next((opt for opt in options if opt.strip().lower() == correct_answer.strip().lower()), None)
                if mapped:
                    correct_answer = mapped
                else:
                    continue

            subject = str(item.get("subject", selected_subjects[idx % len(selected_subjects)])).strip()
            explanation = str(item.get("explanation", "")).strip()[:180]

            sanitized.append(
                {
                    "question": question_text[:220],
                    "options": options,
                    "correct_answer": correct_answer,
                    "subject": subject,
                    "explanation": explanation,
                }
            )

            if len(sanitized) >= num_questions:
                break

        if len(sanitized) < num_questions:
            logger.warning(
                "Contest question generation returned insufficient valid questions for class %s. "
                "Expected %s, got %s.",
                numeric_class,
                num_questions,
                len(sanitized),
            )
            if not sanitized:
                return []

        return sanitized[:num_questions]

    except Exception as e:
        logger.error(f"Error generating contest questions: {e}", exc_info=True)
        return []


def evaluate_contest_answers(
    class_number: str,
    questions: list[dict[str, Any]],
    submitted_answers: list[dict[str, Any]],
) -> dict[str, Any]:
    """Evaluate all contest answers in a single LLM call."""
    try:
        if not questions or not submitted_answers:
            return {"question_results": [], "correct_count": 0}

        if not str(class_number).startswith("class_"):
            class_number = f"class_{str(class_number).replace('class_', '')}"

        system_prompt = (
            "You are a strict MCQ evaluator. Evaluate each answer exactly against the provided correct option text. "
            "No partial credit. Output only valid JSON."
        )

        user_payload = {
            "class": class_number,
            "questions": questions,
            "submitted_answers": submitted_answers,
            "rules": {
                "case_insensitive_match": True,
                "trim_spaces": True,
                "strict_option_match_only": True,
            },
            "output_format": {
                "question_results": [
                    {
                        "id": 1,
                        "selected_answer": "",
                        "correct_answer": "",
                        "is_correct": False,
                        "explanation": "",
                    }
                ],
                "correct_count": 0,
            },
        }

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
        ]

        response = _llm_call(messages)
        response_text = response["choices"][0]["message"]["content"].strip()
        payload = _extract_json_payload(response_text)

        if not isinstance(payload, dict):
            return {"question_results": [], "correct_count": 0}

        question_results = payload.get("question_results", [])
        correct_count = payload.get("correct_count", 0)

        if not isinstance(question_results, list):
            question_results = []

        normalized_results = []
        for row in question_results:
            if not isinstance(row, dict):
                continue
            normalized_results.append(
                {
                    "id": int(row.get("id", 0)),
                    "selected_answer": row.get("selected_answer"),
                    "correct_answer": str(row.get("correct_answer", "")),
                    "is_correct": bool(row.get("is_correct", False)),
                    "explanation": row.get("explanation"),
                }
            )

        if not isinstance(correct_count, int):
            try:
                correct_count = int(correct_count)
            except Exception:
                correct_count = sum(1 for row in normalized_results if row.get("is_correct"))

        return {
            "question_results": normalized_results,
            "correct_count": max(0, correct_count),
        }

    except Exception as e:
        logger.error(f"Error evaluating contest answers in bulk: {e}", exc_info=True)
        return {"question_results": [], "correct_count": 0}