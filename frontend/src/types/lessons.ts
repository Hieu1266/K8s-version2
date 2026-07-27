import { Quiz } from "./quizzes";
import { VideoCheckpointQuestion } from "./progresses";
import { LessonStatus } from "./statuses";

export interface LessonResource {
    resourceId: string;
    lessonId: string;
    fileName: string;
    filePath: string;
    fileExtension: string; // pdf, zip, docx...
}

export interface Lesson {
    lessonId: string;
    moduleId: string;
    title: string;
    videoUrl?: string; // có giá trị => bài giảng dạng VIDEO; để trống => bài giảng dạng ĐỌC (reading)
    durationMinutes: number;
    contentBody?: string; // với bài giảng đọc: đây là toàn bộ nội dung; với bài giảng video: là phần tóm tắt/ghi chú kèm theo
    orderIndex: number;
    isOptional: boolean;
    resources: LessonResource[];
    quiz?: Quiz; // bài kiểm tra gắn trong bài học (placementType: INSIDE_LESSON), nếu có
    videoCheckpoints?: VideoCheckpointQuestion[]; // câu hỏi kiểm tra chèn vào giữa video, nếu là bài giảng VIDEO
}

export interface LessonLearningStructure {
    title: string;
    lesson_id: string;
    video_url?: string | null;
    content_body?: string | null;
    duration_seconds: number;
    is_optional: boolean;
    is_quiz: boolean;
}

export interface LessonStatusResponse {
    lesson_id: string;
    status: LessonStatus; // LOCKED | IN_PROGRESS | COMPLETED
}
