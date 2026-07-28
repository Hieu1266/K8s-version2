# from pydantic import BaseModel
# from uuid import UUID
# from app.models.question import Question
# from app.models.enum import QuestionType

# class QuestionCreate(BaseModel):
#     subject_id: UUID
#     question_title: str
#     question_type: QuestionType
#     body_content: str | None = None
#     max_points: float

# class QuestionUpdate(BaseModel):
#     question_title: str | None = None
#     body_content: str | None = None
#     max_points: float | None = None

# class QuestionItem(BaseModel):
#     question_id: UUID
#     question_title: str 
#     question_type: QuestionType
#     body_content: str | None = None
#     max_points: float | None = None




from uuid import UUID
from pydantic import BaseModel, Field
from app.models.enum import QuestionType

class RubricCreate(BaseModel):
    title: str
    description: str | None = None
    percentage: float = 0.0

class RubricItem(BaseModel):
    criteria_id: UUID
    title: str
    description: str | None = None
    # 🎯 Map giá trị từ cột max_score trong DB sang biến percentage trả về API
    percentage: float = Field(default=0.0, validation_alias="max_score")

    class Config:
        from_attributes = True

class QuestionCreate(BaseModel):
    subject_id: UUID
    question_title: str
    question_type: QuestionType
    body_content: str | None = None
    max_points: float
    rubrics: list[RubricCreate] | None = None 

class QuestionUpdate(BaseModel):
    question_title: str | None = None
    body_content: str | None = None
    max_points: float | None = None
    rubrics: list[RubricCreate] | None = None
class QuestionItem(BaseModel):
    question_id: UUID
    question_title: str 
    question_type: QuestionType
    body_content: str | None = None
    max_points: float | None = None
    rubric_criterias: list[RubricItem] | None = None

    class Config:
        from_attributes = True