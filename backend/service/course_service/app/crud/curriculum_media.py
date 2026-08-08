import os
import uuid
import shutil
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

class CRUDCurriculumMedia:
    def __init__(self):
        self.upload_dir = settings.FOLDER_PATH_CURRICULUM

    def upload_file(self, file: UploadFile) -> str:
        try:
            os.makedirs(self.upload_dir, exist_ok=True)
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(self.upload_dir, unique_filename)
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            return f"static/uploads/curriculum/{unique_filename}"
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Lỗi hệ thống khi lưu tệp tin học liệu: {str(e)}"
            )

crud_curriculum_media = CRUDCurriculumMedia()