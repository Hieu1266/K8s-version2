'use server';

import { cookies } from 'next/headers';
import {
    QuizTakeResponse,
    SubmissionDetailUpdatePayload,
    SubmissionDetailUpdateResponse,
    QuizSubmitResponse,
    QuizSubmissionStatusResponse,
    QuizStatusActionResult
} from '@/types/quiz-submission';

const BASE_URL = process.env.NEXT_PUBLIC_EXAM_BACKEND_URL;

/**
 * Lấy Bearer Token từ Cookies
 */
async function getAuthHeader(): Promise<Record<string, string>> {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || cookieStore.get('access_token')?.value;

    if (!token) {
        throw new Error('Chưa đăng nhập hoặc phiên làm việc đã hết hạn.');
    }

    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

/**
 * 1. Bắt đầu bài thi dựa trên lesson_id
 */
export async function startQuizSubmissionAction(
    lessonId: string
): Promise<{ success: boolean; data?: QuizTakeResponse; error?: string }> {
    try {
        const headers = await getAuthHeader();
        const res = await fetch(`${BASE_URL}/quiz-submissions/start/${lessonId}`, {
            method: 'POST',
            headers,
            cache: 'no-store',
        });

        const result = await res.json();
        if (!res.ok) {
            return { success: false, error: result.detail || 'Không thể khởi tạo bài thi' };
        }

        return { success: true, data: result };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối máy chủ' };
    }
}

/**
 * 2. Cập nhật câu trả lời (chọn đáp án trắc nghiệm hoặc nhập tự luận)
 */
export async function updateSubmissionDetailAction(
    detailId: string,
    payload: SubmissionDetailUpdatePayload
): Promise<{ success: boolean; data?: SubmissionDetailUpdateResponse; error?: string }> {
    try {
        const headers = await getAuthHeader();
        const res = await fetch(`${BASE_URL}/submission-details/${detailId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(payload),
            cache: 'no-store',
        });

        const result = await res.json();
        if (!res.ok) {
            return { success: false, error: result.detail || 'Không thể lưu câu trả lời' };
        }

        return { success: true, data: result };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối máy chủ' };
    }
}

/**
 * 3. Nộp bài thi và nhận kết quả chấm điểm
 */
export async function submitQuizAction(
    submissionId: string
): Promise<{ success: boolean; data?: QuizSubmitResponse; error?: string }> {
    try {
        const headers = await getAuthHeader();
        const res = await fetch(`${BASE_URL}/quiz-submissions/${submissionId}/submit`, {
            method: 'POST',
            headers,
            cache: 'no-store',
        });

        const result = await res.json();
        if (!res.ok) {
            return { success: false, error: result.detail || 'Nộp bài thất bại' };
        }

        return { success: true, data: result };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối máy chủ' };
    }
}

export async function getQuizStatusByLessonAction(lessonId: string): Promise<QuizStatusActionResult> {
    try {
        const headers = await getAuthHeader();

        const res = await fetch(`${BASE_URL}/quiz-submissions/lesson/${lessonId}`, {
            method: 'GET',
            headers,
            cache: 'no-store',
        });

        // 404 = chưa từng làm bài lần nào -> coi là trạng thái "null"
        if (res.status === 404) {
            return { success: true, data: null };
        }

        if (!res.ok) {
            const errBody = await res.json().catch(() => null);
            return { success: false, error: errBody?.detail || 'Không thể tải trạng thái bài thi.' };
        }

        const data: QuizSubmissionStatusResponse = await res.json();
        return { success: true, data };
    } catch (err) {
        return { success: false, error: 'Lỗi kết nối máy chủ.' };
    }
}

/**
 * 5. Chấm ngay 1 câu hỏi (dùng cho câu hỏi chèn giữa video - cần biết đúng/sai ngay
 * để quyết định có cho video chạy tiếp hay không). Cho phép gọi lại nhiều lần
 * nếu trả lời sai (backend không giới hạn số lần thử).
 */
export async function submitQuestionAction(
    detailId: string
): Promise<{ success: boolean; data?: { success: boolean; is_correct: boolean | null }; error?: string }> {
    try {
        // 🆕 SỬA LỖI: getAuthHeader() trả về object header (đã có sẵn "Authorization: Bearer ...."),
        // không phải chuỗi token thô - trước đây bị nối nhầm thành "Bearer [object Object]".
        const headers = await getAuthHeader();
        const res = await fetch(`${BASE_URL}/submission-details/submit-question/${detailId}`, {
            method: 'POST',
            headers, // 🆕 SỬA LỖI: header đúng chính tả 'Content-Type' (trước đây là 'Content-[#Type]')
            cache: 'no-store',
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { success: false, error: errorData.detail || 'Lỗi kiểm tra đáp án' };
        }

        const data = await res.json();
        return { success: true, data }; // data trả về { success: true, is_correct: boolean }
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối' };
    }
}