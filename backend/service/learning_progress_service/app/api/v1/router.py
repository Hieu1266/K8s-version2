from fastapi import APIRouter
from app.api.v1.routers.course_enrollment import router as course_enrollment_router
from app.api.v1.routers.lesson_progress import router as lesson_progress_router
from app.api.v1.routers.certificate import router as certificate_router
from app.api.v1.routers.user_lesson_note import router as note_router

router = APIRouter()

router.include_router(course_enrollment_router)
router.include_router(lesson_progress_router)
router.include_router(certificate_router)
router.include_router(note_router)
