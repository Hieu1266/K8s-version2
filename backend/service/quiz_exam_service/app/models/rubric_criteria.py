import uuid
from uuid import UUID
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship
from datetime import date, datetime

if TYPE_CHECKING:
    from app.models.question import Question
    from app.models.peer_review_evaluations import PeerReviewEvaluation


# Model khung chấm điểm mẫu (Ví dụ: Tiêu chí 1: Đúng đề bài - 5đ, Tiêu chí 2: Sáng tạo - 5đ)
class RubricCriteria(SQLModel, table=True):
    __tablename__ = "rubric_criteria"

    criteria_id: UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    question_id: Optional[UUID] = Field(
        default=None, 
        foreign_key="question.question_id", 
        ondelete="CASCADE"
    )
    title: str = Field(nullable=False)               # Tên tiêu chí (ví dụ: "Bố cục bài viết")
    description: Optional[str] = Field(default=None) # Hướng dẫn chấm cho học viên
    max_score: float = Field(nullable=False)          # Điểm tối đa của tiêu chí này
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    question: Optional["Question"] = Relationship(back_populates="rubric_criterias")
    evaluations: List["PeerReviewEvaluation"] = Relationship(back_populates="criteria")