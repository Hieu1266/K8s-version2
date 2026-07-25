from pydantic import BaseModel
from uuid import UUID
from typing import Optional

class VideoProgressCreate(BaseModel):
    user_id: UUID
    lesson_id: UUID
    duration_seconds: int
    last_watched_second: int = 0
    max_watched_second: int = 0
    current_points: Optional[float] = 0.0

class VideoProgressUpdate(BaseModel):
    duration_seconds: Optional[int] = None
    last_watched_second: Optional[int] = None
    max_watched_second: Optional[int] = None
    completion_percentage: Optional[float] = None
    is_finished: Optional[bool] = None
    current_points: Optional[float] = None