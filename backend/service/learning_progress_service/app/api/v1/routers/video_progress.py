from fastapi import APIRouter, HTTPException, Depends, status, Request
import asyncio
from typing import List
from uuid import UUID
from app.schemas.video_progress import VideoProgressUpdate, VideoProgressLookupIn, VideoProgressResponse
from app.models.enum import LessonStatus
from app.api.v1.deps import SessionDep
from app.core.security import get_current_user_role
from app.crud.video_progress import crud_video_progress
from app.crud.lesson_progress import crud_lesson_progress
from app.api.v1.routers.lesson_progress import fetch_ordered_lessons

router = APIRouter(prefix="/video_progress", tags=["video_progress"])

@router.post("/get-or-create", response_model=VideoProgressResponse)
def get_or_create_video_progress(
    db: SessionDep,
    payload: VideoProgressLookupIn,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])

    # Xác thực quyền học bài này, tránh tạo tiến độ video cho bài học chưa được mở khóa
    if crud_lesson_progress.get_by_lesson(db, user_id, payload.lesson_id) is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chưa có quyền truy cập bài học này."
        )

    progress = crud_video_progress.get_or_create(
        db,
        user_id=user_id,
        lesson_id=payload.lesson_id,
        duration_seconds=payload.duration_seconds,
    )
    return progress

@router.patch("/{video_progress_id}")
async def update_video_progress(
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
    print(crud_lesson_progress.get_by_lesson(db, user_id, v_progress.lesson_id))
    if crud_lesson_progress.get_by_lesson(db, user_id, v_progress.lesson_id) is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thay đổi tiến độ video trên"
        )
    new_progress = crud_video_progress.update(db, v_progress, obj_in)
    if new_progress.completion_percentage == 100 or new_progress.is_finished:
        progress = crud_lesson_progress.get_by_lesson(db, user_id, new_progress.lesson_id)
        
        # CHỈ MỞ KHÓA nếu bài học này chưa COMPLETED
        if progress and progress.status != LessonStatus.COMPLETED:
            ordered_lessons = await fetch_ordered_lessons(progress.course_id)
            crud_lesson_progress.complete_and_unlock_next_by_lesson(db, user_id, progress.lesson_id, ordered_lessons)
    return {
        "success": True,
        "message": "Đã cập nhật tiến độ thành công"
    }