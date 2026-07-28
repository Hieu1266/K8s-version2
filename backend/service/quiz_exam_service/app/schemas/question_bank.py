# from pydantic import BaseModel, ConfigDict
# from uuid import UUID
# from typing import Optional

# class QuestionBankSubjectResponse(BaseModel):
#     id: UUID
#     code: str
#     title: str
#     description: Optional[str] = None
#     image: Optional[str] = None
#     totalQuestions: int = 0
#     totalModules: int = 0

#     model_config = ConfigDict(from_attributes=True)




from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID

# --- RUBRIC SCHEMAS ---
class RubricCriteriaBase(BaseModel):
    title: str
    description: Optional[str] = ""
    percentage: Optional[float] = 0.0

class RubricCriteriaCreate(RubricCriteriaBase):
    criteria_id: Optional[UUID] = None

class RubricCriteriaResponse(BaseModel):
    criteria_id: UUID
    question_id: UUID
    title: str
    description: Optional[str] = ""
    max_score: float

    class Config:
        from_attributes = True

# --- OPTION SCHEMAS ---
class OptionBase(BaseModel):
    option_text: str
    is_correct: bool = False

class OptionCreate(OptionBase):
    option_id: Optional[UUID] = None

class OptionResponse(OptionBase):
    option_id: UUID
    question_id: UUID

    class Config:
        from_attributes = True

# --- QUESTION SCHEMAS ---
class QuestionCreate(BaseModel):
    subject_id: UUID
    question_title: Optional[str] = ""
    body_content: str
    question_type: str
    max_points: float = 10.0
    rubrics: Optional[List[RubricCriteriaCreate]] = []
    options: Optional[List[dict]] = []  
    
class QuestionCreateWrapper(BaseModel):
    question: QuestionCreate

class QuestionUpdate(BaseModel):
    question_title: Optional[str] = ""
    body_content: Optional[str] = None
    question_type: Optional[str] = None
    max_points: Optional[float] = None
    options: Optional[List[OptionCreate]] = None
    rubrics: Optional[List[RubricCriteriaCreate]] = None

class QuestionUpdateWrapper(BaseModel):
    question: QuestionUpdate

class QuestionResponse(BaseModel):
    question_id: UUID
    subject_id: UUID
    question_title: Optional[str] = ""
    content: str = Field(..., alias="body_content")
    question_type: str
    max_points: float
    options: List[OptionResponse] = []
    rubrics: List[RubricCriteriaResponse] = []

    class Config:
        from_attributes = True
        populate_by_name = True