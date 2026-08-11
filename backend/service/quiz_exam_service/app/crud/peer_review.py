from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.enum import QuestionType, ReviewStatus, SubmissionStatus
from app.models.peer_review_assignments import PeerReviewAssignment
from app.models.peer_review_evaluations import PeerReviewEvaluation
from app.models.question import Question
from app.models.quiz_submission import QuizSubmission
from app.models.rubric_criteria import RubricCriteria
from app.models.submission_detail import SubmissionDetail

# Ngưỡng lệch điểm (max - min) giữa các reviewer để coi là "lệch điểm nghiêm trọng".
# TODO: xác nhận lại với nghiệp vụ, tạm để dạng hằng số cho dễ chỉnh.
DISCREPANCY_THRESHOLD = 5.0


# ---------------------------------------------------------------------------
# Truy vấn danh sách / chi tiết assignment của reviewer
# ---------------------------------------------------------------------------
def get_my_assignments(
    db: Session,
    reviewer_id: UUID,
    status_filter: Optional[ReviewStatus] = None,
    quiz_id: Optional[UUID] = None,
) -> List[PeerReviewAssignment]:
    stmt = select(PeerReviewAssignment).where(PeerReviewAssignment.reviewer_id == reviewer_id)
    if status_filter is not None:
        stmt = stmt.where(PeerReviewAssignment.status == status_filter)
    if quiz_id is not None:
        stmt = stmt.where(PeerReviewAssignment.quiz_id == quiz_id)
    stmt = stmt.order_by(PeerReviewAssignment.assigned_at.desc())
    return list(db.exec(stmt).all())


def get_assignment_for_reviewer(
    db: Session, assignment_id: UUID, reviewer_id: UUID
) -> PeerReviewAssignment:
    assignment = db.get(PeerReviewAssignment, assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lượt phân công chấm chéo",
        )
    if assignment.reviewer_id != reviewer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập lượt chấm chéo này",
        )
    return assignment


def get_essay_answers_with_rubric(db: Session, submission_id: UUID) -> List[dict]:
    """Lấy các câu trả lời tự luận (ESSAY) của bài nộp, kèm rubric của từng câu."""
    stmt = (
        select(SubmissionDetail, Question)
        .join(Question, SubmissionDetail.question_id == Question.question_id)
        .where(SubmissionDetail.submission_id == submission_id)
        .where(Question.question_type == QuestionType.ESSAY)
    )
    rows = db.exec(stmt).all()

    results: List[dict] = []
    for detail, question in rows:
        criteria_stmt = select(RubricCriteria).where(
            RubricCriteria.question_id == question.question_id
        )
        criterias = list(db.exec(criteria_stmt).all())
        results.append(
            {
                "question_id": question.question_id,
                "question_title": question.question_title,
                "body_content": question.body_content,
                "max_points": question.max_points,
                "essay_answer_text": detail.essay_answer_text,
                "graph_image_url": detail.graph_image_url,
                "graph_json_data": detail.graph_json_data,
                "video_trigger_seconds": detail.video_trigger_seconds,
                "rubric_criterias": criterias,
            }
        )
    return results


def _get_valid_criteria_ids(db: Session, submission_id: UUID) -> set[UUID]:
    stmt = (
        select(RubricCriteria.criteria_id)
        .join(Question, RubricCriteria.question_id == Question.question_id)
        .join(SubmissionDetail, SubmissionDetail.question_id == Question.question_id)
        .where(SubmissionDetail.submission_id == submission_id)
        .where(Question.question_type == QuestionType.ESSAY)
    )
    return set(db.exec(stmt).all())


# ---------------------------------------------------------------------------
# Nộp kết quả chấm chéo
# ---------------------------------------------------------------------------
def submit_evaluation(
    db: Session,
    assignment: PeerReviewAssignment,
    evaluations_in: list,
    general_comment: Optional[str],
) -> tuple[PeerReviewAssignment, List[PeerReviewEvaluation], dict]:
    if assignment.status == ReviewStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lượt chấm chéo này đã được hoàn thành trước đó",
        )
    if assignment.status == ReviewStatus.SKIPPED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lượt chấm chéo này đã bị bỏ qua, không thể nộp đánh giá",
        )

    valid_criteria_ids = _get_valid_criteria_ids(db, assignment.submission_id)
    if not valid_criteria_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bài nộp này không có tiêu chí chấm (rubric) nào để đánh giá",
        )

    submitted_ids = set()
    for item in evaluations_in:
        if item.criteria_id not in valid_criteria_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tiêu chí {item.criteria_id} không thuộc bài nộp này",
            )
        if item.criteria_id in submitted_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tiêu chí {item.criteria_id} bị chấm trùng lặp",
            )
        submitted_ids.add(item.criteria_id)

    if submitted_ids != valid_criteria_ids:
        missing = valid_criteria_ids - submitted_ids
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cần chấm đầy đủ tất cả tiêu chí của bài nộp. Còn thiếu: {missing}",
        )

    criteria_map = {
        c.criteria_id: c
        for c in db.exec(
            select(RubricCriteria).where(RubricCriteria.criteria_id.in_(valid_criteria_ids))
        ).all()
    }

    final_score = 0.0
    evaluation_objs: List[PeerReviewEvaluation] = []
    for item in evaluations_in:
        criteria = criteria_map[item.criteria_id]
        final_score += item.score * (criteria.percentage / 100)

        eval_obj = PeerReviewEvaluation(
            assignment_id=assignment.assignment_id,
            criteria_id=item.criteria_id,
            score=item.score,
            feedback=item.feedback,
        )
        db.add(eval_obj)
        evaluation_objs.append(eval_obj)

    assignment.final_score_given = round(final_score, 2)
    assignment.general_comment = general_comment
    assignment.status = ReviewStatus.COMPLETED
    assignment.completed_at = datetime.utcnow()
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    for eval_obj in evaluation_objs:
        db.refresh(eval_obj)

    submission_result = _try_finalize_submission(db, assignment.submission_id)
    return assignment, evaluation_objs, submission_result


def _try_finalize_submission(db: Session, submission_id: UUID) -> dict:
    """Cập nhật completed_review_count; khi TẤT CẢ assignment đã COMPLETED thì
    tính peer_avg_score / is_discrepant, và tự động chốt total_score nếu lệch điểm
    vượt ngưỡng. Nếu không lệch điểm, để trống total_score chờ giảng viên chấm
    (nằm ngoài phạm vi API này)."""
    submission = db.get(QuizSubmission, submission_id)

    all_assignments = list(
        db.exec(
            select(PeerReviewAssignment).where(
                PeerReviewAssignment.submission_id == submission_id
            )
        ).all()
    )
    completed = [a for a in all_assignments if a.status == ReviewStatus.COMPLETED]

    submission.completed_review_count = len(completed)

    fully_reviewed = len(all_assignments) > 0 and len(completed) == len(all_assignments)

    if fully_reviewed:
        scores = [a.final_score_given for a in completed if a.final_score_given is not None]
        peer_avg = round(sum(scores) / len(scores), 2)
        is_discrepant = (max(scores) - min(scores)) > DISCREPANCY_THRESHOLD if len(scores) > 1 else False

        submission.peer_avg_score = peer_avg
        submission.is_discrepant = is_discrepant

        if is_discrepant:
            submission.total_score = peer_avg
            submission.graded_at = datetime.utcnow()
            submission.status = SubmissionStatus.GRADED
        # else: chờ giảng viên tự chấm (endpoint chấm của giảng viên nằm ngoài phạm vi hiện tại)

    db.add(submission)
    db.commit()
    db.refresh(submission)

    return {
        "fully_reviewed": fully_reviewed,
        "peer_avg_score": submission.peer_avg_score,
        "is_discrepant": submission.is_discrepant,
    }
