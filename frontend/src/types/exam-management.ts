export type QuestionType = "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE";
export type QuizPlacementType = "STANDALONE_LESSON" | "INSIDE_LESSON" | "IN_VIDEO";
export type QuizType = "RANDOM_QUESTION" | "FIXED_QUESTION";

// Khớp với schema QuizItem (response của GET /quizzes/get-quizzes-list/{subject_id})
export interface Quiz {
  quiz_id: string;
  subject_id: string;
  title: string;
  description: string;
  duration_minutes: number;
  passing_score: number;
  max_attempts: number;
  quiz_type: QuizType;
  placement_type: QuizPlacementType;
  target_lesson_id?: string | null;
  is_active: boolean;
  created_at: string;
  is_peer_review: boolean;
}

// Khớp với schema QuizCreate (payload gửi lên POST /quizzes/)
export interface QuizCreatePayload {
  title: string;
  description: string;
  subject_id: string;
  duration_minutes: number;
  passing_score: number;
  max_attempts: number;
  quiz_type: QuizType;
  placement_type: QuizPlacementType;
  target_lesson_id?: string | null;
  is_peer_review: boolean;
}

// NOTE: Question/QuestionPool cho phần Ngân hàng câu hỏi chưa nằm trong phạm vi hiện tại
// (chưa có API tương ứng ở Backend) - sẽ bổ sung khi có endpoint.