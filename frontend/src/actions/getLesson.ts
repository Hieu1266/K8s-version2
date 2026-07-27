"use server";

import { cookies } from "next/headers";
import { LessonStatus } from "@/types/statuses";

const LEARNING_PROGRESS_URL = process.env.NEXT_PUBLIC_PROGRESS_BACKEND_URL;

async function getServerToken(): Promise<string> {
    const cookieStore = await cookies();
    const tokenObj = cookieStore.get("token");
    const token = tokenObj ? tokenObj.value : "";

    if (!token || token === 'undefined' || token === 'null') {
        return "";
    }
    return token.trim().replace(/^"|"$/g, "");
}

export async function fetchLessonStatus(lessonId: string): Promise<LessonStatus> {
    if (!lessonId) return LessonStatus.LOCKED;

    try {
        const token = await getServerToken();
        const baseUrl = LEARNING_PROGRESS_URL || "http://localhost:8000";

        const response = await fetch(`${baseUrl}/lesson_progress/get-status/${lessonId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            cache: "no-store",
        });

        if (!response.ok) return LessonStatus.LOCKED;

        const data = await response.json();
        const rawStatus = String(typeof data === "object" ? data?.status : data).toUpperCase().trim();

        if (rawStatus === "COMPLETED") return LessonStatus.COMPLETED;

        // Ánh xạ cả UNLOCKED và IN_PROGRESS của Backend về IN_PROGRESS của Frontend
        if (rawStatus === "UNLOCKED" || rawStatus === "IN_PROGRESS") {
            return LessonStatus.IN_PROGRESS;
        }

        return LessonStatus.LOCKED;
    } catch (error) {
        console.error(`Lỗi fetchLessonStatus cho ${lessonId}:`, error);
        return LessonStatus.LOCKED;
    }
}
/**
 * Đính kèm status vào danh sách bài học
 */
export async function attachStatusToLessons<T extends { lesson_id?: string; lessonId?: string }>(
    lessons: T[]
): Promise<(T & { status: LessonStatus })[]> {
    if (!lessons || !Array.isArray(lessons)) return [];

    const lessonsWithStatus = await Promise.all(
        lessons.map(async (lesson) => {
            // Ưu tiên lấy lesson_id từ schema LessonLearningStructure
            const targetId = lesson.lesson_id || lesson.lessonId;

            if (!targetId) {
                return { ...lesson, status: LessonStatus.LOCKED };
            }

            const status = await fetchLessonStatus(targetId);
            return {
                ...lesson,
                status: status,
            };
        })
    );

    return lessonsWithStatus;
}
export async function completeLessonAction(progressId: string) {
    try {
        const token = await getServerToken()

        const response = await fetch(
            `${process.env.NEXT_PUBLIC_PROGRESS_BACKEND_URL}/lesson_progress/lesson/${progressId}/complete`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.detail || 'Không thể đánh dấu hoàn thành bài học.',
            };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Lỗi kết nối tới hệ thống.',
        };
    }
}