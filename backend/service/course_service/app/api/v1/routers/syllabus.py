import os
import uuid
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, UploadFile, File
from fastapi.responses import FileResponse  # 🟢 Bổ sung import để trả về file stream

from app.api.v1.deps import SessionDep
from app.core.security import RoleChecker
from app.crud.syllabus import crud_syllabus
from app.schemas.enums import SyllabusStatus
from app.schemas.syllabus import (
    CheckSyllabusInstructor,
    SyllabusCreate,
    SyllabusRead,
    SyllabusUpdate,
)

router = APIRouter(prefix="/syllabus", tags=["syllabus"])
PHYSICAL_UPLOAD_DIR = "/var/www/lumer_media/uploads/documents/syllabus"

# Nếu chạy local môi trường Dev chưa có thư mục /var/www/...
if not os.path.exists("/var/www/lumer_media/uploads"):
    PHYSICAL_UPLOAD_DIR = "documents/syllabus"

os.makedirs(PHYSICAL_UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_syllabus_file(file: UploadFile = File(...)):
    try:
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"

        # 🟢 Ghi file vào đĩa cứng bằng đường dẫn tuyệt đối
        full_disk_path = os.path.join(PHYSICAL_UPLOAD_DIR, unique_filename)
        with open(full_disk_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # 🟢 TRẢ VỀ ĐƯỜNG DẪN SẠCH ĐỂ LƯU VÀO DATABASE (Tương tự Hình 2)
        clean_db_path = f"documents/syllabus/{unique_filename}"

        return {
            "status": "success",
            "file_path": clean_db_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu file: {str(e)}")


# 🔵 2. API: Lấy thông tin đề cương theo ID Môn học
@router.get("/subject/{subject_id}", response_model=SyllabusRead, status_code=status.HTTP_200_OK)
def get_syllabus_by_subject(
    subject_id: UUID,
    db: SessionDep,
    request: Request,
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor", "Student", "Manager"]))
):
    syllabus = crud_syllabus.get_by_subject(db=db, subject_id=subject_id)
    if not syllabus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Môn học này chưa có dữ liệu đề cương chi tiết."
        )
    return syllabus


# 🟢 3. API: Tạo mới một đề cương
@router.post("/", response_model=SyllabusRead, status_code=status.HTTP_201_CREATED)
def create_syllabus(
    payload: SyllabusCreate,
    db: SessionDep,
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor", "Manager"]))
):
    existing = crud_syllabus.get_by_subject(db=db, subject_id=payload.subject_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Môn học này đã tồn tại đề cương, vui lòng sử dụng phương thức cập nhật."
        )
    
    if payload.status_id == "SYLLABUS_DRAFT" or not payload.status_id:
        payload.status_id = SyllabusStatus.SYLLABUS_DRAFT.value

    return crud_syllabus.create(db=db, obj_in=payload)


# 🟡 4. API: Cập nhật thông tin đề cương theo ID
@router.put("/{syllabus_id}", response_model=SyllabusRead, status_code=status.HTTP_200_OK)
def update_syllabus(
    syllabus_id: UUID,
    payload: SyllabusUpdate,
    db: SessionDep,
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor", "Manager"]))
):
    db_obj = crud_syllabus.get_by_id(db=db, id=syllabus_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy đề cương yêu cầu.")
    return crud_syllabus.update(db=db, db_obj=db_obj, obj_in=payload)


@router.get("/check-instructor", response_model=bool)
def is_subject_instructor(
    db: SessionDep,
    instructor_id: UUID = Query(...),
    subject_id: UUID = Query(...)
):
    query = CheckSyllabusInstructor(subject_id=subject_id, instructor_id=instructor_id)
    return crud_syllabus.is_subject_instructor(db, query)



@router.get("/download/{syllabus_id}")
def download_syllabus_file(
    syllabus_id: UUID,
    db: SessionDep,
    current_user: dict = Depends(RoleChecker(["Admin", "Instructor", "Student", "Manager"]))
):
    syllabus = crud_syllabus.get_by_id(db=db, id=syllabus_id)
    if not syllabus or not syllabus.syllabus_file_path:
        raise HTTPException(status_code=404, detail="Không tìm thấy tập tin đề cương.")

    # Tìm đường dẫn tuyệt đối trên đĩa
    base_dir = "/var/www/lumer_media/uploads" if os.path.exists("/var/www/lumer_media/uploads") else ""
    full_path = os.path.join(base_dir, syllabus.syllabus_file_path)

    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Tập tin không tồn tại trên máy chủ.")

    file_name = os.path.basename(full_path)
    return FileResponse(
        path=full_path,
        filename=file_name,
        media_type="application/pdf"
    )