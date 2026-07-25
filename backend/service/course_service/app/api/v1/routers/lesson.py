from fastapi import APIRouter, Depends, HTTPException, status
from app.api.v1.deps import SessionDep
from app.core.security import RoleChecker
from app.schemas.lesson import LessonCreate, LessonUpdate
from app.models.lesson import Lesson
from app.crud.lesson import crud_lesson
from app.crud.module import crud_module
from uuid import UUID

router = APIRouter(prefix="/lessons", tags=["lessons"])

@router.post("/", response_model=Lesson, status_code=status.HTTP_201_CREATED)
def create_lesson(
    db: SessionDep,
    new_lesson: LessonCreate,
    current_user: dict = Depends(RoleChecker(["Instructor", "Admin", "Manager"]))
):
    """
    API tạo bài học mới.
    - Tự động tăng `total_lessons` của Course liên quan lên +1.
    - Quyền truy cập: Admin hoặc Giảng viên sở hữu khóa học đó.
    """
    # 1. Nếu người dùng là Giảng viên (không phải Admin), cần kiểm tra quyền sở hữu khóa học
    if "Admin" not in current_user.get("roles", []):
        course_instructor = crud_module.get_course_owner(db, new_lesson.module_id)
        print(course_instructor)
        if course_instructor is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module không tồn tại hoặc chương trình học chưa được gán giảng viên"
            )
        
        if str(current_user["user_id"]) != str(course_instructor):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không phải là giảng viên sở hữu khóa học chứa module này"
            )

    # 2. Gọi tầng CRUD đã override để thêm Lesson và kích hoạt +1 total_lessons
    return crud_lesson.create(db, obj_in=new_lesson)


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(
    db: SessionDep,
    lesson_id: UUID,
    current_user: dict = Depends(RoleChecker(["Instructor", "Admin", "Manager"]))
):
    """
    API xóa bài học theo ID.
    - Tự động giảm `total_lessons` của Course liên quan đi -1.
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
    if "Admin" not in current_user.get("roles", []):
        course_instructor = crud_module.get_course_owner(db, lesson.module_id)
        
        if str(current_user["user_id"]) != str(course_instructor):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xóa bài học thuộc khóa học này"
            )

    # 3. Gọi tầng CRUD đã override để xóa Lesson và kích hoạt -1 total_lessons
    crud_lesson.delete(db, id=lesson_id)
    
    # 204 NO CONTENT không trả về dữ liệu ở Body
    return None

@router.put("/{lesson_id}", response_model=Lesson)
def update_lesson(
    db: SessionDep,
    lesson_id: UUID,
    lesson_in: LessonUpdate,
    current_user: dict = Depends(RoleChecker(["Instructor", "Admin", "Manager"]))
):
    """
    API cập nhật thông tin bài học.
    - Tự động sắp xếp lại `order_index` (khi kéo thả / đổi thứ tự).
    - Hỗ trợ đổi bài học sang Module khác (nếu schema hỗ trợ module_id).
    - Quyền truy cập: Admin/Manager hoặc Giảng viên sở hữu khóa học chứa bài học này.
    """
    # 1. Kiểm tra bài học có tồn tại hay không
    lesson = crud_lesson.get_by_id(db, id=lesson_id)
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài học không tồn tại"
        )

    # 2. Kiểm tra quyền sở hữu đối với Giảng viên
    if "Admin" not in current_user.get("roles", []) and "Manager" not in current_user.get("roles", []):
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

@router.get("/is-existed/{lesson_id}")
def is_existed(
    db: SessionDep,
    lesson_id: UUID
):
    return crud_lesson.get_by_id(db, lesson_id) is not None