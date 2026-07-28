from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.core.db import settings
from app.api.v1.deps import SessionDep
from app.core.security import get_current_user_role
from app.crud.quiz import crud_quiz
from app.schemas.quiz import QuizCreate, QuizItem
from app.models.enum import QuizType
from app.schemas.quiz_question import QuizQuestionCreate
from app.schemas.quiz_pool_rule import QuizPoolRuleCreate
from uuid import UUID
import httpx
from app.crud.quiz_question import crud_quiz_question
from app.crud.quiz_pool_rule import crud_quiz_pool_rule

router = APIRouter(prefix="/quizzes" ,tags=["quizzes"])

COURSE_SERVICE_URL = settings.BACKEND_COURSE_URL

async def get_owner(subject_id: UUID) -> UUID:
    async with httpx.AsyncClient() as client:
        try:
            # Sửa cú pháp URL: bỏ dấu $ và dùng {subject_id}
            url = f"{COURSE_SERVICE_URL}/subjects/get-owner/{subject_id}"
            response = await client.get(url, timeout=5.0)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Không thể xác thực thông tin bài học do lỗi từ Course Service."
                )
            
            owner_id_str = response.json()
            
            if not owner_id_str:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Môn học không tồn tại"
                )
            
            # Trả về giá trị đã chuyển đổi sang UUID
            return UUID(owner_id_str)
                
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Kết nối tới Course Service thất bại: {exc}"
            )

@router.get("/{lesson_id}/had-quiz")
def is_lesson_had_quiz(
    db: SessionDep,
    lesson_id: UUID
):
    return crud_quiz.is_lesson_had_quiz(db, lesson_id)

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_initial_quiz(
    db: SessionDep, 
    obj_in: QuizCreate,
    current_user: dict = Depends(get_current_user_role)
):
    """
    API khởi tạo đề thi (Quiz) ban đầu.
    """
    # 🐛 SỬA BUG: trước đây dùng `db_quiz.subject_id` khi `db_quiz` CHƯA được gán
    # (chỉ được tạo ở bước bên dưới) -> luôn crash NameError. Phải dùng `obj_in.subject_id`.
    owner_id = await get_owner(obj_in.subject_id)
    if UUID(current_user["user_id"]) != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail ="Bạn không có quyền tạo câu hỏi cho môn học"
    )
    # Nếu client có truyền bài học để gắn đề thi vào
    if obj_in.target_lesson_id:
        try:
            # Gửi request GET tới endpoint kiểm tra của Course Service
            response = httpx.get(f"{COURSE_SERVICE_URL}/lessons/is-existed/{obj_in.target_lesson_id}", timeout=5.0)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Không thể xác thực thông tin bài học do lỗi từ Course Service."
                )
                
            # Đọc kết quả boolean trả về từ API đích
            is_lesson_existed = response.json()
            
            if not is_lesson_existed:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Bài học với ID {obj_in.target_lesson_id} không tồn tại trên hệ thống."
                )
                
        except httpx.RequestError as exc:
            # Xử lý trường hợp mạng lỗi hoặc Course Service bị sập không phản hồi
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Kết nối tới Course Service thất bại: {exc}"
            )

        # 1. Validate: Kiểm tra xem bài học này đã được gắn đề thi nào chưa
        if crud_quiz.is_lesson_had_quiz(db, lesson_id=obj_in.target_lesson_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bài học với ID {obj_in.target_lesson_id} đã được cấu hình đề thi trước đó."
            )

    # 2. Gọi tầng CRUD độc lập để khởi tạo đối tượng Quiz
    db_quiz = crud_quiz.create(db, obj_in=obj_in)

    # 3. Trả về thông tin Quiz vừa tạo (Bao gồm cả quiz_id hệ thống tự sinh)
    return {
        "status": "success",
        "message": "Khởi tạo khung đề thi thành công!",
        "data": {
            "quiz_id": db_quiz.quiz_id,
            "title": db_quiz.title,
            "quiz_type": db_quiz.quiz_type,
            "created_at": db_quiz.created_at
        }
    }

@router.delete("/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz(
    db: SessionDep,
    quiz_id: UUID,
    current_user: dict = Depends(get_current_user_role)
):
    """
    🆕 API xóa đề thi.
    Lưu ý: nếu DB có ràng buộc khóa ngoại từ quiz_question/quiz_pool_rule/submission trỏ về
    quiz_id mà CHƯA cấu hình cascade delete, thao tác xóa 1 quiz đã có câu hỏi/pool/lượt làm bài
    sẽ báo lỗi vi phạm khóa ngoại. Cần cấu hình cascade ở model nếu muốn cho xóa trong mọi trường hợp.
    """
    db_quiz = crud_quiz.get_by_id(db, id=quiz_id)
    if not db_quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đề thi."
        )

    owner_id = await get_owner(db_quiz.subject_id)
    if UUID(current_user["user_id"]) != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xóa đề thi này"
        )

    crud_quiz.delete(db, id=quiz_id)
    return None

@router.post("/{quiz_id}/questions", status_code=status.HTTP_200_OK)
async def add_fixed_questions(
    db: SessionDep, 
    quiz_id: UUID, 
    obj_in: list[QuizQuestionCreate],
    current_user: dict = Depends(get_current_user_role)
):
    """
    API bổ sung câu hỏi cố định vào đề thi (Dành cho FIXED_QUESTION).
    """
    # Kiểm tra xem Quiz có tồn tại không
    db_quiz = crud_quiz.get_by_id(db, id=quiz_id)
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin đề thi.")
    owner_id = await get_owner(db_quiz.subject_id)
    if UUID(current_user["user_id"]) != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail ="Bạn không có quyền tạo câu hỏi cho môn học"
        )
    
    # Bảo vệ logic: Đề thi ngẫu nhiên thì không được gán câu hỏi cố định
    if db_quiz.quiz_type != QuizType.FIXED_QUESTION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Đề thi này được cấu hình ở dạng RANDOM_QUESTION, không thể thêm câu hỏi cố định."
        )

    # Thực thi lưu thông qua CRUD độc lập
    crud_quiz_question.add_questions_to_quiz(db, quiz_id=quiz_id, questions_in=obj_in)
    db.commit()
    
    return {"status": "success", "message": "Đã thêm danh sách câu hỏi và tự động sắp xếp thứ tự hiển thị thành công."}


@router.post("/{quiz_id}/pool-rules", status_code=status.HTTP_200_OK)
async def add_pool_rules(
    db: SessionDep, 
    quiz_id: UUID, 
    obj_in: list[QuizPoolRuleCreate],
    current_user: dict = Depends(get_current_user_role)
):
    """
    API bổ sung luật bốc ngân hàng câu hỏi (Dành cho RANDOM_QUESTION).
    """
    db_quiz = crud_quiz.get_by_id(db, id=quiz_id)
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin đề thi.")

    owner_id = await get_owner(db_quiz.subject_id)
    if UUID(current_user["user_id"]) != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail ="Bạn không có quyền tạo câu hỏi cho môn học"
        )
    
    # Bảo vệ logic: Đề thi cố định thì không được gắn luật bốc ngẫu nhiên
    if db_quiz.quiz_type != QuizType.RANDOM_QUESTION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Đề thi này được cấu hình ở dạng FIXED_QUESTION, không thể thiết lập luật bốc pool ngẫu nhiên."
        )

    crud_quiz_pool_rule.add_rules_to_quiz(db, quiz_id=quiz_id, rules_in=obj_in)
    db.commit()
    
    return {"status": "success", "message": "Đã thiết lập cấu hình luật bốc câu hỏi từ ngân hàng câu hỏi"}

@router.get("/get-total-quizzes/{subject_id}")
def get_total_quizzes(
    db: SessionDep,
    subject_id: UUID
):
    return crud_quiz.get_total_quiz_by_subject(db, subject_id)

@router.get("/get-quizzes-list/{subject_id}", response_model=list[QuizItem])
async def get_quizzes_list(
    db: SessionDep,
    subject_id: UUID,
    search: str | None = Query(None, description="Từ khóa tìm kiếm theo tiêu đề bài thi"),
    current_user: dict = Depends(get_current_user_role)
):
    # Logic kiểm tra quyền sở hữu vẫn giữ nguyên
    owner_id = await get_owner(subject_id)
    if UUID(current_user["user_id"]) != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xem danh sách bài thi của môn học này"
        )  

    # Truyền thêm tham số search vào hàm CRUD đã cập nhật
    result = crud_quiz.get_multi_by_subject(db, subject_id, search=search)
    return result