from fastapi import APIRouter, HTTPException, Depends, status, Request
from typing import List
from uuid import UUID
from app.core.security import get_current_user_role

router = APIRouter(prefix="/video_progress", tags=["video_progress"])

