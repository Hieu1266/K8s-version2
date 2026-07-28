"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { Quiz, QuizCreatePayload } from "@/types/exam-management";

async function getServerToken() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || "";
    return token.trim().replace(/^"|"$/g, "");
}

const EXAM_QUIZ_URL = process.env.NEXT_PUBLIC_EXAM_BACKEND_URL;

// 1. Lấy danh sách quiz theo subject (đã có sẵn, giữ nguyên hành vi)
export const getQuizzesAction = async (
    subjectId: string,
    search: string = ""
): Promise<Quiz[]> => {
    try {
        const queryParam = search ? `?search=${encodeURIComponent(search)}` : "";
        const url = `${EXAM_QUIZ_URL}/quizzes/get-quizzes-list/${subjectId}${queryParam}`;

        const token = await getServerToken();

        const res = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        });

        if (!res.ok) {
            if (res.status === 403) throw new Error("Bạn không có quyền truy cập.");
            throw new Error(`Lỗi gọi API: ${res.status}`);
        }

        return await res.json();
    } catch (error) {
        console.error("Fetch Error:", error);
        throw error;
    }
};

// 2. 🆕 Tạo mới đề thi (khung ban đầu)
// Lưu ý: Backend trả về { status, message, data: { quiz_id, title, quiz_type, created_at } }
// (KHÔNG phải đầy đủ object Quiz) -> nên gọi lại getQuizzesAction để làm mới danh sách sau khi tạo,
// thay vì cố ghép trực tiếp response này vào state Quiz[] ở FE.
export const createQuizAction = async (
    payload: QuizCreatePayload,
    pathForRevalidation?: string
): Promise<{ success: boolean; quizId?: string; error?: string }> => {
    try {
        const token = await getServerToken();
        const res = await fetch(`${EXAM_QUIZ_URL}/quizzes/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const detail = typeof err?.detail === "string" ? err.detail : "Tạo đề thi thất bại.";
            return { success: false, error: detail };
        }

        const data = await res.json();
        if (pathForRevalidation) revalidatePath(pathForRevalidation);
        return { success: true, quizId: data?.data?.quiz_id };
    } catch (error: any) {
        console.error("❌ Lỗi tại createQuizAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
};

// 3. 🆕 Xóa đề thi
export const deleteQuizAction = async (
    quizId: string,
    pathForRevalidation?: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const token = await getServerToken();
        const res = await fetch(`${EXAM_QUIZ_URL}/quizzes/${quizId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!res.ok && res.status !== 204) {
            const err = await res.json().catch(() => ({}));
            const detail = typeof err?.detail === "string" ? err.detail : "Xóa đề thi thất bại.";
            return { success: false, error: detail };
        }

        if (pathForRevalidation) revalidatePath(pathForRevalidation);
        return { success: true };
    } catch (error: any) {
        console.error("❌ Lỗi tại deleteQuizAction:", error.message);
        return { success: false, error: error.message || "Lỗi kết nối máy chủ." };
    }
};