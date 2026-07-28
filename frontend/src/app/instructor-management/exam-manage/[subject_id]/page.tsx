"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import QuestionPoolManager from "@/components/exam-management/QuestionPoolManager";
import CreateQuizDrawer from "@/components/exam-management/CreateQuizDrawer";
import EditQuizModal from "@/components/exam-management/EditQuizModal";
import {
  Quiz,
  // Question,
  // QuestionPool,
  QuizCreatePayload
} from "@/types/exam-management";
import { getQuizzesAction, createQuizAction, deleteQuizAction } from "@/actions/getQuizzes";

export default function SubjectDetailPage({
  params,
}: {
  params: Promise<{ subject_id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const subjectId = resolvedParams.subject_id;

  const [activeTab, setActiveTab] = useState<"QUIZZES" | "POOLS">("QUIZZES");

  // State quản lý mở Thanh trượt (Drawer) tạo mới
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // =========================================================================
  // MOCK DATA (Giữ nguyên)
  // =========================================================================
  const [subjectQuestions] = useState<Question[]>([
    { question_id: "q-101", subject_id: subjectId, question_title: "Tính đóng gói (Encapsulation) trong OOP là gì?", question_type: "MULTIPLE_CHOICE", max_points: 1.0 },
  ]);
  const [subjectPools] = useState<QuestionPool[]>([
    { pool_id: "p-01", title: "Kho câu hỏi Dễ", description: "Cơ bản", created_at: "2026-03-20", questions: [subjectQuestions[0]] },
  ]);

  // 🟢 HÀM FETCH API (Giữ nguyên logic)
  const fetchQuizzes = useCallback(async (searchQuery: string = "") => {
    setIsLoadingQuizzes(true);
    try {
      const data = await getQuizzesAction(subjectId, searchQuery);
      setQuizzes(data);
    } catch (error) {
      console.error("Lỗi khi tải danh sách bài thi:", error);
    } finally {
      setIsLoadingQuizzes(false);
    }
  }, [subjectId]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const handleDeleteQuiz = async (quizId: string, title: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa bài thi "${title}" không?`)) {
      const result = await deleteQuizAction(quizId, `/instructor-management/exam-manage/${subjectId}`);
      if (result.success) {
        setQuizzes((prev) => prev.filter((q) => q.quiz_id !== quizId));
      } else {
        alert(`Lỗi khi xóa bài thi: ${result.error}`);
      }
    }
  };

  const handleCreateQuizSuccess = async (newQuizData: any) => {
    const payload: QuizCreatePayload = {
      title: newQuizData.title,
      description: newQuizData.description,
      subject_id: subjectId,
      duration_minutes: newQuizData.duration_minutes,
      passing_score: newQuizData.passing_score,
      max_attempts: newQuizData.max_attempts,
      quiz_type: newQuizData.quiz_type,
      placement_type: newQuizData.placement_type,
      target_lesson_id: newQuizData.target_lesson_id || null,
      is_peer_review: newQuizData.is_peer_review,
    };

    const result = await createQuizAction(payload, `/instructor-management/exam-manage/${subjectId}`);
    if (result.success) {
      alert("Tạo bài kiểm tra mới thành công!");
      setIsCreateDrawerOpen(false); // Đóng Drawer
      await fetchQuizzes();
    } else {
      alert(`Lỗi khi tạo bài thi: ${result.error}`);
    }
  };

  const handleEditQuizSuccess = (updatedData: any) => {
    setQuizzes((prev) => prev.map((q) => q.quiz_id === editingQuiz?.quiz_id ? { ...q, ...updatedData } : q));
    setEditingQuiz(null);
    alert("Cập nhật bài thi thành công!");
  };

  const filteredQuizzes = quizzes.filter(
    (q) => q.title.toLowerCase().includes(searchTerm.toLowerCase()) || q.quiz_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Navbar />

      {/* Header Banner - Lược bỏ icon, giao diện tối giản hơn */}
      <section className="bg-white border-b border-slate-200 py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.push("/instructor-management/exam-manage")}
            className="text-sm font-medium text-slate-500 hover:text-slate-900 transition mb-4"
          >
            Quay lại danh sách môn học
          </button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">
                Môn học: {subjectId}
              </span>
              <h1 className="text-2xl font-semibold mt-2 text-slate-900">
                Quản lý Bài thi & Ngân hàng câu hỏi
              </h1>
            </div>

            {/* Nút Kích hoạt Drawer Tạo Quiz */}
            <button
              onClick={() => setIsCreateDrawerOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition"
            >
              Tạo bài thi mới
            </button>
          </div>

          {/* Navigation Tabs - Lược bỏ emoji */}
          <div className="flex gap-6 mt-8 border-b border-slate-200 pb-px">
            <button
              onClick={() => setActiveTab("QUIZZES")}
              className={`pb-3 text-sm font-medium transition border-b-2 ${activeTab === "QUIZZES"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              Danh sách Bài thi ({quizzes.length})
            </button>
            <button
              onClick={() => setActiveTab("POOLS")}
              className={`pb-3 text-sm font-medium transition border-b-2 ${activeTab === "POOLS"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              Kho câu hỏi ({subjectPools.length})
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "QUIZZES" ? (
          <div className="space-y-6">
            <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex">
              <input
                type="text"
                placeholder="Tìm kiếm bài thi theo tên hoặc mã..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 text-sm bg-transparent outline-none"
              />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs font-medium border-b border-slate-200">
                    <tr>
                      <th className="p-4 font-medium">Tên bài kiểm tra</th>
                      <th className="p-4 font-medium">Cấu hình</th>
                      <th className="p-4 font-medium">Thời lượng</th>
                      <th className="p-4 font-medium">Trạng thái</th>
                      <th className="p-4 font-medium text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingQuizzes ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">Đang tải dữ liệu...</td>
                      </tr>
                    ) : filteredQuizzes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">Không tìm thấy bài thi nào.</td>
                      </tr>
                    ) : (
                      filteredQuizzes.map((qz) => (
                        <tr key={qz.quiz_id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4">
                            <p className="font-medium text-slate-900">{qz.title}</p>
                            <span className="text-[11px] text-slate-500">Mã: {qz.quiz_id}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-slate-600">
                              {qz.quiz_type === "FIXED_QUESTION" ? "Đề cố định" : "Đề ngẫu nhiên"}
                            </span>
                          </td>
                          <td className="p-4 text-slate-600">
                            {qz.duration_minutes} phút
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${qz.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                              {qz.is_active ? "Hoạt động" : "Đã ẩn"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {/* Actions thay thế Icon bằng Text + Divider */}
                            <div className="flex items-center justify-end gap-3 text-sm">
                              <Link
                                href={`/instructor-management/exam-manage/${subjectId}/quiz/${qz.quiz_id}`}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Cấu hình
                              </Link>
                              <span className="text-slate-300">|</span>
                              <button
                                onClick={() => setEditingQuiz(qz)}
                                className="text-slate-600 hover:text-slate-900 font-medium"
                              >
                                Sửa
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                onClick={() => handleDeleteQuiz(qz.quiz_id, qz.title)}
                                className="text-red-600 hover:text-red-800 font-medium"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <QuestionPoolManager subjectId={subjectId} />
        )}
      </section>

      {/* DRAWER TẠO QUIZ MỚI (Thay cho Modal) */}
      <CreateQuizDrawer
        subjectId={subjectId}
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        subjectQuestions={subjectQuestions}
        subjectPools={subjectPools}
        onSuccess={handleCreateQuizSuccess}
      />

      <EditQuizModal
        quiz={editingQuiz}
        onClose={() => setEditingQuiz(null)}
        onSuccess={handleEditQuizSuccess}
      />
    </div>
  );
}