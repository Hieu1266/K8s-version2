"use server";

import { Question, SubjectInfo, QuestionTypeEnum } from "@/types/questions-bank";
import { cookies } from "next/headers";

const COURSE_API_URL = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL;

const EXAM_QUIZ_URL = process.env.NEXT_PUBLIC_EXAM_BACKEND_URL;

// Lấy Header xác thực bằng Cookie
async function getAuthHeaders(customToken?: string) {
  let token = customToken;

  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get("access_token")?.value || cookieStore.get("token")?.value || "";
  }

  if (token) {
    token = token.replace(/^"|"/g, '').trim();
  }

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function mapQuestion(raw: any): Question {
  return {
    question_id: raw.question_id,
    subject_id: raw.subject_id,
    question_type: raw.question_type as QuestionTypeEnum,
    question_title: raw.question_title ?? "",
    content: raw.content ?? raw.body_content ?? "",
    max_points: raw.max_points ?? 0,
    options: raw.options ?? [],
  };
}

export async function getSubjectDetailAction(
  subjectId: string,
  token?: string
): Promise<SubjectInfo | null> {
  try {
    const headers = await getAuthHeaders(token);
    const res = await fetch(`${COURSE_API_URL}/subjects/${subjectId}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = await res.json();

    let totalModules = data.totalModules ?? 0;
    try {
      const modRes = await fetch(`${COURSE_API_URL}/modules/get-list/${subjectId}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (modRes.ok) {
        const modules = await modRes.json();
        if (Array.isArray(modules)) totalModules = modules.length;
      }
    } catch (e) { }

    return {
      subject_id: data.subject_id,
      course_id: data.course_id,
      title: data.title,
      code: data.code,
      description: data.description,
      instructor: data.instructor,
      image: data.image,
      order_index: data.order_index,
      status_id: data.status_id,
      totalModules,
    };
  } catch (error) {
    return null;
  }
}

export async function getQuestionsBySubjectAction(
  subjectId: string,
  token?: string
): Promise<Question[] | null> {
  try {
    const headers = await getAuthHeaders(token);
    const res = await fetch(`${EXAM_QUIZ_URL}/questions/get-list/${subjectId}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map(mapQuestion);
  } catch (error) {
    return null;
  }
}

export async function saveQuestionAction(
  question: Question,
  token?: string
): Promise<{ success: boolean; error?: string; data?: Question }> {
  try {
    const isUpdate = Boolean(question.question_id);
    const url = isUpdate
      ? `${EXAM_QUIZ_URL}/questions/${question.question_id}`
      : `${EXAM_QUIZ_URL}/questions/`;

    const method = isUpdate ? "PATCH" : "POST";

    // Build Body chuẩn theo Swagger
    const body: Record<string, any> = {
      question_title: question.question_title ?? "",
      body_content: question.content,
      max_points: question.max_points,
    };

    if (!isUpdate) {
      body.subject_id = question.subject_id;
      body.question_type = question.question_type;
    }

    const headers = await getAuthHeaders(token);

    const res = await fetch(url, {
      method,
      headers,
      // CHÚ Ý CHỖ NÀY: Bọc toàn bộ vào object { question: ... }
      body: JSON.stringify({ question: body }),
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { success: false, error: errText || `Lỗi ${res.status}` };
    }

    const data = await res.json().catch(() => null);
    return {
      success: true,
      data: data && typeof data === "object" ? mapQuestion(data) : undefined,
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Lỗi không xác định" };
  }
}