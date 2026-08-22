# import httpx
# from fastapi import UploadFile, HTTPException, status
# from app.core.config import settings
# # STORAGE_API_URL = "http://localhost:9000"
# STORAGE_API_URL = settings.STORAGE_API_URL
# class CRUDSyllabusMedia:
#     def upload_file(self, file: UploadFile) -> str:
#         try:
#             files = {"file": (file.filename, file.file, file.content_type)}
#             data = {"folder": "curriculum"}
#             resp = httpx.post(f"{STORAGE_API_URL}/upload", files=files, data=data, timeout=30)
#             resp.raise_for_status()
#             result = resp.json()
            
#             # 🟢 Trả về dạng: static/uploads/documents/syllabus/filename.pdf (Giống Curriculum)
#             return f"static{result['path']}"  
#         except httpx.HTTPError as e:
#             raise HTTPException(
#                 status_code=status.HTTP_400_BAD_REQUEST,
#                 detail=f"Lỗi hệ thống khi lưu tệp tin đề cương: {str(e)}"
#             )

# crud_syllabus_media = CRUDSyllabusMedia()






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

class CRUDSyllabusMedia:
    def upload_file(self, file: UploadFile) -> str:
        try:
            ext = os.path.splitext(file.filename)[1]
            object_name = f"syllabus/{uuid.uuid4().hex}{ext}"
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
                detail=f"Lỗi hệ thống khi lưu tệp tin đề cương: {str(e)}"
            )

crud_syllabus_media = CRUDSyllabusMedia()