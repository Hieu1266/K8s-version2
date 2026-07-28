export type SubjectStatus =
  | "SUBJECT_ACTIVE"
  | "SUBJECT_DEVELOPING"
  | "SUBJECT_SUSPENDED";

// 💥 Cập nhật thêm TRUE_FALSE tại đây
export type QuestionTypeEnum = "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE";

export interface SubjectInfo {
  subject_id: string; // uuid (Khóa chính)
  course_id?: string; // uuid (Khóa ngoại)
  title: string; // Tên môn học
  code?: string; // Mã môn học
  description?: string;
  instructor?: string;
  image?: string;
  order_index?: number;
  status_id: SubjectStatus;
  totalModules?: number;
  totalQuestions?: number;
}

export interface QuestionOption {
  option_id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
}

export interface Question {
  question_id: string;
  subject_id: string;
  question_type: QuestionTypeEnum; // Sẽ bao gồm cả "TRUE_FALSE"
  question_title?: string;
  content: string;
  max_points: number;
  options?: QuestionOption[];
}