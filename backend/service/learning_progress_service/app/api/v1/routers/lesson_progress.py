import asyncio
from fastapi import APIRouter, HTTPException, Depends, status
from app.models.lesson_progress import LessonProgress
from typing import List
from uuid import UUID
import httpx
from app.crud.course_enrollment import crud_course_enrollment
from app.api.v1.deps import SessionDep
from app.core.config import settings
from app.core.security import get_current_user_role
from app.crud.lesson_progress import crud_lesson_progress
from app.schemas.lesson_progress import LessonProgressResponse
from app.models.enum import LessonStatus

router = APIRouter(prefix="/lesson_progress", tags=["lesson_progress"])


# Hàm helper gọi sang Course Service lấy danh sách bài học
async def fetch_ordered_lessons(course_id: UUID) -> list[dict]:
    course_lessons_url = f"{settings.BACKEND_COURSE_URL}/courses/{course_id}/lessons"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(course_lessons_url, timeout=5.0)
            if response.status_code == 200:
                # Trả về mảng chứa dict thông tin bài học [{"lesson_id":..., "is_optional":...}]
                return response.json().get("lessons", [])
            return []
        except httpx.RequestError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
                detail="Lỗi kết nối tới Course Service."
            )

async def fetch_total_lessons(course_id: UUID) -> int:
    url = f"{settings.BACKEND_COURSE_URL}/courses/{course_id}/total-lessons"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=5.0)
            if response.status_code == 200:
                return int(response.json())
            return 0
        except httpx.RequestError:
            return 0

@router.put("/lesson/{progress_id}/complete", response_model=LessonProgressResponse)
async def complete_lesson(
    db: SessionDep, 
    progress_id: UUID, 
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])
    
    # 1. Kiểm tra tiến độ bài học hiện tại
    progress = crud_lesson_progress.get_by_id(db, progress_id)
    if not progress: 
        raise HTTPException(status_code=404, detail="Không tìm thấy tiến độ bài học.")
    if progress.status == LessonStatus.LOCKED:
        raise HTTPException(status_code=400, detail="Bài học đang bị khóa.")

    # 2. Lấy lộ trình từ Course Service
    ordered_lessons = await fetch_ordered_lessons(progress.course_id)
    
    # SỬA LỖI Ở ĐÂY: Truyền đúng tham số mà CRUD complete_and_unlock_next yêu cầu
    updated_progress = crud_lesson_progress.complete_and_unlock_next(
        db=db, 
        user_id=user_id, 
        progress_id=progress_id,  # Lấy trực tiếp progress_id từ tham số route
        ordered_lessons=ordered_lessons
    )
    
    # 3. Tính toán tiến độ chung...
    total_lessons = await fetch_total_lessons(progress.course_id)
    completed_lessons = crud_lesson_progress.count_completed_lessons(db, user_id=user_id, course_id=progress.course_id)
    
    if total_lessons > 0:
        overall_progress = round((completed_lessons / total_lessons) * 100, 2)
        if overall_progress > 100.0: 
            overall_progress = 100.0
            
        is_completed = (completed_lessons >= total_lessons) or (overall_progress == 100.0)
        
        enroll = crud_course_enrollment.get_by_user_and_course(db, user_id=user_id, course_id=progress.course_id)
        if enroll:
            crud_course_enrollment.update_overall_progress(
                db=db, 
                db_obj=enroll, 
                progress=overall_progress, 
                is_completed=is_completed
            )
            
    return updated_progress

@router.get("/get-status/{lesson_id}", response_model=LessonStatus) 
async def get_lesson_progress_status(
    lesson_id: str,
    db: SessionDep,
    current_user = Depends(get_current_user_role)
):
    # Lấy status từ DB hoặc CRUD service
    status = crud_lesson_progress.get_lesson_progress_status(db, lesson_id=lesson_id)
    
    # NẾU STATUS LÀ NONE (Chưa có record tiến độ) -> Trả về status mặc định
    if status is None:
        return "LOCKED"  # Hoặc "UNLOCKED" / "IN_PROGRESS" tùy thuộc bài học đầu hay bài tiếp theo
        
    return status