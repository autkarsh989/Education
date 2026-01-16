from pydantic import BaseModel, field_validator, Field
from typing import List, Optional
import re


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    name: Optional[str] = Field(None, max_length=100)
    level: Optional[int] = Field(1, ge=1, le=12)
    email: Optional[str] = None
    avatar: Optional[str] = None
    class_level: Optional[str] = None
    age: Optional[int] = Field(None, ge=5, le=100)
    school: Optional[str] = Field(None, max_length=200)
    # Backend-only tracking (exposed read-only in responses)
    total_attempts: Optional[int] = 0
    correct_attempts: Optional[int] = 0
    score: Optional[float] = 0.0
    Parent_feedback: Optional[str] = None  # Parent feedback for this student

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if v is not None and v.strip():
            # Basic email validation
            if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
                raise ValueError('Invalid email format')
        return v

    @field_validator('class_level')
    @classmethod
    def validate_class_level(cls, v):
        if v is not None and v.strip():
            # Allow formats like: 'class_5', '5', 'Class 5', 'Grade 5'
            if not re.match(r'^(class_?|grade\s?)?\d{1,2}$', v, re.IGNORECASE):
                raise ValueError('Invalid class_level format. Use: class_5, 5, Class 5, or Grade 5')
        return v

    class Config:
        from_attributes = True  # Updated from orm_mode for Pydantic V2


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    username: str
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None
    level: Optional[int] = None
    email: Optional[str] = None
    avatar: Optional[str] = None
    class_level: Optional[str] = None
    age: Optional[int] = None
    school: Optional[str] = None


class UserOut(UserBase):
    id: int


# ---------- Chat / Messages ----------
class Message(BaseModel):
    text: Optional[str] = None
    image: Optional[str] = None
    sender: str
    session_id: Optional[str] = None
    user_id: Optional[int] = None
    time_taken: Optional[float] = 0.0


class Chat(BaseModel):
    id: int
    title: str
    session_id: Optional[str] = None
    messages: List[Message]


# ---------- Explore ----------
class Progress(BaseModel):
    percentage: int
    mastered: int
    total: int


class Practice(BaseModel):
    problems: int
    minutes: int
    streak: int


class Strengths(BaseModel):
    strongest: str
    focus: str


class WeeklyGoal(BaseModel):
    solved: int
    goal: int


class ExploreData(BaseModel):
    progress: Progress
    accuracy: int
    practice: Practice
    strengths: Strengths
    weeklyGoal: WeeklyGoal
    badges: List[str]


# ---------- Parent Schemas ----------
class ParentBase(BaseModel):
    username: str
    name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    student_username: str

    class Config:
        from_attributes = True


class ParentCreate(ParentBase):
    password: str


class ParentLogin(BaseModel):
    username: str
    password: str


class ParentOut(ParentBase):
    id: int


class ParentFeedback(BaseModel):
    feedback: str


# ---------- Parent Stats Schemas ----------
class ChildStats(BaseModel):
    username: str
    name: Optional[str] = None
    class_level: Optional[str] = None
    level: Optional[int] = None
    total_attempts: int = 0
    correct_attempts: int = 0
    accuracy: float = 0.0
    score: float = 0.0
    current_streak: int = 0
    max_streak: int = 0


class Comparison(BaseModel):
    class_count: int = 0
    avg_score: float = 0.0
    avg_accuracy: float = 0.0
    top_score: float = 0.0
    rank: int = 0
    percentile: float = 0.0


class ParentStatsOut(BaseModel):
    child: ChildStats
    comparison: Comparison


# ---------- Parent Report Schemas ----------
class ParentReportRequest(BaseModel):
    child: ChildStats
    comparison: Optional[Comparison] = None


class ParentReportOut(BaseModel):
    report: str


# ---------- Teacher Schemas ----------
class TeacherBase(BaseModel):
    username: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None

    class Config:
        from_attributes = True


class TeacherCreate(TeacherBase):
    password: str


class TeacherLogin(BaseModel):
    username: str
    password: str


class TeacherOut(TeacherBase):
    id: int


class TeacherUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    password: Optional[str] = None


# ---------- Video Schemas ----------
class VideoBase(BaseModel):
    title: str
    description: Optional[str] = None
    class_level: str
    subject: Optional[str] = None
    duration: Optional[int] = None
    file_size: Optional[int] = None
    thumbnail: Optional[str] = None

    class Config:
        from_attributes = True


class VideoCreate(VideoBase):
    pass


class VideoOut(VideoBase):
    id: int
    teacher_id: int
    upload_date: str
    view_count: int
    file_path: str


class VideoDetail(VideoOut):
    teacher: Optional[TeacherOut] = None


class TeacherWithVideos(TeacherOut):
    videos: List[VideoOut] = []


# ---------- Teacher-Student Schemas ----------
class TeacherStudentCreate(BaseModel):
    student_username: str
    class_level: str


class TeacherStudentOut(BaseModel):
    id: int
    teacher_id: int
    student_username: str
    enrolled_date: str
    class_level: str

    class Config:
        from_attributes = True


class StudentInfo(BaseModel):
    username: str
    name: Optional[str] = None
    email: Optional[str] = None
    class_level: Optional[str] = None
    enrolled_date: str

    class Config:
        from_attributes = True


class TeacherWithStudents(TeacherOut):
    students: List[StudentInfo] = []
