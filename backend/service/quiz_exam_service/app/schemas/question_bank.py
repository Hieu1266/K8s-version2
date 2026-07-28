from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional

class QuestionBankSubjectResponse(BaseModel):
    id: UUID
    code: str
    title: str
    description: Optional[str] = None
    image: Optional[str] = None
    totalQuestions: int = 0
    totalModules: int = 0

    model_config = ConfigDict(from_attributes=True)