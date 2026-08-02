from app.crud.base import CRUDBase
from app.models.curriculum import Curriculum 
from app.schemas.curriculum import CurriculumCreate, CurriculumUpdate
from uuid import UUID
from sqlmodel import Session, select
from app.models.course import Course
from sqlalchemy.orm import selectinload

class CRUDCurriculum(CRUDBase[Curriculum, CurriculumCreate, CurriculumUpdate, UUID]):
    def delete(self, db: Session, id: UUID) -> Curriculum | None:
        statement = (
            select(self.model)
            .where(self.model.curriculum_id == id)
            .options(
                # Nạp Course, đồng thời nạp tiếp danh sách Subject thuộc Course đó
                selectinload(Curriculum.course).selectinload(Course.subjects) # Hoặc tên relationship trong Course model
            )
        )
        db_obj = db.exec(statement).first()

        if db_obj:
            db.delete(db_obj)
            db.commit()

# Khởi tạo instance cho router gọi đến
crud_curriculum = CRUDCurriculum(Curriculum)