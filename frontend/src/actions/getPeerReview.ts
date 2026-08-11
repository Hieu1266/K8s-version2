'use server';

import { cookies } from 'next/headers';
import {
    MyAssignment,
    AssignmentDetail,
    SubmitEvaluationPayload,
    SubmitEvaluationResponse,
    ReviewStatus,
} from '@/types/peer-review';

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
 * 1. Danh sách các bài được giao cho học viên hiện tại chấm chéo
 */
export async function getMyPeerReviewAssignmentsAction(
    quizId?: string,
    reviewStatus?: ReviewStatus
): Promise<{ success: boolean; data?: MyAssignment[]; error?: string }> {
    try {
        const headers = await getAuthHeader();

        const params = new URLSearchParams();
        if (quizId) params.set('quiz_id', quizId);
        if (reviewStatus) params.set('status', reviewStatus);
        const query = params.toString() ? `?${params.toString()}` : '';

        const res = await fetch(`${BASE_URL}/peer-reviews/my-assignments${query}`, {
            method: 'GET',
            headers,
            cache: 'no-store',
        });

        const result = await res.json();
        if (!res.ok) {
            return { success: false, error: result.detail || 'Không thể tải danh sách bài chấm chéo' };
        }

        return { success: true, data: result };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối máy chủ' };
    }
}

/**
 * 2. Chi tiết một lượt chấm: câu trả lời tự luận cần chấm kèm rubric
 */
export async function getPeerReviewAssignmentDetailAction(
    assignmentId: string
): Promise<{ success: boolean; data?: AssignmentDetail; error?: string }> {
    try {
        const headers = await getAuthHeader();
        const res = await fetch(`${BASE_URL}/peer-reviews/assignments/${assignmentId}`, {
            method: 'GET',
            headers,
            cache: 'no-store',
        });

        const result = await res.json();
        if (!res.ok) {
            return { success: false, error: result.detail || 'Không thể tải chi tiết bài chấm chéo' };
        }

        return { success: true, data: result };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối máy chủ' };
    }
}

/**
 * 3. Nộp kết quả chấm chéo (điểm + nhận xét theo từng tiêu chí)
 */
export async function submitPeerReviewEvaluationAction(
    assignmentId: string,
    payload: SubmitEvaluationPayload
): Promise<{ success: boolean; data?: SubmitEvaluationResponse; error?: string }> {
    try {
        const headers = await getAuthHeader();
        const res = await fetch(`${BASE_URL}/peer-reviews/assignments/${assignmentId}/submit`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            cache: 'no-store',
        });

        const result = await res.json();
        if (!res.ok) {
            return { success: false, error: result.detail || 'Nộp kết quả chấm chéo thất bại' };
        }

        return { success: true, data: result };
    } catch (err: any) {
        return { success: false, error: err.message || 'Lỗi kết nối máy chủ' };
    }
}