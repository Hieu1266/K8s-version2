from uuid import UUID
from typing import List, Dict, Any
from sqlmodel import Session, select, delete
from app.crud.base import CRUDBase
from app.schemas.video_progress import VideoProgressCreate, VideoProgressUpdate
from app.models.video_progress import VideoProgress
from app.models.lesson_progress import LessonProgress

class CRUDVideoProgress(CRUDBase[VideoProgress, VideoProgressCreate, VideoProgressUpdate, UUID]):
    def init_video_progress(self, db: Session, user_id: UUID, lessons: List[Dict[str, Any]]):
        """
        Khởi tạo tiến độ video hàng loạt cho học viên khi đăng ký khóa học
        """
        # 1. Lấy danh sách lesson_id đã tồn tại bản ghi tiến độ video của user này (tránh tạo trùng)
        existing_lesson_ids = set(
            db.exec(
                select(VideoProgress.lesson_id).where(VideoProgress.user_id == user_id)
            ).all()
        )

        # 2. Lọc và chuẩn bị danh sách object mới
        new_progress_list = []
        for lesson in lessons:
            lesson_id = UUID(str(lesson["lesson_id"]))
            duration = lesson.get("duration_seconds", 0)

            # Chỉ tạo tiến độ cho bài học có video (duration > 0) và chưa tồn tại
            if lesson_id not in existing_lesson_ids and duration > 0:
                video_progress = VideoProgress(
                    user_id=user_id,
                    lesson_id=lesson_id,
                    duration_seconds=duration,
                    last_watched_second=0,
                    max_watched_second=0,
                    completion_percentage=0.0,
                    is_finished=False,
                    current_points=0.0
                )
                new_progress_list.append(video_progress)

        # 3. Lưu hàng loạt vào DB bằng add_all để tối ưu hiệu năng
        if new_progress_list:
            db.add_all(new_progress_list)
            db.commit()

    def remove_by_course(self, db: Session, user_id: UUID, course_id: UUID):
            """
            Xóa toàn bộ tiến độ video của người dùng trong một khóa học cụ thể
            """
            # 1. Trích xuất danh sách lesson_id của user thuộc course_id từ LessonProgress
            statement_lessons = select(LessonProgress.lesson_id).where(
                LessonProgress.user_id == user_id,
                LessonProgress.course_id == course_id
            )
            lesson_ids = db.exec(statement_lessons).all()

            # 2. Xóa các bản ghi VideoProgress tương ứng với danh sách lesson_id
            if lesson_ids:
                statement_delete = delete(VideoProgress).where(
                    VideoProgress.user_id == user_id,
                    VideoProgress.lesson_id.in_(lesson_ids)
                )
                db.exec(statement_delete)
                db.commit()

crud_video_progress = CRUDVideoProgress(VideoProgress)