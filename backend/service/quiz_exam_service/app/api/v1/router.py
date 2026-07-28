from fastapi import APIRouter
from app.api.v1.routers.quiz import router as quiz_router
from app.api.v1.routers.question import router as question_router
from app.api.v1.routers.question_option import router as question_opt_router
from app.api.v1.routers.question_pool import router as question_pool_router
from app.api.v1.routers.question_bank import router as question_bank_router
router = APIRouter()

router.include_router(quiz_router)
router.include_router(question_router)
router.include_router(question_opt_router)
router.include_router(question_pool_router)
router.include_router(question_bank_router)

