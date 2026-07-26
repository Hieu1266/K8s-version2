from fastapi import APIRouter, HTTPException, Depends, status, Request
from typing import List
from uuid import UUID
from app.schemas.video_progress import VideoProgressUpdate
from app.api.v1.deps import SessionDep
from app.core.security import get_current_user_role
from app.crud.video_progress import crud_video_progress
from app.crud.lesson_progress import crud_lesson_progress

router = APIRouter(prefix="/video_progress", tags=["video_progress"])

@router.patch("/{video_progress_id}")
def update_video_progress(
    db: SessionDep,
    video_progress_id: UUID,
    obj_in: VideoProgressUpdate,
    current_user: dict = Depends(get_current_user_role)
):  
    user_id = UUID(current_user["user_id"])
    v_progress = crud_video_progress.get_by_id(db, video_progress_id)
    if v_progress is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không thể tìm thấy tiến độ video"
        )
    if crud_lesson_progress.get_by_lesson(db, user_id, v_progress.lesson_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thay đổi tiến độ video trên"
        )
    crud_video_progress.update(db, v_progress, obj_in)
    return {
        "success": True,
        "message": "Đã cập nhật tiến độ thành công"
    }