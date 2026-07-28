from app.models.question_pool import QuestionPool
from app.schemas.question_pool import QuestionPoolCreate, QuestionPoolUpdate, QuestionPoolBase, QuestionPoolItem
from app.crud.question_pool import crud_question_pool
from app.api.v1.deps import SessionDep
from app.core.config import settings
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.core.security import get_current_user_role, RoleChecker
import asyncio
import httpx
from uuid import UUID

router = APIRouter(prefix="/question_pools", tags=["question_pools"])

@router.post("/")
def create_question_pool(
    db: SessionDep,
    obj_in: QuestionPoolBase,
    current_user: dict = Depends(RoleChecker(["Instructor"]))
):
    user_id = UUID(current_user["user_id"])
    if crud_question_pool.is_title_existed(db, obj_in.title):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail = "Tên pool đã được sử dụng"
        )
    new_pool = QuestionPoolCreate(
        owner_id=user_id,
        title=obj_in.title,
        description=obj_in.description
    )
    crud_question_pool.create(db, new_pool)
    return {
        "success": True,
        "message": f"Tạo pool {obj_in.title} thành công!"
    }

@router.get("/get-pool-list", response_model=List[QuestionPoolItem])
def get_pool_list(
    db: SessionDep,
    current_user: dict = Depends(RoleChecker(["Instructor"]))
):
    user_id = UUID(current_user["user_id"])
    return crud_question_pool.get_multi_by_owner(db, user_id)

@router.patch("/{pool_id}")
def update_question_pool(
    db: SessionDep,
    obj_in: QuestionPoolUpdate,
    pool_id: UUID,
    current_user: dict = Depends(RoleChecker(["Instructor"]))
):
  user_id = UUID(current_user["user_id"])
  pool = crud_question_pool.get_by_id(db, pool_id)
  if pool is None:
      raise HTTPException(
          status_code=status.HTTP_404_NOT_FOUND,
          detail="Pool không tồn tại"
      )  
  if user_id != pool.owner_id:
      raise HTTPException(
          status_code=status.HTTP_403_FORBIDDEN,
          detail="Bạn không có quyền sửa pool"
      )
  updated_pool = crud_question_pool.update(db, pool, obj_in)
  return {
      "success": True,
      "pool": updated_pool
  }