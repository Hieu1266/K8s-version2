import traceback
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body

from app.api.v1.deps import SessionDep
from app.crud.question import crud_question
from app.crud.question_option import crud_question_option
from app.crud.quiz import crud_quiz
from app.core.security import get_current_user_role, call_check_instructor_service
from app.core.config import settings

from app.schemas.question import QuestionCreate, QuestionType, QuestionItem, QuestionUpdate
from app.schemas.question_option import QuestionOptionCreate, QuestionOptionAutoCreate

from app.models.question import Question
from app.models.question_option import QuestionOption
from app.models.rubric_criteria import RubricCriteria

router = APIRouter(prefix="/questions", tags=["questions"])


@router.get("/get-list/{subject_id}", response_model=List[QuestionItem])
def get_questions_list(
    db: SessionDep,
    subject_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])
    
    is_instructor = call_check_instructor_service(instructor_id=user_id, subject_id=subject_id)
    if not is_instructor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không phải giảng viên phụ trách môn học này để xem ngân hàng câu hỏi."
        )

    questions = crud_question.get_multi_by_subject_id(db, subject_id=subject_id)
    return questions



@router.post("/")
def create_question(
    db: SessionDep,
    question: QuestionCreate,
    question_opts: Optional[List[QuestionOptionAutoCreate]] = None,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = current_user["user_id"]
    subject_id = question.subject_id
    is_instructor = call_check_instructor_service(instructor_id=user_id, subject_id=subject_id)
    
    if not is_instructor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không phải giảng viên phụ trách môn học này để tạo câu hỏi."
        )
        
    try:
        # 1. Tạo câu hỏi trong DB
        ques = crud_question.create(db, question)
        question_id = ques.question_id
        
        # 2. Tạo danh sách các lựa chọn (Options - Trắc nghiệm)
        if question_opts:
            for opt_in in question_opts:
                new_opt = QuestionOptionCreate(
                    question_id=question_id,
                    option_text=opt_in.option_text,
                    is_correct=opt_in.is_correct
                )
                crud_question_option.create(db, new_opt)

        # 3. Lưu tiêu chí Rubrics (ĐÃ SỬA CHUẨN TÊN TRƯỜNG percentage)
        if question.rubrics:
            for rub in question.rubrics:
                # Bóc tách percentage/percent an toàn
                pct_val = getattr(rub, "percentage", None)
                if pct_val is None:
                    pct_val = getattr(rub, "percent", 0.0)

                db_rubric = RubricCriteria(
                    question_id=question_id,
                    title=rub.title,
                    description=rub.description or "",
                    percentage=float(pct_val if pct_val is not None else 0.0)  # ✅ ĐÃ SỬA: percentage
                )
                db.add(db_rubric)

            db.commit()

        return {
            "status": "success",
            "message": "Tạo câu hỏi thành công!",
            "question_id": ques.question_id
        }
    except Exception as e:
        db.rollback()
        print(f"❌ [CREATE ERROR]:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tạo câu hỏi: {str(e)}"
        )


@router.patch("/{question_id}")
def update_question(
    db: SessionDep,
    question_id: UUID,
    question: QuestionUpdate = Body(..., embed=True),
    current_user: dict = Depends(get_current_user_role)
):
    print(f"\n🔹 [UPDATE QUESTION] Received request for Question ID: {question_id}")
    print(f"🔹 Payload parsed: {question.model_dump()}")

    db_question = crud_question.get_by_id(db, question_id)
    if not db_question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy câu hỏi yêu cầu."
        )
        
    user_id = current_user["user_id"]
    subject_id = db_question.subject_id 
    
    is_instructor = call_check_instructor_service(instructor_id=user_id, subject_id=subject_id)
    if not is_instructor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không phải giảng viên phụ trách môn học này để chỉnh sửa câu hỏi."
        )
    
    try:
        update_dict = question.model_dump(exclude_unset=True, exclude={"rubrics"})
        for field, value in update_dict.items():
            setattr(db_question, field, value)
        
        db.add(db_question) # Lưu thay đổi vào session
        
        # 2. Cập nhật lại danh sách Rubrics (ĐÃ SỬA CHUẨN TÊN TRƯỜNG percentage)
        if question.rubrics is not None:
            del_count = db.query(RubricCriteria).filter(RubricCriteria.question_id == question_id).delete()
            print(f"   -> Deleted {del_count} old rubrics")
            
            for rub in question.rubrics:
                pct_val = getattr(rub, "percentage", None)
                if pct_val is None:
                    pct_val = getattr(rub, "percent", 0.0)

                db_rubric = RubricCriteria(
                    question_id=question_id,
                    title=rub.title,
                    description=rub.description or "",
                    percentage=float(pct_val if pct_val is not None else 0.0)  # ✅ ĐÃ SỬA: percentage
                )
                db.add(db_rubric)
            
        db.commit() 

        print("✅ [UPDATE QUESTION SUCCESS]")
        return {
            "status": "success",
            "message": "Update thành công câu hỏi!"
        }
    except Exception as e:
        db.rollback()
        print(f"❌ [UPDATE ERROR]:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống khi cập nhật câu hỏi: {str(e)}"
        )


@router.delete("/{question_id}")
def delete_question(
    db: SessionDep,
    question_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    print(f"\n🔻 [DELETE QUESTION] Request to delete Question ID: {question_id}")
    
    db_question = crud_question.get_by_id(db, question_id)
    if not db_question:
        print("  ❌ Question ID not found in database.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy câu hỏi để xóa."
        )

    user_id = current_user["user_id"]
    is_instructor = call_check_instructor_service(instructor_id=user_id, subject_id=db_question.subject_id)
    if not is_instructor:
        print("  ❌ Permission denied: User is not instructor.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xóa câu hỏi này."
        )

    try:
        del_rubrics = db.query(RubricCriteria).filter(RubricCriteria.question_id == question_id).delete(synchronize_session=False)
        del_options = db.query(QuestionOption).filter(QuestionOption.question_id == question_id).delete(synchronize_session=False)
        del_question = db.query(Question).filter(Question.question_id == question_id).delete(synchronize_session=False)
        db.commit()
        print(f"✅ [DELETE SUCCESS] Deleted {del_question} question, {del_rubrics} rubrics, {del_options} options.")
        return {
            "status": "success",
            "message": "Xóa câu hỏi thành công!"
        }
    except Exception as e:
        db.rollback()
        print(f"❌ [DELETE ERROR TRACEBACK]:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi xóa câu hỏi: {str(e)}"
        )


@router.get("/total-lessons/{subject_id}")
def total_lessons_in_subject(
    db: SessionDep,
    subject_id: UUID
):
    return crud_question.total_questions_in_subject(db, subject_id)