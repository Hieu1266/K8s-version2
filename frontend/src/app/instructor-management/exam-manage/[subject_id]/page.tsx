"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import QuestionPoolManager from "@/components/exam-management/QuestionPoolManager";
import CreateQuizModal from "@/components/exam-management/CreateQuizModal";
import EditQuizModal from "@/components/exam-management/EditQuizModal"; // 1. Import EditQuizModal
import {
  Quiz,
  Question,
  QuestionPool,
  QuizType,
  QuizPlacementType,
} from "@/types/exam-management";

export default function SubjectDetailPage({
  params,
}: {
  params: Promise<{ subject_id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const subjectId = resolvedParams.subject_id;

  // Tab State: "QUIZZES" (Danh sách bài thi) | "POOLS" (Quản lý kho câu hỏi)
  const [activeTab, setActiveTab] = useState<"QUIZZES" | "POOLS">("QUIZZES");

  // State đóng/mở Modal Tạo Quiz mới
  const [isCreateQuizOpen, setIsCreateQuizOpen] = useState(false);

  // State lưu Quiz đang chọn để sửa (null nếu không sửa)
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  // Mock Ngân hàng câu hỏi thuộc Subject (dùng chung cho Pool & Create Quiz)
  const [subjectQuestions] = useState<Question[]>([
    {
      question_id: "q-101",
      subject_id: subjectId,
      question_title: "Tính đóng gói (Encapsulation) trong OOP là gì?",
      question_type: "MULTIPLE_CHOICE",
      max_points: 1.0,
    },
    {
      question_id: "q-102",
      subject_id: subjectId,
      question_title: "Phân biệt Interface và Abstract Class?",
      question_type: "ESSAY",
      max_points: 2.0,
    },
    {
      question_id: "q-103",
      subject_id: subjectId,
      question_title: "Giao thức TCP hoạt động ở tầng nào trong OSI?",
      question_type: "MULTIPLE_CHOICE",
      max_points: 1.0,
    },
  ]);

  // Mock Pools thuộc Subject
  const [subjectPools] = useState<QuestionPool[]>([
    {
      pool_id: "p-01",
      title: "Kho câu hỏi Dễ - Chương 1 & 2",
      description: "Các câu hỏi cơ bản dành cho bài kiểm tra 15 phút.",
      created_at: "2026-03-20",
      questions: [subjectQuestions[0]],
    },
    {
      pool_id: "p-02",
      title: "Kho câu hỏi Nâng cao - Mạng máy tính",
      description: "Các câu hỏi phân loại sinh viên giỏi.",
      created_at: "2026-03-22",
      questions: [subjectQuestions[1], subjectQuestions[2]],
    },
  ]);

  // Mock Danh sách Quizzes
  const [quizzes, setQuizzes] = useState<Quiz[]>([
    {
      quiz_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      subject_id: subjectId,
      title: "Bài kiểm tra Giữa kỳ - Lý thuyết",
      description: "Đánh giá tổng quan các chương đã học.",
      duration_minutes: 45,
      passing_score: 5.0,
      max_attempts: 2,
      quiz_type: "FIXED_QUESTION",
      placement_type: "STANDALONE_LESSON",
      is_active: true,
      is_peer_review: false,
      created_at: "2026-03-10",
    },
    {
      quiz_id: "e38ba00a-47bb-3261-9456-f901a1b2c368",
      subject_id: subjectId,
      title: "Quiz ôn tập ngẫu nhiên - Bài 3",
      description: "Tự động sinh đề từ ngân hàng câu hỏi.",
      duration_minutes: 15,
      passing_score: 8.0,
      max_attempts: 5,
      quiz_type: "RANDOM_QUESTION",
      placement_type: "IN_VIDEO",
      is_active: true,
      is_peer_review: false,
      created_at: "2026-03-15",
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");

  // Hàm xử lý Xóa Quiz
  const handleDeleteQuiz = (quizId: string, title: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa bài thi "${title}" không?`)) {
      setQuizzes((prev) => prev.filter((q) => q.quiz_id !== quizId));
      // Gọi API DELETE tại đây (vd: await deleteQuizApi(quizId))
    }
  };

  // Hàm xử lý Cập nhật Quiz sau khi Sửa thành công
  const handleEditQuizSuccess = (updatedData: any) => {
    setQuizzes((prev) =>
      prev.map((q) =>
        q.quiz_id === editingQuiz?.quiz_id ? { ...q, ...updatedData } : q,
      ),
    );
    setEditingQuiz(null);
    alert("Cập nhật bài thi thành công!");
  };

  // Handler khi submit form tạo Quiz thành công từ Modal
  const handleCreateQuizSuccess = (newQuizPayload: any) => {
    const newQuiz: Quiz = {
      quiz_id: crypto.randomUUID(),
      subject_id: subjectId,
      title: newQuizPayload.title,
      description: newQuizPayload.description,
      duration_minutes: newQuizPayload.duration_minutes,
      passing_score: newQuizPayload.passing_score,
      max_attempts: newQuizPayload.max_attempts,
      quiz_type: newQuizPayload.quiz_type,
      placement_type: newQuizPayload.placement_type,
      is_active: newQuizPayload.is_active,
      is_peer_review: newQuizPayload.is_peer_review,
      created_at: new Date().toISOString().split("T")[0],
    };

    setQuizzes([newQuiz, ...quizzes]);
    alert("Tạo bài kiểm tra mới thành công!");
  };

  const filteredQuizzes = quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.quiz_id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <Navbar />

      {/* Header Banner */}
      <section className="bg-gradient-to-r from-[#66CCFF] to-[#0066FF] text-white py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.push("/instructor-management/exam-manage")}
            className="flex items-center gap-2 text-sm font-bold text-white/80 hover:text-white transition mb-4"
          >
            ← Quay lại Danh sách Môn học
          </button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-xs font-mono bg-white/20 px-2.5 py-1 rounded-md text-blue-100 font-semibold">
                Subject ID: {subjectId}
              </span>
              <h1 className="text-3xl font-bold mt-2">
                Quản lý Đề thi & Ngân hàng Bài tập
              </h1>
            </div>

            {/* Nút Kích hoạt Modal Tạo Quiz */}
            <button
              onClick={() => setIsCreateQuizOpen(true)}
              className="px-5 py-3 bg-white text-[#0066FF] font-bold text-sm rounded-xl hover:bg-blue-50 shadow-md transition shrink-0"
            >
              ➕ Tạo bài kiểm tra mới
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-8 border-b border-white/20 pb-1">
            <button
              onClick={() => setActiveTab("QUIZZES")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === "QUIZZES"
                  ? "bg-white text-[#0066FF] shadow-sm"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              📝 Danh sách Bài thi ({quizzes.length})
            </button>
            <button
              onClick={() => setActiveTab("POOLS")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === "POOLS"
                  ? "bg-white text-[#0066FF] shadow-sm"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              📦 Quản lý Question Pools ({subjectPools.length})
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Render theo Tab */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "QUIZZES" ? (
          /* ================= TAB 1: DANH SÁCH QUIZZES ================= */
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
              <input
                type="text"
                placeholder="Tìm kiếm Quiz theo tên hoặc UUID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0066FF] outline-none"
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-500 uppercase text-[11px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4">Tên bài kiểm tra</th>
                      <th className="p-4">Cấu hình đề</th>
                      <th className="p-4">Thời lượng</th>
                      <th className="p-4">Điểm đạt</th>
                      <th className="p-4">Trạng thái</th>
                      <th className="p-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredQuizzes.map((qz) => (
                      <tr
                        key={qz.quiz_id}
                        className="hover:bg-slate-50/80 transition"
                      >
                        <td className="p-4">
                          <p className="font-bold text-slate-800">{qz.title}</p>
                          <span className="text-[10px] font-mono text-slate-400">
                            ID: {qz.quiz_id}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-bold ${
                              qz.quiz_type === "FIXED_QUESTION"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-purple-50 text-purple-700 border border-purple-200"
                            }`}
                          >
                            {qz.quiz_type === "FIXED_QUESTION"
                              ? "📌 Đề Cố định"
                              : "🔀 Đề Ngẫu nhiên"}
                          </span>
                        </td>
                        <td className="p-4 font-semibold">
                          {qz.duration_minutes} phút
                        </td>
                        <td className="p-4 font-bold text-emerald-600">
                          {qz.passing_score} / 10
                        </td>
                        <td className="p-4">
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              qz.is_active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {qz.is_active ? "● Active" : "○ Hidden"}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Nút Sửa */}
                            <button
                              onClick={() => setEditingQuiz(qz)}
                              className="p-2 text-slate-600 hover:text-[#0066FF] bg-slate-100 hover:bg-blue-50 rounded-xl transition"
                              title="Chỉnh sửa bài thi"
                            >
                              ✏️
                            </button>

                            {/* Nút Xóa */}
                            <button
                              onClick={() =>
                                handleDeleteQuiz(qz.quiz_id, qz.title)
                              }
                              className="p-2 text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-xl transition"
                              title="Xóa bài thi"
                            >
                              🗑️
                            </button>

                            {/* Nút Cấu hình chi tiết */}
                            <Link
                              href={`/instructor-management/exam-manage/${subjectId}/quiz/${qz.quiz_id}`}
                              className="p-2 text-slate-600 hover:text-[#0066FF] bg-slate-100 hover:bg-blue-50 rounded-xl transition"
                              title="Cấu hình chi tiết"
                            >
                              ⚙️
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* ================= TAB 2: QUẢN LÝ QUESTION POOLS ================= */
          <QuestionPoolManager subjectId={subjectId} />
        )}
      </section>

      {/* MODAL TẠO QUIZ MỚI */}
      <CreateQuizModal
        subjectId={subjectId}
        isOpen={isCreateQuizOpen}
        onClose={() => setIsCreateQuizOpen(false)}
        subjectQuestions={subjectQuestions}
        subjectPools={subjectPools}
        onSuccess={handleCreateQuizSuccess}
      />

      {/* 2. MODAL SỬA QUIZ (Tự động mở khi editingQuiz khác null) */}
      <EditQuizModal
        quiz={editingQuiz}
        onClose={() => setEditingQuiz(null)}
        onSuccess={handleEditQuizSuccess}
      />
    </div>
  );
}
