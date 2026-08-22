# import os
# import uuid
# import shutil
# from fastapi import UploadFile, HTTPException, status
# from app.core.config import settings

# class CRUDCurriculumMedia:
#     def __init__(self):
#         self.upload_dir = settings.FOLDER_PATH_CURRICULUM

#     def upload_file(self, file: UploadFile) -> str:
#         try:
#             os.makedirs(self.upload_dir, exist_ok=True)
#             file_extension = os.path.splitext(file.filename)[1]
#             unique_filename = f"{uuid.uuid4()}{file_extension}"
#             file_path = os.path.join(self.upload_dir, unique_filename)
            
#             with open(file_path, "wb") as buffer:
#                 shutil.copyfileobj(file.file, buffer)
                
#             return f"static/uploads/curriculum/{unique_filename}"
            
#         except Exception as e:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST, 
#                 detail=f"Lỗi hệ thống khi lưu tệp tin học liệu: {str(e)}"
#             )

# crud_curriculum_media = CRUDCurriculumMedia()



# import httpx
# from fastapi import UploadFile, HTTPException, status
# from app.core.config import settings

# STORAGE_API_URL = settings.STORAGE_API_URL
# class CRUDCurriculumMedia:
#     def upload_file(self, file: UploadFile) -> str:
#         try:
#             files = {"file": (file.filename, file.file, file.content_type)}
#             data = {"folder": "curriculum"}
#             resp = httpx.post(f"{STORAGE_API_URL}/upload", files=files, data=data, timeout=30)
#             resp.raise_for_status()
#             result = resp.json()
#             return f"static{result['path']}"  # chỉ lưu path tương đối, giống format cũ
#         except httpx.HTTPError as e:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail=f"Lỗi hệ thống khi lưu tệp tin học liệu: {str(e)}"
#             )

# crud_curriculum_media = CRUDCurriculumMedia()






import uuid
import os
import boto3
from botocore.client import Config
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

s3_client = boto3.client(
    "s3",
    endpoint_url=settings.MINIO_ENDPOINT,
    aws_access_key_id=settings.MINIO_ACCESS_KEY,
    aws_secret_access_key=settings.MINIO_SECRET_KEY,
    config=Config(signature_version="s3v4"),
    region_name="us-east-1",
)
BUCKET_NAME = settings.MINIO_BUCKET

class CRUDCurriculumMedia:
    def upload_file(self, file: UploadFile) -> str:
        try:
            ext = os.path.splitext(file.filename)[1]
            object_name = f"curriculum/{uuid.uuid4().hex}{ext}"
            s3_client.upload_fileobj(
                file.file,
                BUCKET_NAME,
                object_name,
                ExtraArgs={"ContentType": file.content_type},
            )
            return f"{settings.STORAGE_PUBLIC_URL}/{BUCKET_NAME}/{object_name}"
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Lỗi hệ thống khi lưu tệp tin học liệu: {str(e)}"
            )

crud_curriculum_media = CRUDCurriculumMedia()