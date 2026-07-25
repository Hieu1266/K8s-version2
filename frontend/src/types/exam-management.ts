export type SubjectStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED"; // Khớp với SubjectStatus Enum ở backend

export interface Subject {
  subject_id: string; // UUID từ backend
  course_id: string; // UUID của khóa học
  title: string; // Tương ứng với title trong SQLModel
  description: string; // Tương ứng với description trong SQLModel
  order_index: number; // Thứ tự môn học
  status_id: SubjectStatus; // Trạng thái môn học

  // Thông tin mở rộng (Response từ API JOIN)
  course_title?: string; // Tên khóa học chứa môn này
  total_modules?: number; // Số lượng module thuộc môn
  total_quizzes?: number; // Số bài kiểm tra
}

export type QuizType = "FIXED_QUESTION" | "RANDOM_QUESTION";

export type QuizPlacementType = "STANDALONE_LESSON" | "IN_VIDEO" | "IN_LESSON";

export interface Quiz {
  quiz_id: string; // UUID
  subject_id: string; // UUID
  title: string;
  description?: string;
  duration_minutes: number;
  passing_score: number;
  max_attempts: number;
  quiz_type: QuizType;
  placement_type: QuizPlacementType;
  target_lesson_id?: string;
  is_active: boolean;
  is_peer_review: boolean;
  created_at: string; // YYYY-MM-DD
}

export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "ESSAY"
  | "SHORT_ANSWER";

export interface QuestionOption {
  option_id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
}

export interface Question {
  question_id: string; // UUID
  subject_id: string; // UUID
  question_title: string;
  question_type: QuestionType;
  body_content?: string;
  max_points: number;
  options?: QuestionOption[];
}

export interface QuestionPool {
  pool_id: string; // UUID
  title: string;
  description?: string;
  created_at: string;
  questions?: Question[]; // Danh sách các câu hỏi thuộc Pool (thông qua QuestionPoolLink)
}

export interface CreateQuizInput {
  title: string;
  description?: string;
  duration_minutes: number;
  passing_score: number;
  max_attempts: number;
  quiz_type: "FIXED_QUESTION" | "RANDOM_QUESTION";
  placement_type: "STANDALONE_LESSON" | "IN_VIDEO" | "IN_LESSON";
  is_active: boolean;
  is_peer_review: boolean;

  // Dành cho FIXED_QUESTION -> Chứa danh sách Question IDs đã chọn
  selected_question_ids?: string[];

  // Dành cho RANDOM_QUESTION -> Chứa các Rule chọn Pool & Số lượng
  pool_rules?: {
    pool_id: string;
    quantity: number;
  }[];
}
