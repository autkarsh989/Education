from __future__ import annotations

import json
import logging
import random
import re
from datetime import datetime
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import verify_token
from helper import get_db
from models.models import ContestAttempt, User
from models.schemas import (
    ContestQuestionSetOut,
    ContestResultOut,
    ContestSubmitOut,
    ContestSubmitRequest,
    ContestLeaderboardOut,
)
import llm

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/contest", tags=["contest"])

QUESTIONS_PER_CONTEST = 5


def normalize_class_level(value: Any) -> str | None:
    if value is None:
        return None

    text = str(value).strip().lower().replace("grade", "class")
    match = re.search(r"(\d{1,2})", text)
    if not match:
        return None

    class_number = int(match.group(1))
    if class_number < 1 or class_number > 12:
        return None
    return f"class_{class_number}"


def _clean_answer(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def _mcq(question: str, correct_answer: Any, wrong_answers: list[Any], rng: random.Random, subject: str, explanation: str) -> dict[str, Any]:
    options = [_clean_answer(correct_answer)]
    for wrong in wrong_answers:
        option = _clean_answer(wrong)
        if option not in options:
            options.append(option)

    while len(options) < 4:
        filler = str(rng.randint(1, 99))
        if filler not in options:
            options.append(filler)

    rng.shuffle(options)
    return {
        "question": question,
        "options": options,
        "answer": _clean_answer(correct_answer),
        "subject": subject,
        "explanation": explanation,
    }


def _class_6_questions(rng: random.Random) -> list[dict[str, Any]]:
    a = rng.randint(11, 49)
    b = rng.randint(6, 23)
    length = rng.randint(4, 12)
    width = rng.randint(2, 7)

    return [
        _mcq(f"What is {a} + {b}?", a + b, [a + b - 2, a + b + 3, a + b + 5], rng, "Number System", "Add the two numbers."),
        _mcq("Which number is prime?", 23, [21, 24, 25], rng, "Number System", "23 has exactly two factors."),
        _mcq(f"What is the perimeter of a rectangle with length {length} and width {width}?", 2 * (length + width), [2 * length, length * width, 2 * (length - width)], rng, "Mensuration", "Perimeter = 2 × (length + width)."),
        _mcq("Which fraction is equal to one-half?", "1/2", ["1/3", "2/3", "1/4"], rng, "Fractions", "One-half is the same as 1/2."),
        _mcq("How many sides does a square have?", 4, [3, 5, 6], rng, "Geometry", "A square has 4 equal sides."),
    ]


def _class_7_questions(rng: random.Random) -> list[dict[str, Any]]:
    x = rng.randint(2, 12)
    y = rng.randint(4, 18)
    percent_base = rng.choice([40, 60, 80, 100])

    return [
        _mcq("What is (-3) + 7?", 4, [2, 5, -10], rng, "Integers", "Adding 7 to -3 gives 4."),
        _mcq(f"Solve for x: x + {x} = {x + y}", y, [y - 1, y + 2, x], rng, "Algebra", "Subtract the same number from both sides."),
        _mcq(f"What is 25% of {percent_base}?", percent_base // 4, [percent_base // 2, percent_base // 3, percent_base], rng, "Percentage", "25% means one quarter."),
        _mcq("What is 1/4 + 1/4?", "1/2", ["1/3", "2/4", "2/3"], rng, "Fractions", "Add the numerators and keep the denominator."),
        _mcq("Simplify the ratio 3:6.", "1:2", ["2:1", "3:6", "1:3"], rng, "Ratio and Proportion", "Divide both terms by 3."),
    ]


def _class_8_questions(rng: random.Random) -> list[dict[str, Any]]:
    base = rng.randint(2, 5)
    linear_rhs = rng.randint(12, 28)
    linear_divisor = rng.randint(2, 6)
    side = rng.randint(3, 9)

    return [
        _mcq(f"What is {base}^5?", base**5, [base**4, base**6, base**3], rng, "Number System", "Use repeated multiplication."),
        _mcq(f"Solve: {linear_divisor}x = {linear_rhs}", linear_rhs // linear_divisor, [linear_rhs, linear_rhs // linear_divisor + 2, linear_rhs // linear_divisor - 1], rng, "Algebra", "Divide both sides by the coefficient of x."),
        _mcq("What is the square root of 81?", 9, [7, 8, 10], rng, "Number System", "9 × 9 = 81."),
        _mcq(f"What is the area of a square with side {side}?", side * side, [4 * side, side + side, side * 3], rng, "Mensuration", "Area of a square is side × side."),
        _mcq("Which number is rational?", "0.75", ["pi", "sqrt(2)", "e"], rng, "Number System", "0.75 can be written as 3/4."),
    ]


def _class_9_questions(rng: random.Random) -> list[dict[str, Any]]:
    value = rng.randint(2, 6)
    numbers = sorted(rng.sample(range(2, 11), 3))

    return [
        _mcq("What is the degree of 5x^3 + 2x - 1?", 3, [1, 2, 4], rng, "Algebra", "The highest power of x is 3."),
        _mcq(f"What is the value of x^2 + 3x when x = {value}?", value * value + 3 * value, [value * value, value + 3, value * 3], rng, "Algebra", "Substitute the value of x."),
        _mcq("What is the distance between -2 and 5 on a number line?", 7, [3, 5, 9], rng, "Number System", "Distance is the absolute difference."),
        _mcq(f"What is the mean of {numbers[0]}, {numbers[1]}, and {numbers[2]}?", round(sum(numbers) / 3, 2), [sum(numbers), round(sum(numbers) / 2, 2), numbers[1]], rng, "Statistics", "Add the numbers and divide by 3."),
        _mcq("Which is the factorisation of x^2 - 9?", "(x - 3)(x + 3)", ["(x - 9)(x + 1)", "(x - 1)(x + 9)", "(x + 3)^2"], rng, "Algebra", "Use the difference of squares formula."),
    ]


def _class_10_questions(rng: random.Random) -> list[dict[str, Any]]:
    a = rng.randint(1, 4)
    b = rng.randint(5, 9)

    return [
        _mcq("What is the discriminant of x^2 - 4x + 3?", 4, [0, 8, 12], rng, "Quadratic Equations", "Compute b^2 - 4ac."),
        _mcq(f"What is the 4th term of an AP with first term {a} and common difference {b}?", a + 3 * b, [a + b, a + 2 * b, a + 4 * b], rng, "Arithmetic Progressions", "Use a_n = a + (n-1)d."),
        _mcq("What is sin 30°?", "1/2", ["1", "0", "sqrt(3)/2"], rng, "Trigonometry", "sin 30° equals one-half."),
        _mcq("What are the roots of x^2 - 5x + 6 = 0?", "2 and 3", ["-2 and -3", "1 and 6", "3 and 5"], rng, "Quadratic Equations", "Factorise as (x - 2)(x - 3)."),
        _mcq("A triangle with sides 3, 4 and 5 is:", "Right-angled", ["Equilateral", "Obtuse", "Scalene only"], rng, "Geometry", "3-4-5 is a Pythagorean triplet."),
    ]


def _class_11_questions(rng: random.Random) -> list[dict[str, Any]]:
    set_a = rng.randint(3, 7)
    set_b = rng.randint(3, 7)
    overlap = rng.randint(1, min(set_a, set_b))

    return [
        _mcq(f"If |A| = {set_a}, |B| = {set_b}, and |A ∩ B| = {overlap}, what is |A ∪ B|?", set_a + set_b - overlap, [set_a + set_b, set_a - overlap, set_b - overlap], rng, "Sets", "Use n(A ∪ B) = n(A) + n(B) - n(A ∩ B)."),
        _mcq("What is the domain of f(x) = 1 / (x - 2)?", "All real numbers except 2", ["All real numbers", "Only x > 2", "Only x < 2"], rng, "Functions", "The denominator cannot be zero."),
        _mcq("What is 5P2?", 20, [10, 25, 15], rng, "Permutations", "5P2 = 5 × 4."),
        _mcq("What is sin^2 θ + cos^2 θ equal to?", 1, [0, 2, "sin θ"], rng, "Trigonometry", "This is a standard identity."),
        _mcq("What is the derivative of x^3?", "3x^2", ["x^2", "3x", "x^3"], rng, "Calculus", "Apply the power rule."),
    ]


def _class_12_questions(rng: random.Random) -> list[dict[str, Any]]:
    determinant = (1 * 4) - (2 * 3)

    return [
        _mcq("What is the determinant of [[1, 2], [3, 4]]?", determinant, [2, 4, -4], rng, "Matrices", "Use ad - bc."),
        _mcq("What is the derivative of x^2?", "2x", ["x", "x^3", "2"], rng, "Calculus", "Apply the power rule."),
        _mcq("What is the probability of getting heads on one fair coin toss?", "1/2", ["1/4", "1", "0"], rng, "Probability", "A fair coin has two equally likely outcomes."),
        _mcq("What is the integral of x dx?", "x^2/2 + C", ["x + C", "2x + C", "x^2 + C"], rng, "Calculus", "Use the reverse power rule."),
        _mcq("If A is a 2x2 matrix and B is a 2x2 matrix, what is the order of AB?", "2x2", ["2x1", "1x2", "4x4"], rng, "Matrices", "The product keeps the compatible square order."),
    ]


QUESTION_BUILDERS = {
    "class_6": _class_6_questions,
    "class_7": _class_7_questions,
    "class_8": _class_8_questions,
    "class_9": _class_9_questions,
    "class_10": _class_10_questions,
    "class_11": _class_11_questions,
    "class_12": _class_12_questions,
}


def get_question_set(class_level: str, contest_id: str, total_questions: int = QUESTIONS_PER_CONTEST) -> list[dict[str, Any]]:
    """
    Generate questions using LLM with fallback to hardcoded questions.
    Prioritizes dynamic generation for better educational value.
    """
    normalized_class = normalize_class_level(class_level) or "class_6"
    
    try:
        # Try LLM-based generation first
        llm_questions = llm.generate_contest_questions(normalized_class, total_questions, contest_id)
        if llm_questions and len(llm_questions) > 0:
            # Normalize LLM output format to match hardcoded format
            normalized_questions = []
            for q in llm_questions:
                normalized_questions.append({
                    "question": q.get("question", ""),
                    "options": q.get("options", []),
                    "answer": q.get("correct_answer", q.get("answer", "")),  # Handle both key formats
                    "subject": q.get("subject", ""),
                    "explanation": q.get("explanation", ""),
                })
            logger.info(f"Generated {len(normalized_questions)} questions via LLM for {normalized_class}")
            return normalized_questions[: max(1, min(total_questions, len(normalized_questions)))]
    except Exception as e:
        logger.warning(f"LLM generation failed for {normalized_class}: {e}. Falling back to hardcoded questions.")
    
    # Fallback to hardcoded questions
    builder = QUESTION_BUILDERS.get(normalized_class, QUESTION_BUILDERS["class_6"])
    rng = random.Random(f"{normalized_class}:{contest_id}")
    questions = builder(rng)
    return questions[: max(1, min(total_questions, len(questions)))]


def public_question(question: dict[str, Any], question_id: int) -> dict[str, Any]:
    return {
        "id": question_id,
        "question": question["question"],
        "options": question["options"],
        "subject": question.get("subject"),
        "explanation": None,
    }


def score_submission(submitted_answer: Any, question: dict[str, Any]) -> tuple[bool, str]:
    correct_answer = _clean_answer(question["answer"])
    selected_answer = _clean_answer(submitted_answer)

    if submitted_answer is None:
        return False, selected_answer

    if isinstance(submitted_answer, int):
        options = question["options"]
        if 0 <= submitted_answer < len(options):
            selected_answer = _clean_answer(options[submitted_answer])

    if selected_answer.isdigit() and selected_answer not in question["options"]:
        index = int(selected_answer)
        if 0 <= index < len(question["options"]):
            selected_answer = _clean_answer(question["options"][index])

    is_correct = selected_answer.strip().lower() == correct_answer.strip().lower()
    return is_correct, selected_answer


def normalize_submitted_answer(submitted_answer: Any, question: dict[str, Any]) -> str:
    """Normalize submitted answer into option text when answer is an index."""
    selected_answer = _clean_answer(submitted_answer)

    if submitted_answer is None:
        return selected_answer

    if isinstance(submitted_answer, int):
        options = question.get("options", [])
        if 0 <= submitted_answer < len(options):
            return _clean_answer(options[submitted_answer])

    if selected_answer.isdigit() and selected_answer not in question.get("options", []):
        index = int(selected_answer)
        options = question.get("options", [])
        if 0 <= index < len(options):
            return _clean_answer(options[index])

    return selected_answer


def _build_question_results_local(questions: list[dict[str, Any]], answers: dict[str, Any]) -> tuple[list[dict[str, Any]], int]:
    results: list[dict[str, Any]] = []
    correct_count = 0

    for index, question in enumerate(questions, start=1):
        submitted_answer = answers.get(str(index))
        is_correct, selected_answer = score_submission(submitted_answer, question)
        if is_correct:
            correct_count += 1
        results.append(
            {
                "id": index,
                "question": question["question"],
                "selected_answer": selected_answer or None,
                "correct_answer": question["answer"],
                "is_correct": is_correct,
                "explanation": question.get("explanation"),
            }
        )

    return results, correct_count


def build_question_results(
    class_level: str,
    questions: list[dict[str, Any]],
    answers: dict[str, Any],
) -> tuple[list[dict[str, Any]], int]:
    """Evaluate answers in a single LLM call, with local fallback for reliability."""
    submitted_rows: list[dict[str, Any]] = []
    for index, question in enumerate(questions, start=1):
        raw_answer = answers.get(str(index))
        submitted_rows.append(
            {
                "id": index,
                "selected_answer": normalize_submitted_answer(raw_answer, question),
            }
        )

    llm_eval = llm.evaluate_contest_answers(class_level, questions, submitted_rows)
    llm_results = llm_eval.get("question_results", []) if isinstance(llm_eval, dict) else []

    if llm_results and len(llm_results) == len(questions):
        enriched_results: list[dict[str, Any]] = []
        valid_correct = 0

        for index, question in enumerate(questions, start=1):
            row = next((r for r in llm_results if int(r.get("id", 0)) == index), None)
            if not row:
                return _build_question_results_local(questions, answers)

            selected_answer = _clean_answer(row.get("selected_answer"))
            correct_answer = _clean_answer(question["answer"])
            # Keep scoring deterministic even when LLM labels differ.
            is_correct = selected_answer.strip().lower() == correct_answer.strip().lower()

            if is_correct:
                valid_correct += 1

            enriched_results.append(
                {
                    "id": index,
                    "question": question["question"],
                    "selected_answer": selected_answer or None,
                    "correct_answer": correct_answer,
                    "is_correct": is_correct,
                    "explanation": question.get("explanation"),
                }
            )

        return enriched_results, valid_correct

    return _build_question_results_local(questions, answers)


def leaderboard_rows(db: Session, class_level: str) -> list[dict[str, Any]]:
    """Build leaderboard for a specific class by aggregating contest attempts."""
    # Get stats for all students who have attempted contests in this class
    attempt_stats = (
        db.query(
            ContestAttempt.username.label("username"),
            func.max(ContestAttempt.score).label("best_score"),
            func.max(ContestAttempt.correct_count).label("best_correct_count"),
            func.count(ContestAttempt.id).label("attempts"),
            func.max(ContestAttempt.submitted_at).label("last_attempt_at"),
        )
        .filter(ContestAttempt.class_level == class_level)
        .group_by(ContestAttempt.username)
        .subquery()
    )

    # Join with User to get student names
    rows = (
        db.query(
            attempt_stats.c.username,
            attempt_stats.c.best_score,
            attempt_stats.c.best_correct_count,
            attempt_stats.c.attempts,
            attempt_stats.c.last_attempt_at,
            User.name,
        )
        .outerjoin(User, User.username == attempt_stats.c.username)
        .order_by(
            attempt_stats.c.best_score.desc(),
            attempt_stats.c.best_correct_count.desc(),
            attempt_stats.c.last_attempt_at.desc(),
            attempt_stats.c.username.asc(),
        )
        .all()
    )

    leaderboard: list[dict[str, Any]] = []
    for index, row in enumerate(rows, start=1):
        leaderboard.append(
            {
                "rank": index,
                "username": row.username,
                "name": row.name or row.username,
                "class_level": class_level,
                "best_score": float(row.best_score or 0.0),
                "best_correct_count": int(row.best_correct_count or 0),
                "attempts": int(row.attempts or 0),
                "last_attempt_at": row.last_attempt_at,
            }
        )

    return leaderboard


def leaderboard_payload(db: Session, class_level: str, student_username: str) -> dict[str, Any]:
    """Generate leaderboard payload including student's rank."""
    entries = leaderboard_rows(db, class_level)
    student_rank = None
    top_score = entries[0]["best_score"] if entries else 0.0

    # Find student's rank in the leaderboard
    for entry in entries:
        if entry["username"] == student_username:
            student_rank = entry["rank"]
            break

    return {
        "class_level": class_level,
        "total_students": len(entries),
        "student_username": student_username,
        "student_rank": student_rank,  # None if student hasn't attempted yet
        "top_score": top_score,
        "entries": entries,
    }


@router.get("/questions", response_model=ContestQuestionSetOut)
def get_contest_questions(
    count: int = Query(QUESTIONS_PER_CONTEST, ge=1, le=10),
    username: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    student = db.query(User).filter(User.username == username).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    class_level = normalize_class_level(student.class_level or student.level)
    if not class_level:
        raise HTTPException(status_code=400, detail="Student class level is required for contest access")

    contest_id = uuid4().hex
    questions = get_question_set(class_level, contest_id, count)

    return {
        "contest_id": contest_id,
        "class_level": class_level,
        "total_questions": len(questions),
        "questions": [public_question(question, index) for index, question in enumerate(questions, start=1)],
    }


@router.post("/submit", response_model=ContestSubmitOut)
def submit_contest_answers(
    payload: ContestSubmitRequest,
    username: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    student = db.query(User).filter(User.username == username).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    class_level = normalize_class_level(student.class_level or student.level)
    if not class_level:
        raise HTTPException(status_code=400, detail="Student class level is required for contest scoring")

    questions = get_question_set(class_level, payload.contest_id)
    question_results, correct_count = build_question_results(class_level, questions, payload.answers)
    total_questions = len(questions)
    score = round((correct_count / total_questions) * 100, 2) if total_questions else 0.0
    accuracy = score
    submitted_at = datetime.utcnow().isoformat()

    attempt_payload = {
        "answers": payload.answers,
        "questions": questions,
        "question_results": question_results,
    }

    attempt = ContestAttempt(
        contest_id=payload.contest_id,
        username=student.username,
        class_level=class_level,
        score=score,
        correct_count=correct_count,
        total_questions=total_questions,
        time_taken=payload.time_taken,
        answers_json=json.dumps(attempt_payload),
        submitted_at=submitted_at,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    leaderboard = leaderboard_payload(db, class_level, student.username)
    rank = leaderboard["student_rank"] or len(leaderboard["entries"]) + 1

    return {
        "attempt_id": attempt.id,
        "contest_id": payload.contest_id,
        "class_level": class_level,
        "username": student.username,
        "score": score,
        "correct_count": correct_count,
        "total_questions": total_questions,
        "accuracy": accuracy,
        "passed": score >= 60.0,
        "rank": rank,
        "leaderboard": leaderboard["entries"],
        "question_results": question_results,
        "submitted_at": submitted_at,
    }


@router.get("/result/{attempt_id}", response_model=ContestResultOut)
def get_contest_result(
    attempt_id: int,
    username: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    attempt = (
        db.query(ContestAttempt)
        .filter(ContestAttempt.id == attempt_id, ContestAttempt.username == username)
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Contest attempt not found")

    stored_payload = json.loads(attempt.answers_json or "{}")
    if isinstance(stored_payload, dict) and "answers" in stored_payload:
        answers = stored_payload.get("answers", {})
        questions = stored_payload.get("questions", [])
        question_results = stored_payload.get("question_results", [])
    else:
        # Backward compatibility for older attempts storing only raw answers map.
        answers = stored_payload if isinstance(stored_payload, dict) else {}
        questions = []
        question_results = []

    if not questions:
        questions = get_question_set(attempt.class_level, attempt.contest_id, attempt.total_questions)

    if not question_results:
        question_results, _ = build_question_results(attempt.class_level, questions, answers)

    leaderboard = leaderboard_payload(db, attempt.class_level, username)

    return {
        "attempt_id": attempt.id,
        "contest_id": attempt.contest_id,
        "class_level": attempt.class_level,
        "username": attempt.username,
        "score": float(attempt.score or 0.0),
        "correct_count": int(attempt.correct_count or 0),
        "total_questions": int(attempt.total_questions or 0),
        "accuracy": round((float(attempt.correct_count or 0) / float(attempt.total_questions or 1)) * 100, 2) if attempt.total_questions else 0.0,
        "passed": float(attempt.score or 0.0) >= 60.0,
        "rank": leaderboard["student_rank"] or 1,
        "leaderboard": leaderboard["entries"],
        "question_results": question_results,
        "submitted_at": attempt.submitted_at,
    }


@router.get("/leaderboard", response_model=ContestLeaderboardOut)
def get_contest_leaderboard(
    username: str = Depends(verify_token),
    db: Session = Depends(get_db),
):
    student = db.query(User).filter(User.username == username).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    class_level = normalize_class_level(student.class_level or student.level)
    if not class_level:
        raise HTTPException(status_code=400, detail="Student class level is required for leaderboard access")

    return leaderboard_payload(db, class_level, student.username)