from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from uuid import UUID

from app.api.v1.deps import SessionDep
from app.core.security import RoleChecker
from app.crud.comment import crud_comment
from app.crud.course_enrollment import crud_course_enrollment
from app.schemas.comment import CommentCreate, CommentUpdate, CommentResponse, StructureCommentIn
from app.schemas.comment import CommentTeacherView, CommentStatusUpdate
router = APIRouter(prefix="/comment", tags=["comment"])


# 1. TESTER TẠO NHẬN XÉT CHO 1 SUBJECT/MODULE/LESSON CỤ THỂ
#    Dùng khi tester đang học và bấm nút feedback trên từng bài, hoặc khi chọn
#    từ cây cấu trúc khóa học trong modal xác nhận cuối khóa.
@router.post("/", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_structure_comment(
    db: SessionDep,
    obj_in: StructureCommentIn,
    current_user: dict = Depends(RoleChecker(["Tester", "Instructor"])),
):
    tester_id = UUID(current_user["user_id"])

    enroll = crud_course_enrollment.get_by_user_and_course(
        db, user_id=tester_id, course_id=obj_in.course_id
    )
    if not enroll:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn chưa được giao khóa học này.",
        )
    if not enroll.is_tested:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Đây không phải khóa học kiểm thử được giao cho bạn.",
        )

    # Nếu đã có nhận xét cho đúng subject/module/lesson này rồi -> báo lỗi rõ ràng,
    # để frontend biết chuyển sang gọi PATCH thay vì tạo trùng.
    existing = crud_comment.get_by_enrollment_and_part(
        db,
        enrollment_id=enroll.enrollment_id,
        structure_part=obj_in.structure_part,
        part_id=obj_in.part_id,
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn đã để lại nhận xét cho phần này rồi. Vui lòng chỉnh sửa thay vì tạo mới.",
        )

    new_comment = CommentCreate(
        enrollment_id=enroll.enrollment_id,
        tester_id=tester_id,
        structure_part=obj_in.structure_part,
        part_id=obj_in.part_id,
        title=obj_in.title,
        comment=obj_in.comment,
    )
    return crud_comment.create(db, obj_in=new_comment)


# 2. LẤY TOÀN BỘ NHẬN XÉT CỦA TESTER CHO 1 KHÓA HỌC (course + subject + module + lesson)
#    Dùng để hiển thị lại trong modal xác nhận cuối khóa (tổng hợp mọi feedback đã ghi lúc học).
@router.get("/my-course/{course_id}", response_model=List[CommentResponse])
def get_my_comments_for_course(
    db: SessionDep,
    course_id: UUID,
    current_user: dict = Depends(RoleChecker(["Tester", "Instructor"])),
):
    tester_id = UUID(current_user["user_id"])
    enroll = crud_course_enrollment.get_by_user_and_course(db, user_id=tester_id, course_id=course_id)
    if not enroll:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn chưa được giao khóa học này.",
        )
    return crud_comment.get_multi_by_enrollment(db, enrollment_id=enroll.enrollment_id)


# 3. ADMIN/MANAGER XEM TOÀN BỘ NHẬN XÉT THEO ENROLLMENT (để review kết quả kiểm thử của tester)
@router.get("/enrollment/{enrollment_id}", response_model=List[CommentResponse])
def get_comments_by_enrollment(
    db: SessionDep,
    enrollment_id: UUID,
    current_user: dict = Depends(RoleChecker(["Admin", "Manager"])),
):
    return crud_comment.get_multi_by_enrollment(db, enrollment_id=enrollment_id)


# 4. SỬA NHẬN XÉT (chỉ chủ sở hữu - đúng tester đã tạo)
@router.patch("/{comment_id}", response_model=CommentResponse)
def update_comment(
    db: SessionDep,
    comment_id: UUID,
    obj_in: CommentUpdate,
    current_user: dict = Depends(RoleChecker(["Tester", "Instructor"])),
):
    tester_id = UUID(current_user["user_id"])
    existing = crud_comment.get_by_id(db, comment_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy nhận xét.")
    if existing.tester_id != tester_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền sửa nhận xét này.")
    return crud_comment.update(db, existing, obj_in)


# 5. XÓA NHẬN XÉT (chỉ chủ sở hữu)
@router.delete("/{comment_id}")
def delete_comment(
    db: SessionDep,
    comment_id: UUID,
    current_user: dict = Depends(RoleChecker(["Tester"])),
):
    tester_id = UUID(current_user["user_id"])
    existing = crud_comment.get_by_id(db, comment_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy nhận xét.")
    if existing.tester_id != tester_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền xóa nhận xét này.")
    crud_comment.delete(db, comment_id)
    return {"success": True, "message": "Đã xóa nhận xét."}



# 6. GIẢNG VIÊN XEM TOÀN BỘ NHẬN XÉT CỦA MỌI TESTER THEO COURSE
@router.get("/course/{course_id}", response_model=List[CommentTeacherView])
def get_comments_for_course(
    db: SessionDep,
    course_id: UUID,
    current_user: dict = Depends(RoleChecker(["Instructor"])),
):
    comments = crud_comment.get_multi_by_course(db, course_id=course_id)
    if not comments:
        return []

    tester_ids = list({c.tester_id for c in comments})
    username_map = call_get_usernames_service(tester_ids)

    return [
        {**comment.model_dump(), "tester_username": username_map.get(str(comment.tester_id), "Không rõ")}
        for comment in comments
    ]

# 7. GIẢNG VIÊN CẬP NHẬT TRẠNG THÁI XỬ LÝ
@router.patch("/{comment_id}/status", response_model=CommentResponse)
def update_comment_status(
    db: SessionDep,
    comment_id: UUID,
    obj_in: CommentStatusUpdate,
    current_user: dict = Depends(RoleChecker(["Instructor"])),
):
    updated = crud_comment.update_status(db, comment_id, obj_in.status)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy nhận xét.")
    return updated


def call_get_usernames_service(tester_ids: list[UUID]) -> dict[str, str]:
    # TODO: thay bằng gọi thật sang user-service để lấy username theo id
    return {}