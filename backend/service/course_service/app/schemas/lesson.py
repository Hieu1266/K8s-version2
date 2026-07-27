from pydantic import BaseModel
from uuid import UUID
from typing import Optional, List
from datetime import date
from app.schemas.lesson_resource import LessonResourceResponse

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
    # ⚠️ Cố ý KHÔNG có field is_quiz: theo yêu cầu nghiệp vụ, một khi bài học đã được
    # tạo là bài thi (is_quiz=True) thì không được phép đổi lại qua API cập nhật.

class LessonLearningStructure(BaseModel):
    title: str
    lesson_id: UUID
    video_url: Optional[str] = None
    content_body: Optional[str] = None
    duration_seconds: int = 0 # Nếu thời gian bằng 0 nghĩa là bài giảng ko có video
    is_optional: bool
    is_quiz: bool

# 🆕 Schema trả về cho trang Quản lý bài học (Instructor) - kèm danh sách tài nguyên đính kèm
class LessonManagementOut(BaseModel):
    lesson_id: UUID
    module_id: UUID
    title: str
    video_url: Optional[str] = None
    content_body: Optional[str] = None
    duration_seconds: int = 0
    order_index: int
    is_optional: bool
    is_quiz: bool
    resources: List[LessonResourceResponse] = []

    class Config:
        from_attributes = True