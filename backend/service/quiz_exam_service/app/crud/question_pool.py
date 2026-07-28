from sqlmodel import Session, select, update
from app.crud.base import CRUDBase
from uuid import UUID
from app.models.question_pool import QuestionPool
from app.schemas.question_pool import QuestionPoolCreate, QuestionPoolUpdate, QuestionPoolItem

class CRUDQuestionPool(CRUDBase[QuestionPool, QuestionPoolCreate, QuestionPoolUpdate, UUID]):
    def is_title_existed(self, db: Session, title: str):
        statement = select(QuestionPool).where(
            QuestionPool.title == title
        )
        return db.exec(statement).first() is not None

    def get_multi_by_owner(self, db: Session, owner_id: UUID) -> list[QuestionPoolItem]:
        statement = select(QuestionPool).where(
            QuestionPool.owner_id == owner_id
        )
        return db.exec(statement).all()
crud_question_pool = CRUDQuestionPool(QuestionPool)

