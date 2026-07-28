# app/api/v1/router/question_bank.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.api.v1.deps import get_db
from app.crud.question_bank import crud_question_bank
from app.schemas.question_bank import (
    QuestionResponse,
    QuestionCreateWrapper,
    QuestionUpdateWrapper,
)

# 🎯 SỬA TẠI ĐÂY: Thêm prefix="/questions"
router = APIRouter(prefix="/questions", tags=["Question Bank"])

# Đổi 'async def' thành 'def' để dùng SQLAlchemy Synchronous tối ưu hơn
@router.post("/", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
def create_question(
    payload: QuestionCreateWrapper,
    db: Session = Depends(get_db)
):
    print("==========================================", flush=True)
    print("✅ [FASTAPI ROUTER] ĐÃ NHẬN PAYLOAD THÀNH CÔNG!", flush=True)
    print(f"Payload Data: {payload.model_dump()}", flush=True)

    created_question = crud_question_bank.create(db, obj_in=payload.question)
    return created_question

@router.get("/get-list/{subject_id}", response_model=List[QuestionResponse])
def get_questions_by_subject(
    subject_id: UUID,
    db: Session = Depends(get_db)
):
    questions = crud_question_bank.get_by_subject(db, subject_id=subject_id)
    return questions

@router.patch("/{question_id}", response_model=QuestionResponse)
def update_question(
    question_id: UUID,
    payload: QuestionUpdateWrapper,
    db: Session = Depends(get_db)
):
    db_question = crud_question_bank.get_by_id(db, question_id=question_id)
    if not db_question:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi")
    
    return crud_question_bank.update(db, db_obj=db_question, obj_in=payload.question)

@router.delete("/{question_id}", status_code=status.HTTP_200_OK)
def delete_question(
    question_id: UUID,
    db: Session = Depends(get_db)
):
    success = crud_question_bank.delete(db, question_id=question_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi để xóa")
    return {"message": "Xóa câu hỏi thành công", "question_id": str(question_id)}