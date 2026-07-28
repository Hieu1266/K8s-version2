from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import date

class QuestionPoolBase(BaseModel):
    title: str
    description: str

class QuestionPoolCreate(QuestionPoolBase):
    owner_id: UUID
    

class QuestionPoolUpdate(QuestionPoolBase):
    title: Optional[str] = None
    description: Optional[str] = None

class QuestionPoolItem(QuestionPoolBase):
    pool_id: UUID
    created_at: date
