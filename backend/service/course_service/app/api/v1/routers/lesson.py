import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.v1.deps import SessionDep
from app.core.security import RoleChecker, get_current_user_role
from app.schemas.lesson import LessonCreate, LessonUpdate, LessonManagementOut
from app.models.lesson import Lesson
from app.crud.lesson import crud_lesson
from app.crud.module import crud_module
from uuid import UUID

router = APIRouter(prefix="/lessons", tags=["lessons"])

# Phải khớp với BASE_STORAGE_DIR khai báo trong app/api/v1/endpoints/lesson_resource.py
LESSON_RESOURCES_DIR = Path("documents/lesson_resources")

@router.post("/", response_model=Lesson, status_code=status.HTTP_201_CREATED)
def create_lesson(
    db: SessionDep,
    new_lesson: LessonCreate,
    current_user: dict = Depends(get_current_user_role)
):
    """
    API tạo bài học mới.
    - Tự động tăng `total_lessons` của Course liên quan lên +1.
    - Quyền truy cập: Admin hoặc Giảng viên sở hữu khóa học đó.
    """
    # 1. Nếu người dùng là Giảng viên (không phải Admin), cần kiểm tra quyền sở hữu khóa học
    course_instructor = crud_module.get_course_owner(db, new_lesson.module_id)
    if course_instructor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module không tồn tại hoặc chương trình học chưa được gán giảng viên"
        )
        
    if str(current_user["user_id"]) != str(course_instructor):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không phải là giảng viên được phân công môn học chứa module này"
        )

    # 2. Gọi tầng CRUD đã override để thêm Lesson và kích hoạt +1 total_lessons
    return crud_lesson.create(db, obj_in=new_lesson)


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(
    db: SessionDep,
    lesson_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    """
    API xóa bài học theo ID.
    - Tự động giảm `total_lessons` của Course liên quan đi -1.
    - Dọn luôn thư mục tài nguyên (file) đính kèm bài học trên đĩa.
    - Quyền truy cập: Admin hoặc Giảng viên sở hữu khóa học đó.
    """
    # 1. Kiểm tra xem bài học có tồn tại hay không trước khi xét quyền
    lesson = crud_lesson.get_by_id(db, id=lesson_id) # Dùng get_by_id từ CRUDBase của bạn
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài học không tồn tại"
        )

    # 2. Nếu là Giảng viên, kiểm tra xem họ có quyền quản lý bài học này không
    course_instructor = crud_module.get_course_owner(db, lesson.module_id)
        
    if str(current_user["user_id"]) != str(course_instructor):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xóa bài học thuộc khóa học này"
        )

    # 3. Gọi tầng CRUD đã override để xóa Lesson và kích hoạt -1 total_lessons
    # (Việc xóa các bản ghi LessonResource trong DB nên được cấu hình cascade ở model/DB;
    #  nếu chưa có cascade, cần xóa thủ công các bản ghi LessonResource liên quan trước bước này)
    crud_lesson.delete(db, id=lesson_id)

    # 4. Dọn thư mục file vật lý documents/lesson_resources/{lesson_id} (nếu có)
    lesson_dir = LESSON_RESOURCES_DIR / str(lesson_id)
    if lesson_dir.exists():
        shutil.rmtree(lesson_dir, ignore_errors=True)
    
    # 204 NO CONTENT không trả về dữ liệu ở Body
    return None

@router.put("/{lesson_id}", response_model=Lesson)
def update_lesson(
    db: SessionDep,
    lesson_id: UUID,
    lesson_in: LessonUpdate,
    current_user: dict = Depends(get_current_user_role)
):
    """
    API cập nhật thông tin bài học.
    - Tự động sắp xếp lại `order_index` (khi kéo thả / đổi thứ tự).
    - Hỗ trợ đổi bài học sang Module khác (nếu schema hỗ trợ module_id).
    - Quyền truy cập: Admin/Manager hoặc Giảng viên sở hữu khóa học chứa bài học này.
    - Lưu ý: LessonUpdate không có field `is_quiz` -> không thể đổi 1 bài học đã tạo
      thành/khỏi trạng thái "bài thi" qua API này (đúng theo nghiệp vụ yêu cầu).
    """
    # 1. Kiểm tra bài học có tồn tại hay không
    lesson = crud_lesson.get_by_id(db, id=lesson_id)
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài học không tồn tại"
        )

    # 2. Kiểm tra quyền sở hữu đối với Giảng viên
    # Kiểm tra quyền trên Module hiện tại
    current_owner = crud_module.get_course_owner(db, lesson.module_id)
    if current_owner is None or str(current_user["user_id"]) != str(current_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền chỉnh sửa bài học thuộc khóa học này"
        )

    # Nếu người dùng muốn chuyển Lesson sang Module mới, kiểm tra quyền trên Module mới
    new_module_id = getattr(lesson_in, "module_id", None)
    if new_module_id and new_module_id != lesson.module_id:
        new_owner = crud_module.get_course_owner(db, new_module_id)
        if new_owner is None or str(current_user["user_id"]) != str(new_owner):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền chuyển bài học sang Module thuộc sở hữu của giảng viên khác"
            )

    # 3. Gọi tầng CRUD đã xử lý logic tự động reorder & cập nhật database
    return crud_lesson.update(db, db_obj=lesson, obj_in=lesson_in)

@router.get("/get-lesson-list/{module_id}", response_model=list[LessonManagementOut])
def get_lesson_list(
    db: SessionDep,
    module_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    """
    Lấy danh sách bài học của 1 module, kèm theo danh sách tài nguyên (resources) đính kèm mỗi bài.
    Dùng cho trang Quản lý bài học của Giảng viên.
    """
    user_id = UUID(current_user["user_id"])
    if not crud_module.get_by_id(db, module_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module không tồn tại"
        )
    if crud_module.get_course_owner(db, module_id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền lấy danh sách bài học của module"
        )
    lessons = crud_lesson.get_multi_by_module(db, module_id)
    return lessons

@router.get("/is-existed/{lesson_id}")
def is_existed(
    db: SessionDep,
    lesson_id: UUID
):
    return crud_lesson.get_by_id(db, lesson_id) is not None