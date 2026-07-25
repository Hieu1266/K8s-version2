"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Quiz, Question, QuestionPool } from "@/types/exam-management";
import AddQuestionModal from "@/components/exam-management/AddQuestionModal";
import AddPoolModal from "@/components/exam-management/AddPoolModal";

export default function QuizConfigPage({
  params,
}: {
  params: Promise<{ subject_id: string; quiz_id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { subject_id: subjectId, quiz_id: quizId } = resolvedParams;

  const [quiz] = useState<Quiz>({
    quiz_id: quizId,
    subject_id: subjectId,
    title: "Bài kiểm tra Giữa kỳ - Lý thuyết",
    description: "Đánh giá tổng quan các chương đã học",
    duration_minutes: 45,
    passing_score: 5.0,
    max_attempts: 2,
    quiz_type: "FIXED_QUESTION",
    placement_type: "STANDALONE_LESSON",
    is_active: true,
    is_peer_review: false,
    created_at: "2026-03-10",
  });

  // State Đề Cố Định
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([
    {
      question_id: "q-101",
      subject_id: subjectId,
      question_title: "Tính đóng gói (Encapsulation) trong OOP là gì?",
      question_type: "MULTIPLE_CHOICE",
      max_points: 2.0,
    },
    {
      question_id: "q-103",
      subject_id: subjectId,
      question_title: "Giao thức TCP hoạt động ở tầng nào trong OSI?",
      question_type: "MULTIPLE_CHOICE",
      max_points: 3.0,
    },
  ]);

  const [availableQuestions] = useState<Question[]>([
    {
      question_id: "q-101",
      subject_id: subjectId,
      question_title: "Tính đóng gói (Encapsulation) trong OOP là gì?",
      question_type: "MULTIPLE_CHOICE",
      max_points: 2.0,
    },
    {
      question_id: "q-102",
      subject_id: subjectId,
      question_title: "Phân biệt Interface và Abstract Class?",
      question_type: "ESSAY",
      max_points: 2.5,
    },
    {
      question_id: "q-103",
      subject_id: subjectId,
      question_title: "Giao thức TCP hoạt động ở tầng nào trong OSI?",
      question_type: "MULTIPLE_CHOICE",
      max_points: 3.0,
    },
  ]);

  // State Đề Ngẫu Nhiên
  const [randomRules, setRandomRules] = useState([
    {
      pool_id: "p-01",
      pool_name: "Kho câu hỏi Dễ - Chương 1 & 2",
      select_count: 5,
      point_per_question: 1.0,
    },
  ]);

  const [availablePools] = useState<QuestionPool[]>([
    {
      pool_id: "p-01",
      title: "Kho câu hỏi Dễ - Chương 1 & 2",
      description: "Các câu hỏi cơ bản",
      created_at: "2026-03-20",
    },
    {
      pool_id: "p-02",
      title: "Kho câu hỏi Nâng cao - Mạng máy tính",
      description: "Các câu phân loại",
      created_at: "2026-03-22",
    },
  ]);

  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [isAddPoolOpen, setIsAddPoolOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Handlers
  const handleToggleSelectQuestion = (q: Question) => {
    setSelectedQuestions((prev) =>
      prev.some((item) => item.question_id === q.question_id)
        ? prev.filter((item) => item.question_id !== q.question_id)
        : [...prev, q],
    );
  };

  const handleAddPoolToRules = (pool: QuestionPool) => {
    if (randomRules.some((r) => r.pool_id === pool.pool_id)) {
      alert("Kho câu hỏi này đã có trong quy tắc!");
      return;
    }
    setRandomRules((prev) => [
      ...prev,
      {
        pool_id: pool.pool_id,
        pool_name: pool.title,
        select_count: 3,
        point_per_question: 1.0,
      },
    ]);
    setIsAddPoolOpen(false);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert("Đã lưu cấu hình thành công!");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <Navbar />

      {/* Header Banner */}
      <section className="bg-slate-900 text-white py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <button
              onClick={() =>
                router.push(`/instructor-management/exam-manage/${subjectId}`)
              }
              className="text-xs text-slate-400 hover:text-white transition mb-3 font-bold"
            >
              ← Quay lại Trang Quản lý Môn học
            </button>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold">
                Quiz ID: {quizId}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  quiz.quiz_type === "FIXED_QUESTION"
                    ? "bg-blue-600"
                    : "bg-purple-600"
                }`}
              >
                {quiz.quiz_type === "FIXED_QUESTION"
                  ? "📌 Đề Cố Định"
                  : "🔀 Đề Ngẫu Nhiên"}
              </span>
            </div>
            <h1 className="text-2xl font-bold">{quiz.title}</h1>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-[#0066FF] hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs font-bold rounded-xl transition shadow-md"
            >
              {isSaving ? "⏳ Đang lưu..." : "💾 Lưu Cấu Hình"}
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        {quiz.quiz_type === "FIXED_QUESTION" ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-base font-bold">
                  Danh sách Câu hỏi trong Đề ({selectedQuestions.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Tổng điểm:{" "}
                  <span className="font-bold text-[#0066FF]">
                    {selectedQuestions
                      .reduce((sum, q) => sum + (q.max_points || 0), 0)
                      .toFixed(1)}{" "}
                    pts
                  </span>
                </p>
              </div>
              <button
                onClick={() => setIsAddQuestionOpen(true)}
                className="px-4 py-2 bg-blue-50 text-[#0066FF] hover:bg-blue-100 text-xs font-bold rounded-xl transition"
              >
                ➕ Thêm câu hỏi từ Ngân hàng
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
              {selectedQuestions.map((q, idx) => (
                <div
                  key={q.question_id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <span className="w-7 h-7 bg-slate-100 text-slate-600 font-bold rounded-lg text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold">{q.question_title}</p>
                      <span className="text-[10px] text-slate-400">
                        Type: {q.question_type}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setSelectedQuestions((prev) =>
                        prev.filter(
                          (item) => item.question_id !== q.question_id,
                        ),
                      )
                    }
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-base font-bold">
                Quy tắc sinh đề Ngẫu nhiên
              </h2>
              <button
                onClick={() => setIsAddPoolOpen(true)}
                className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold rounded-xl transition"
              >
                ➕ Thêm Kho câu hỏi vào Quy tắc
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
              {randomRules.map((rule) => (
                <div
                  key={rule.pool_id}
                  className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 flex justify-between items-center"
                >
                  <h4 className="text-sm font-bold">{rule.pool_name}</h4>
                  <button
                    onClick={() =>
                      setRandomRules((prev) =>
                        prev.filter((r) => r.pool_id !== rule.pool_id),
                      )
                    }
                    className="text-slate-400 hover:text-rose-600 transition"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Render Modals */}
      <AddQuestionModal
        isOpen={isAddQuestionOpen}
        onClose={() => setIsAddQuestionOpen(false)}
        availableQuestions={availableQuestions}
        selectedQuestions={selectedQuestions}
        onToggleSelect={handleToggleSelectQuestion}
      />

      <AddPoolModal
        isOpen={isAddPoolOpen}
        onClose={() => setIsAddPoolOpen(false)}
        availablePools={availablePools}
        onAddPool={handleAddPoolToRules}
      />
    </div>
  );
}
