from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from app.api.v1.deps import SessionDep
from app.core.security import RoleChecker
from app.crud import peer_review as crud_peer_review
from app.models.enum import ReviewStatus
from app.models.quiz import Quiz
from app.schemas.peer_review import (
    AssignmentDetailOut,
    MyAssignmentOut,
    SubmitEvaluationIn,
    SubmitEvaluationOut,
)

router = APIRouter(prefix="/peer-reviews", tags=["Peer Review"])
require_reviewer = RoleChecker(["User"])


@router.get("/my-assignments", response_model=list[MyAssignmentOut])
def list_my_assignments(
    db: SessionDep,
    current_user: dict = Depends(require_reviewer),
    review_status: Optional[ReviewStatus] = Query(default=None, alias="status"),
    quiz_id: Optional[UUID] = Query(default=None),
):
    """Danh sách các bài được giao cho học viên hiện tại chấm chéo."""
    reviewer_id = UUID(current_user["user_id"])
    return crud_peer_review.get_my_assignments(db, reviewer_id, review_status, quiz_id)


@router.get("/assignments/{assignment_id}", response_model=AssignmentDetailOut)
def get_assignment_detail(
    assignment_id: UUID,
    db: SessionDep,
    current_user: dict = Depends(require_reviewer),
):
    """Chi tiết một lượt chấm: câu trả lời tự luận cần chấm kèm rubric tương ứng."""
    reviewer_id = UUID(current_user["user_id"])
    assignment = crud_peer_review.get_assignment_for_reviewer(db, assignment_id, reviewer_id)
    quiz = db.get(Quiz, assignment.quiz_id)
    answers = crud_peer_review.get_essay_answers_with_rubric(db, assignment.submission_id)

    return AssignmentDetailOut(
        assignment_id=assignment.assignment_id,
        quiz_id=assignment.quiz_id,
        submission_id=assignment.submission_id,
        status=assignment.status,
        final_score_given=assignment.final_score_given,
        assigned_at=assignment.assigned_at,
        completed_at=assignment.completed_at,
        quiz_title=quiz.title if quiz else "",
        general_comment=assignment.general_comment,
        answers=answers,
    )


@router.post("/assignments/{assignment_id}/submit", response_model=SubmitEvaluationOut)
async def submit_evaluation(
    assignment_id: UUID,
    payload: SubmitEvaluationIn,
    db: SessionDep,
    current_user: dict = Depends(require_reviewer),
):
    """Học viên nộp kết quả chấm chéo (điểm + nhận xét theo từng tiêu chí) cho một bài được giao."""
    reviewer_id = UUID(current_user["user_id"])
    assignment = crud_peer_review.get_assignment_for_reviewer(db, assignment_id, reviewer_id)

    assignment, evaluations, submission_result = await crud_peer_review.submit_evaluation(
        db, assignment, payload.evaluations, payload.general_comment
    )

    return SubmitEvaluationOut(
        assignment_id=assignment.assignment_id,
        status=assignment.status,
        final_score_given=assignment.final_score_given,
        general_comment=assignment.general_comment,
        completed_at=assignment.completed_at,
        evaluations=evaluations,
        submission_fully_reviewed=submission_result["fully_reviewed"],
        submission_peer_avg_score=submission_result["peer_avg_score"],
        submission_is_discrepant=submission_result["is_discrepant"],
    )
