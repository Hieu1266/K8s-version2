from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.models.enum import StructurePart


class CommentBase(BaseModel):
    enrollment_id: UUID
    structure_part: StructurePart
    part_id: UUID 
    title: str
    comment: str

class CommentCreate(CommentBase):
    tester_id: UUID

class CommentUpdate(CommentBase):
    structure_part: StructurePart
    part_id: UUID 
    title: str
    comment: str
    