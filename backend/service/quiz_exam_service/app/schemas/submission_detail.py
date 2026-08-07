from pydantic import BaseModel
from uuid import UUID
from typing import List, Optional
from app.models.enum import QuestionType, SubmissionStatus
from datetime import datetime

class SubmissionDetailCreate(BaseModel):
    submission_id: UUID
    question_id: UUID
    video_trigger_seconds: Optional[int] = None

class SubmissionDetailUpdate(BaseModel):
    selected_option_id: Optional[UUID] = None
    essay_answer_text: Optional[str] = None
    graph_json_data: Optional[str] = None
    graph_image_url: Optional[str] = None
    score_earned: Optional[float] = None
    teacher_feedback: Optional[str] = None

