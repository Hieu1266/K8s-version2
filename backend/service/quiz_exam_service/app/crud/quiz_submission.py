from app.crud.base import CRUDBase
from app.schemas.quiz_submission import QuizSubmissionCreate, QuizSubmissionUpdate
from app.models.quiz_submission import QuizSubmission
from sqlmodel import Session, select, func
from fastapi import HTTPException, status
from uuid import UUID
from typing import Optional
from app.models.enum import SubmissionStatus, QuestionType
from app.models.submission_detail import SubmissionDetail
from datetime import datetime

class CRUDQuizSubmission(CRUDBase[QuizSubmission, QuizSubmissionCreate, QuizSubmissionUpdate, UUID]):
    
    # Ghi đè hàm create để tự tính attempt_number và khởi tạo is_passed
    def create(self, db: Session, obj_in: QuizSubmissionCreate) -> QuizSubmission:
        # 1. Đếm số lần nộp bài (submission) hiện có của user đối với quiz này
        statement = select(func.count(self.model.submission_id)).where(
            self.model.quiz_id == obj_in.quiz_id,
            self.model.user_id == obj_in.user_id
        )
        current_attempts = db.exec(statement).one()
        
        # 2. Tự động điều chỉnh attempt_number cho lần làm bài mới nhất
        obj_in.attempt_number = current_attempts + 1
        
        # 3. Gọi lại hàm create nguyên bản của CRUDBase để lưu vào Database
        return super().create(db=db, obj_in=obj_in)

    # 🆕 Tìm submission đang làm dở (IN_PROGRESS) của user cho 1 quiz cụ thể.
    # Dùng để "resume" bài thi (đặc biệt là quiz IN_VIDEO): tránh việc user reload trang
    # hoặc rời bài học giữa chừng rồi quay lại bị tạo attempt_number mới / mất tiến trình.
    def get_in_progress_by_quiz_and_user(
        self, db: Session, quiz_id: UUID, user_id: UUID
    ) -> Optional[QuizSubmission]:
        statement = select(QuizSubmission).where(
            QuizSubmission.quiz_id == quiz_id,
            QuizSubmission.user_id == user_id,
            QuizSubmission.status == SubmissionStatus.IN_PROGRESS,
        ).order_by(QuizSubmission.attempt_number.desc())
        return db.exec(statement).first()

    def submit_and_evaluate(self, db: Session, submission_id: UUID) -> QuizSubmission:
        # 1. Lấy thông tin submission cùng các relationships (details -> question -> options)
        submission = self.get_by_id(db, submission_id)
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Không tìm thấy bài nộp"
            )

        if submission.status != SubmissionStatus.IN_PROGRESS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Bài thi này đã được nộp trước đó"
            )

        # 2. Kiểm tra xem trong đề thi có ít nhất 1 câu tự luận hay không
        has_essay = any(
            detail.question.question_type == QuestionType.ESSAY 
            for detail in submission.details
        )

        total_earned_score = 0.0
        total_quiz_max_score = 0.0

        # 3. Chấm điểm tự động cho các câu trắc nghiệm / đúng sai
        for detail in submission.details:
            q = detail.question
            max_p = q.max_points or 0.0
            total_quiz_max_score += max_p

            if q.question_type in (QuestionType.MULTIPLE_CHOICE, QuestionType.TRUE_FALSE):
                # Tìm đáp án đúng trong danh sách options của câu hỏi
                correct_option = next((opt for opt in q.options if opt.is_correct), None)
                
                # So sánh đáp án sinh viên chọn với đáp án đúng
                if correct_option and detail.selected_option_id == correct_option.option_id:
                    detail.score_earned = max_p
                    total_earned_score += max_p
                else:
                    detail.score_earned = 0.0

                db.add(detail)

        # 4. Cập nhật trạng thái bài thi & thuộc tính is_passed
        submission.submitted_at = datetime.utcnow()

        if has_essay:
            # Nếu có tự luận -> Cần chờ chấm điểm, chưa đạt is_passed ngay được
            submission.status = SubmissionStatus.SUBMITTED
            submission.total_score = None  # Chưa có điểm tổng chính thức
            submission.is_passed = False
        else:
            # Nếu toàn bộ là trắc nghiệm -> Đã chấm xong hoàn toàn
            submission.status = SubmissionStatus.GRADED
            submission.total_score = total_earned_score
            
            # Tính toán passing_score và cập nhật thuộc tính is_passed
            passing_percentage = (
                submission.quiz.passing_percentage 
                if (submission.quiz and submission.quiz.passing_percentage is not None) 
                else 0.0
            )
            
            passing_score = (passing_percentage / 100.0) * total_quiz_max_score
            submission.is_passed = total_earned_score >= passing_score

        db.add(submission)
        db.commit()
        db.refresh(submission)
        return submission

    def grade_essay_submission(self, db: Session, submission_id: UUID) -> QuizSubmission:
        """
        Hàm dùng khi Giảng viên chấm xong các câu tự luận, 
        cập nhật lại total_score, status sang GRADED và tính toán is_passed.
        """
        submission = self.get_by_id(db, submission_id)
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Không tìm thấy bài nộp"
            )

        total_earned_score = 0.0
        total_quiz_max_score = 0.0
        has_ungraded_essay = False

        for detail in submission.details:
            q = detail.question
            max_p = q.max_points or 0.0
            total_quiz_max_score += max_p

            if q.question_type == QuestionType.ESSAY:
                if detail.score_earned is None:
                    has_ungraded_essay = True
                else:
                    total_earned_score += detail.score_earned
            else:
                total_earned_score += (detail.score_earned or 0.0)

        # Nếu đã chấm hết tất cả các câu tự luận
        if not has_ungraded_essay:
            submission.status = SubmissionStatus.GRADED
            submission.total_score = total_earned_score

            passing_percentage = (
                submission.quiz.passing_percentage 
                if (submission.quiz and submission.quiz.passing_percentage is not None) 
                else 0.0
            )
            passing_score = (passing_percentage / 100.0) * total_quiz_max_score
            submission.is_passed = total_earned_score >= passing_score

            db.add(submission)
            db.commit()
            db.refresh(submission)

        return submission

    def get_by_quiz_and_user(self, db: Session, quiz_id: UUID, user_id: UUID) -> list[QuizSubmission]:
        statement = select(QuizSubmission).where(
            QuizSubmission.quiz_id == quiz_id,
            QuizSubmission.user_id == user_id
        )
        return db.exec(statement).all()

    def get_last_attemp_submitted(self, db: Session, quiz_id: UUID, user_id: UUID) -> Optional[QuizSubmission]:
        statement = select(QuizSubmission).where(
            QuizSubmission.quiz_id == quiz_id,
            QuizSubmission.user_id == user_id
        ).order_by(QuizSubmission.attempt_number.desc())
        return db.exec(statement).first()

    def submit_and_evaluate_detail(
        self,
        db: Session,
        detail_id: UUID,
        selected_option_id: Optional[UUID] = None,
        essay_answer_text: Optional[str] = None,
        graph_json_data: Optional[str] = None,
        graph_image_url: Optional[str] = None
    ) -> Optional[bool]:
        """
        Gửi/cập nhật đáp án cho 1 câu hỏi (SubmissionDetail), tính điểm 
        và cập nhật thuộc tính is_passed cho bài thi (QuizSubmission) liên quan.
        """
        statement = select(SubmissionDetail).where(SubmissionDetail.detail_id == detail_id)
        detail = db.exec(statement).first()

        if not detail:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Không tìm thấy chi tiết bài nộp"
            )

        question = detail.question
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Không tìm thấy thông tin câu hỏi"
            )

        # 1. Cập nhật dữ liệu bài làm của sinh viên vào SubmissionDetail
        if selected_option_id is not None:
            detail.selected_option_id = selected_option_id
        if essay_answer_text is not None:
            detail.essay_answer_text = essay_answer_text
        if graph_json_data is not None:
            detail.graph_json_data = graph_json_data
        if graph_image_url is not None:
            detail.graph_image_url = graph_image_url

        is_correct: Optional[bool] = None

        # 2. Kiểm tra đáp án tự động dựa trên QuestionType
        if question.question_type in (QuestionType.MULTIPLE_CHOICE, QuestionType.TRUE_FALSE):
            correct_option = next((opt for opt in question.options if opt.is_correct), None)
            
            if correct_option and detail.selected_option_id == correct_option.option_id:
                is_correct = True
                detail.score_earned = question.max_points or 0.0
            else:
                is_correct = False
                detail.score_earned = 0.0

        elif question.question_type == QuestionType.ESSAY:
            is_correct = None
            detail.score_earned = None

        db.add(detail)

        # 3. Cập nhật total_score và is_passed của bài thi cha (QuizSubmission)
        submission = detail.submission
        if submission:
            total_earned_score = 0.0
            total_quiz_max_score = 0.0
            has_ungraded_essay = False

            for d in submission.details:
                # Sử dụng điểm vừa cập nhật nếu đang duyệt tới detail hiện tại
                d_score = detail.score_earned if d.detail_id == detail.detail_id else d.score_earned
                q = d.question
                max_p = q.max_points or 0.0
                total_quiz_max_score += max_p

                if q.question_type == QuestionType.ESSAY:
                    if d_score is None:
                        has_ungraded_essay = True
                    else:
                        total_earned_score += d_score
                else:
                    total_earned_score += (d_score or 0.0)

            # Cập nhật is_passed nếu bài thi đã GRADED hoặc tất cả câu hỏi (kể cả tự luận) đã có điểm
            if submission.status == SubmissionStatus.GRADED or not has_ungraded_essay:
                passing_percentage = (
                    submission.quiz.passing_percentage 
                    if (submission.quiz and submission.quiz.passing_percentage is not None) 
                    else 0.0
                )
                passing_score = (passing_percentage / 100.0) * total_quiz_max_score
                
                submission.is_passed = total_earned_score >= passing_score

                # Nếu bài thi ở trạng thái GRADED, đồng bộ lại tổng điểm chính thức
                if submission.status == SubmissionStatus.GRADED:
                    submission.total_score = total_earned_score

                db.add(submission)

        db.commit()
        db.refresh(detail)

        return is_correct
crud_quiz_submission = CRUDQuizSubmission(QuizSubmission)