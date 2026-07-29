from app.crud.base import CRUDBase
from app.models.comment import Comment
from app.schemas.comment import CommentCreate, CommentUpdate
from uuid import UUID

class CRUDComment(CRUDBase[Comment, CommentCreate, CommentUpdate, UUID]):
    pass

crud_comment = CRUDComment(Comment)