import asyncio
from fastapi import APIRouter, HTTPException, Depends, status, Request
from typing import List
from uuid import UUID
import httpx
from app.crud.video_progress import crud_video_progress
from app.core.config import settings
from app.core.security import get_current_user_role
from app.crud.course_enrollment import crud_course_enrollment
from app.crud.lesson_progress import crud_lesson_progress
from app.crud.user_lesson_note import crud_note
from app.api.v1.deps import SessionDep
from app.schemas.course_enrollment import (
    CourseInProgress, 
    CourseEnrollmentUpdate, 
    CourseEnrollmentResponse,
    CourseEnrollmentCreate,
    GeneralUserEnrollmentInfo
)

router = APIRouter(prefix="/course_enrollment", tags=["course_enrollment"])

# 1. ĐĂNG KÝ KHÓA HỌC (Tạo Enrollment + Khởi tạo Tiến độ bài học & Video)
@router.post("/", response_model=CourseEnrollmentResponse, status_code=status.HTTP_201_CREATED)
async def enroll_course(
    db: SessionDep,
    payload: CourseEnrollmentCreate,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])
    course_id = payload.course_id

    # Bước 1: Kiểm tra xem người dùng đã đăng ký khóa học này chưa
    existing_enroll = crud_course_enrollment.get_by_user_and_course(db, user_id=user_id, course_id=course_id)
    if existing_enroll:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Người dùng đã đăng ký khóa học này rồi."
        )

    # Bước 2: Gọi sang Course Service lấy cấu trúc bài học mới
    course_lessons_url = f"{settings.BACKEND_COURSE_URL}/courses/{course_id}/lessons"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(course_lessons_url, timeout=5.0)
            if response.status_code == status.HTTP_404_NOT_FOUND:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khóa học không tồn tại.")
            elif response.status_code != status.HTTP_200_OK:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lỗi cấu trúc khóa học.")
                
            course_data = response.json()
            lessons_list = course_data.get("lessons", [])
            
        except httpx.RequestError:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Course Service sập.")

    # Chuẩn hóa dữ liệu: Map `is_quiz` sang `has_quiz` để tương thích với logic CRUD hiện tại
    for lesson in lessons_list:
        if "has_quiz" not in lesson:
            lesson["has_quiz"] = lesson.get("is_quiz", False)

    # Bước 3: Tạo bản ghi Đăng ký học chính thức
    enroll = crud_course_enrollment.create(db, {"user_id": user_id, "course_id": course_id})
    
    # Bước 4: Khởi tạo tiến độ bài học & tiến độ video
    if lessons_list:
        # 4.1. Khởi tạo tiến độ chung cho tất cả các bài học
        crud_lesson_progress.init_course_progress(
            db=db, user_id=user_id, course_id=course_id, lessons=lessons_list
        )
        
        # 4.2. Lọc các bài học có video (duration_seconds > 0) để khởi tạo video progress
        video_lessons = [l for l in lessons_list if l.get("duration_seconds", 0) > 0]
        if video_lessons:
            crud_video_progress.init_video_progress(
                db=db, user_id=user_id, lessons=video_lessons
            )
        
    return enroll
# 2. LẤY DANH SÁCH TIẾN ĐỘ KHÓA HỌC (Đang học / Đã xong)
@router.get("/history/{is_completed}", response_model=List[CourseInProgress])
async def get_progress_list(
    request: Request,
    db: SessionDep,
    is_completed: bool,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])
    
    # Lấy toàn bộ danh sách bản ghi enrollment thay vì chỉ lấy list ID (Tránh lặp truy vấn DB)
    enrollments = crud_course_enrollment.get_history_by_user(db, user_id=user_id, is_completed=is_completed)
    
    if not enrollments:
        return []

    token = request.headers.get("Authorization")
    headers = {"Authorization": token} if token else {}

    # Hàm bổ trợ call API lấy Title dạng không đồng bộ (Async)
    async def fetch_course_title(client: httpx.AsyncClient, course_id: UUID) -> str:
        url = f"{settings.BACKEND_COURSE_URL}/courses/title/{course_id}"
        try:
            res = await client.get(url, headers=headers, timeout=5.0)
            return res.json() if res.status_code == 200 else "Khóa học không xác định"
        except httpx.RequestError:
            return "Lỗi kết nối hệ thống"

    # Sử dụng asyncio.gather để gọi đồng loạt các HTTP request (Tăng tốc độ đáng kể so với vòng lặp `for` tuần tự)
    async with httpx.AsyncClient() as client:
        tasks = [fetch_course_title(client, enroll.course_id) for enroll in enrollments]
        titles = await asyncio.gather(*tasks)

    # Đóng gói dữ liệu đầu ra
    result = []
    for enroll, title in zip(enrollments, titles):
        result.append(
            CourseInProgress(
                course_id=enroll.course_id,
                course_title=title,
                current_overall_progress=enroll.current_overall_progress,
                is_completed=enroll.is_completed
            )
        )
            
    return result


# 3. LẤY CHI TIẾT TIẾN ĐỘ CỦA MỘT KHÓA HỌC CỤ THỂ
@router.get("/course/{course_id}", response_model=CourseEnrollmentResponse)
def get_single_course_progress(
    db: SessionDep,
    course_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])
    enroll = crud_course_enrollment.get_by_user_and_course(db, user_id=user_id, course_id=course_id)
    if not enroll:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn chưa đăng ký khóa học này."
        )
    return enroll


# 4. CẬP NHẬT TIẾN ĐỘ KHÓA HỌC
@router.put("/course/{course_id}", response_model=CourseEnrollmentResponse)
def update_enrollment(
    db: SessionDep,
    course_id: UUID,
    payload: CourseEnrollmentUpdate,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])
    
    enroll = crud_course_enrollment.get_by_user_and_course(db, user_id=user_id, course_id=course_id)
    if not enroll:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bản ghi đăng ký khóa học không tồn tại."
        )
        
    updated_enroll = crud_course_enrollment.update_progress(
        db, db_obj=enroll, progress=payload.current_overall_progress
    )
    return updated_enroll


# 5. HỦY ĐĂNG KÝ KHÓA HỌC 
@router.delete("/course/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def unenroll_course(
    db: SessionDep,
    course_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = UUID(current_user["user_id"])
    
    # Bước 1: Tìm bản ghi đăng ký
    enroll = crud_course_enrollment.get_by_user_and_course(db, user_id=user_id, course_id=course_id)
    if not enroll:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn chưa từng đăng ký khóa học này."
        )
        
    # Bước 2: KIỂM TRA NGHIỆP VỤ - Hoàn thành rồi thì cấm hủy
    if enroll.is_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khóa học đã hoàn thành, bạn không thể hủy đăng ký."
        )
        
    # Bước 3: Xóa sạch tiến độ Video & tiến độ Bài học liên quan (Đảm bảo Data Integrity)
    # Note: Phải xóa video_progress trước khi xóa lesson_progress 
    # để lấy danh sách lesson_id tương ứng từ lesson_progress.
    crud_video_progress.remove_by_course(db, user_id=user_id, course_id=course_id)
    crud_lesson_progress.remove_by_course(db, user_id=user_id, course_id=course_id)
    crud_note.delete_notes_by_user_and_course(db, user_id=user_id, course_id=course_id)

    # Bước 4: Tiến hành xóa bản ghi đăng ký chính
    crud_course_enrollment.delete(db, enroll.enrollment_id)
    
    return None

@router.get("/statistics/me", response_model=GeneralUserEnrollmentInfo)
def get_user_statistics(
    db: SessionDep,
    current_user: dict = Depends(get_current_user_role)
):
    """
    API lấy thông số số lượng (Đang học, Hoàn thành, Chứng chỉ) của học viên hiện tại
    """
    # Trích xuất và ép kiểu user_id về UUID giống hệt API mẫu của bạn
    user_id = UUID(current_user["user_id"])
    
    # Gọi tầng CRUD xử lý logic tính toán dữ liệu
    stats = crud_course_enrollment.get_general_statistics(db, user_id=user_id)
    
    return stats

@router.get("/internal/top-enrolled-courses")
def get_top_enrolled_courses(session: SessionDep):
    """
    Internal API dành cho các Service khác gọi sang để lấy Top 5 course_id đăng ký nhiều nhất
    """
    data = crud_course_enrollment.get_top_5_course_ids(session)
    return {"success": True, "data": data}

@router.get("/is-enrolled/{course_id}", response_model=bool)
def is_enrolled_course(
    db: SessionDep,
    course_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    user_id = current_user["user_id"]
    return crud_course_enrollment.check_already_enrolled(db, user_id, course_id)