from pydantic import BaseModel
from uuid import UUID
from typing import List, Optional
from app.models.enum import SubmissionStatus , QuestionType
from datetime import datetime

class QuizSubmissionCreate(BaseModel):
    quiz_id: UUID
    user_id: UUID
    attempt_number: Optional[int] = None

class QuizSubmissionUpdate(BaseModel):
    status: SubmissionStatus | None = None
    submitted_at: Optional[datetime] = None
    # Chấm điểm chéo
    peer_avg_score: Optional[float] = None
    is_discrepant: bool | None = None
    completed_review_count: int | None = None 
    
    total_score: Optional[float] = None 
    is_passed: Optional[bool] = None 
    grader_id: Optional[UUID] = None

class SubmissionStatusOption(BaseModel):
    option_id: UUID
    option_text: str
    is_correct: Optional[bool] = None  # Chỉ có giá trị khi bài đã được chấm

class SubmissionStatusDetail(BaseModel):
    detail_id: UUID
    question_id: UUID
    question_title: str
    question_type: QuestionType
    video_trigger_seconds: Optional[int] = None
    body_content: Optional[str]
    max_points: Optional[float]
    options: List[SubmissionStatusOption]

    selected_option_id: Optional[UUID] = None
    essay_answer_text: Optional[str] = None
    graph_json_data: Optional[str] = None
    graph_image_url: Optional[str] = None

    # Chỉ trả khi bài đã được chấm
    score_earned: Optional[float] = None
    teacher_feedback: Optional[str] = None

class QuizSubmissionStatusResponse(BaseModel):
    submission_id: UUID
    quiz_id: UUID
    status: SubmissionStatus
    attempt_number: int
    started_at: datetime
    total_score: Optional[float] = None
    is_passed: Optional[bool] = None
    questions: List[SubmissionStatusDetail]
