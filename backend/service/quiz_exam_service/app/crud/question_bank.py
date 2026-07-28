from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional

from app.models.question import Question
from app.models.question_option import QuestionOption
from app.models.rubric_criteria import RubricCriteria
from app.schemas.question_bank import QuestionCreate

class CRUDQuestionBank:
    def create(self, db: Session, obj_in: QuestionCreate) -> Question:
        print("\n==========================================", flush=True)
        print("🔥 [CRUD CREATE] ĐÃ VÀO HÀM CREATE", flush=True)
        print(f"-> Dữ liệu Pydantic parse được: {obj_in.model_dump()}", flush=True)

        # 1. Ép kiểu question_type về dạng String in hoa an toàn (chống lỗi Enum)
        raw_type = obj_in.question_type
        q_type_str = str(raw_type.value if hasattr(raw_type, "value") else raw_type).upper()
        print(f"-> Parsed Question Type: '{q_type_str}'", flush=True)

        # 2. Lấy danh sách Rubrics từ obj_in
        rubrics_list = getattr(obj_in, "rubrics", []) or []
        print(f"-> Số lượng Rubrics nhận được: {len(rubrics_list)}", flush=True)

        # 3. Tạo bản ghi Question
        db_question = Question(
            subject_id=obj_in.subject_id,
            question_title=obj_in.question_title or "",
            body_content=obj_in.body_content,
            question_type=q_type_str,
            max_points=obj_in.max_points or 10.0,
        )
        db.add(db_question)
        db.flush()  # Sinh ra question_id ngay để làm Khóa ngoại (Foreign Key)

        # 4. Lưu Rubric Criteria nếu là ESSAY hoặc nếu có Rubrics gửi lên
        if "ESSAY" in q_type_str or len(rubrics_list) > 0:
            print(f"🎯 [ESSAY MATCHED] Đang chèn {len(rubrics_list)} tiêu chí Rubric vào DB...", flush=True)
            for rub in rubrics_list:
                # Lấy giá trị an toàn (dù là object Pydantic hay dict)
                pct = float(getattr(rub, "percentage", 0) if hasattr(rub, "percentage") else rub.get("percentage", 0) or 0)
                pts = float(db_question.max_points or 10.0)
                calc_max_score = round((pct * pts) / 100.0, 2)

                rub_title = getattr(rub, "title", "") if hasattr(rub, "title") else rub.get("title", "")
                rub_desc = getattr(rub, "description", "") if hasattr(rub, "description") else rub.get("description", "")

                db_rubric = RubricCriteria(
                    question_id=db_question.question_id,
                    title=rub_title,
                    description=rub_desc or "",
                    max_score=calc_max_score,
                )
                db.add(db_rubric)
                print(f"   + Đã thêm Rubric: '{rub_title}' (Max score: {calc_max_score})", flush=True)

        db.commit()
        db.refresh(db_question)
        print("🎉 [HOÀN TẤT] Đã commit toàn bộ dữ liệu vào CSDL thành công!\n", flush=True)
        return db_question

crud_question_bank = CRUDQuestionBank()