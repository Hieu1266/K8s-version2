from fastapi import APIRouter, HTTPException, Depends, status, Request
from typing import List
from uuid import UUID
from app.api.v1.deps import SessionDep
from app.core.security import get_current_user_role, RoleChecker
from app.schemas.comment import CommentUpdate, CommentCreate, CommentBase
from app.crud.course_enrollment import crud_course_enrollment
from app.crud.comment import crud_comment

router = APIRouter(prefix="/comments", tags=["comments"])

@router.post("/")
def create_comment(
    db: SessionDep,
    obj_in: CommentBase,
    current_user: dict = Depends(RoleChecker(["Tester"]))
):
    user_id = UUID(current_user["user_id"])
    progress = crud_course_enrollment.get_by_id(db, CommentBase.enrollment_id)
    if user_id != progress.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền để thêm nhận xét khóa học"
        )
    new_comment = CommentCreate(
        comment=obj_in.comment,
        enrollment_id=obj_in.enrollment_id,
        part_id=obj_in.part_id,
        structure_part=obj_in.structure_part,
        tester_id=user_id,
        title=obj_in.title
    )
    comment = crud_comment.create(db, CommentCreate)
    return {
        "success": True,
        "comment": comment
    }
    



