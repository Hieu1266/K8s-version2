from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import date

class LessonCreate(BaseModel):
    module_id: UUID
    title: str
    video_url: str | None = None
    content_body: str | None = None
    duration_seconds: int | None = None
    order_index: int
    is_optional: bool | None = None
    is_quiz: bool | None = None

class LessonUpdate(BaseModel):
    title: str | None = None
    video_url: str | None = None
    duration_seconds: int | None = None
    content_body: str | None = None
    order_index: int | None = None
    is_optional: bool | None = None

class LessonLearningStructure(BaseModel):
    title: str
    lesson_id: UUID
    video_url: Optional[str] = None
    content_body: Optional[str] = None
    duration_seconds: int = 0 # Nếu thời gian bằng 0 nghĩa là bài giảng ko có video
    is_optional: bool
    is_quiz: bool 