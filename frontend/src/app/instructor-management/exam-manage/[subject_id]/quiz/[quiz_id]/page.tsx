"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Quiz, QuizCreatePayload, QuizType, QuizPlacementType } from "@/types/exam-management";
import { getQuizzesAction, createQuizAction, deleteQuizAction } from "@/actions/getQuizzes";

const emptyForm: QuizCreatePayload = {
  title: "",
  description: "",
  subject_id: "",
  duration_minutes: 45,
  passing_score: 5,
  max_attempts: 1,
  quiz_type: "FIXED_QUESTION",
  placement_type: "STANDALONE_LESSON",
  target_lesson_id: null,
  is_peer_review: false,
};

export default function SubjectQuizListPage({
  params,
}: {
  params: Promise<{ subject_id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { subject_id: subjectId } = resolvedParams;

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<QuizCreatePayload>({ ...emptyForm, subject_id: subjectId });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchQuizzes = useCallback(async (searchTerm: string = "") => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await getQuizzesAction(subjectId, searchTerm);
      setQuizzes(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể tải danh sách đề thi.");
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuizzes(search);
  };

  const handleOpenCreateModal = () => {
    setForm({ ...emptyForm, subject_id: subjectId });
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    setFormError(null);

    const result = await createQuizAction(form);
    setSubmitting(false);

    if (!result.success) {
      setFormError(result.error || "Tạo đề thi thất bại.");
      return;
    }

    setShowCreateModal(false);
    // Backend chỉ trả về thông tin rút gọn khi tạo -> fetch lại danh sách đầy đủ cho chắc chắn
    await fetchQuizzes(search);
  };

  const handleDelete = async (quiz: Quiz) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa đề thi "${quiz.title}"?`)) return;
    setDeletingId(quiz.quiz_id);
    const result = await deleteQuizAction(quiz.quiz_id);
    setDeletingId(null);

    if (!result.success) {
      alert(result.error || "Xóa đề thi thất bại.");
      return;
    }
    setQuizzes((prev) => prev.filter((q) => q.quiz_id !== quiz.quiz_id));
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <Navbar />

      <section className="bg-slate-900 text-white py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Quản lý Đề thi</h1>
            <p className="text-xs text-slate-400 mt-1">Subject ID: {subjectId}</p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-[#0066FF] hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition shadow-md"
          >
            ➕ Tạo Đề Thi Mới
          </button>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Tìm theo tiêu đề đề thi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 max-w-sm rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold rounded-xl transition"
          >
            Tìm kiếm
          </button>
        </form>

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">
            {errorMessage}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Đang tải danh sách đề thi...</div>
          ) : quizzes.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Môn học này chưa có đề thi nào. Hãy nhấn "Tạo Đề Thi Mới".
            </div>
          ) : (
            quizzes.map((quiz) => (
              <div
                key={quiz.quiz_id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition"
              >
                <button
                  onClick={() =>
                    router.push(`/instructor-management/exam-manage/${subjectId}/${quiz.quiz_id}`)
                  }
                  className="flex-1 text-left"
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold text-white ${quiz.quiz_type === "FIXED_QUESTION" ? "bg-blue-600" : "bg-purple-600"
                        }`}
                    >
                      {quiz.quiz_type === "FIXED_QUESTION" ? "📌 Đề Cố Định" : "🔀 Đề Ngẫu Nhiên"}
                    </span>
                    {!quiz.is_active && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-200 text-slate-600">
                        Tạm ẩn
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">{quiz.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                    <span>{quiz.duration_minutes} phút</span>
                    <span>•</span>
                    <span>Điểm đạt: {quiz.passing_score}</span>
                    <span>•</span>
                    <span>Tối đa {quiz.max_attempts} lượt làm</span>
                  </div>
                </button>

                <button
                  onClick={() => handleDelete(quiz)}
                  disabled={deletingId === quiz.quiz_id}
                  className="p-2 text-slate-400 hover:text-rose-600 transition disabled:opacity-40 shrink-0"
                  title="Xóa đề thi"
                >
                  {deletingId === quiz.quiz_id ? "..." : "🗑️"}
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Modal tạo đề thi mới */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Tạo Đề Thi Mới</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tiêu đề *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Thời lượng (phút)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.duration_minutes}
                    onChange={(e) => setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Điểm đạt</label>
                  <input
                    type="number"
                    step={0.1}
                    min={0}
                    value={form.passing_score}
                    onChange={(e) => setForm((f) => ({ ...f, passing_score: Number(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số lượt làm tối đa</label>
                  <input
                    type="number"
                    min={1}
                    value={form.max_attempts}
                    onChange={(e) => setForm((f) => ({ ...f, max_attempts: Number(e.target.value) || 1 }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loại đề thi</label>
                  <select
                    value={form.quiz_type}
                    onChange={(e) => setForm((f) => ({ ...f, quiz_type: e.target.value as QuizType }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="FIXED_QUESTION">📌 Đề Cố Định</option>
                    <option value="RANDOM_QUESTION">🔀 Đề Ngẫu Nhiên</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vị trí hiển thị</label>
                  <select
                    value={form.placement_type}
                    onChange={(e) => setForm((f) => ({ ...f, placement_type: e.target.value as QuizPlacementType }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="STANDALONE_LESSON">Bài học độc lập</option>
                    <option value="INSIDE_LESSON">Đính kèm trong bài đọc</option>
                    <option value="IN_VIDEO">Nhúng vào mốc thời gian video</option>
                  </select>
                </div>
              </div>

              {form.placement_type !== "STANDALONE_LESSON" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lesson ID đích (UUID)
                  </label>
                  <input
                    type="text"
                    placeholder="UUID của bài học sẽ gắn đề thi này"
                    value={form.target_lesson_id || ""}
                    onChange={(e) => setForm((f) => ({ ...f, target_lesson_id: e.target.value || null }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_peer_review}
                  onChange={(e) => setForm((f) => ({ ...f, is_peer_review: e.target.checked }))}
                />
                Đề thi có câu tự luận cần chấm chéo (peer review)
              </label>

              {formError && <p className="text-xs text-rose-600">{formError}</p>}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Đang tạo..." : "Tạo Đề Thi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}