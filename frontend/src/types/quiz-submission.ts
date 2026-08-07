import { SubmissionStatus } from "./statuses";

export enum QuestionType {
    MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
    ESSAY = "ESSAY",
    TRUE_FALSE = "TRUE_FALSE",
}

export interface QuestionOption {
    option_id: string;
    option_text: string;
}

export interface QuizQuestion {
    detail_id: string;
    question_id: string;
    question_title: string;
    question_type: QuestionType;
    body_content: string | null;
    max_points: number;
    options: QuestionOption[];
    // 🆕 Mốc giây trong video mà câu hỏi này được kích hoạt (null nếu quiz không phải IN_VIDEO)
    video_trigger_seconds?: number | null;
    // 🆕 Dùng khi resume submission IN_PROGRESS đang dang dở (vd load lại trang giữa video)
    selected_option_id?: string | null;
    // 🆕 true/false nếu câu đã được chấm, null nếu chưa trả lời hoặc là ESSAY
    is_answered_correct?: boolean | null;
}

export interface QuizTakeResponse {
    submission_id: string;
    quiz_id: string;
    title: string;
    quiz_type: string;
    attempt_number: number;
    questions: QuizQuestion[];
}

export interface SubmissionDetailUpdatePayload {
    selected_option_id?: string | null;
    essay_answer_text?: string | null;
}

export interface SubmissionDetailUpdateResponse {
    message: string;
    detail_id: string;
    selected_option_id: string | null;
    essay_answer_text: string | null;
}

export interface QuizSubmitResponse {
    message: string;
    submission_id: string;
    status: string;
    is_passed: boolean;
    total_score: number;
    next_lesson_unlocked: boolean;
}

export interface SubmissionStatusOption {
    option_id: string;
    option_text: string;
    is_correct?: boolean | null; // Chỉ có khi status = GRADED
}

export interface SubmissionStatusDetail {
    detail_id: string;
    question_id: string;
    question_title: string;
    question_type: QuestionType;
    video_trigger_seconds?: number | null; // 🆕
    body_content?: string | null;
    max_points?: number | null;
    options: SubmissionStatusOption[];
    selected_option_id?: string | null;
    essay_answer_text?: string | null;
    graph_json_data?: string | null;
    graph_image_url?: string | null;
    score_earned?: number | null;     // Chỉ có khi status = GRADED
    teacher_feedback?: string | null; // Chỉ có khi status = GRADED
}

export interface QuizSubmissionStatusResponse {
    submission_id: string;
    quiz_id: string;
    title?: string | null;
    quiz_type?: string | null;
    status: SubmissionStatus;
    attempt_number: number;
    started_at: string;
    total_score?: number | null;
    is_passed?: boolean | null;
    questions: SubmissionStatusDetail[];
}

export interface QuizStatusActionResult {
    success: boolean;
    data?: QuizSubmissionStatusResponse | null; // null nghĩa là chưa từng làm bài
    error?: string;
}