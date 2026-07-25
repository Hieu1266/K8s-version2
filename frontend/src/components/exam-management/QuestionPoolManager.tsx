"use client";

import { useState } from "react";
import { Question, QuestionPool, QuestionType } from "@/types/exam-management";

interface Props {
  subjectId: string;
}

export default function QuestionPoolManager({ subjectId }: Props) {
  // Mock Ngân hàng câu hỏi thuộc Subject (Question Table)
  const [subjectQuestions] = useState<Question[]>([
    {
      question_id: "q-101",
      subject_id: subjectId,
      question_title: "Tính đóng gói (Encapsulation) trong OOP là gì?",
      question_type: "MULTIPLE_CHOICE",
      body_content: "Chọn đáp án đúng nhất về khái niệm Encapsulation.",
      max_points: 1.0,
    },
    {
      question_id: "q-102",
      subject_id: subjectId,
      question_title: "So sánh Interface và Abstract Class trong Java?",
      question_type: "ESSAY",
      body_content: "Phân tích điểm khác nhau về đa thừa kế và phương thức.",
      max_points: 2.0,
    },
    {
      question_id: "q-103",
      subject_id: subjectId,
      question_title: "Giao thức TCP hoạt động ở tầng nào trong mô hình OSI?",
      question_type: "MULTIPLE_CHOICE",
      body_content: "Chọn tầng phù hợp.",
      max_points: 1.0,
    },
    {
      question_id: "q-104",
      subject_id: subjectId,
      question_title:
        "Thuật toán OSPF sử dụng thuật toán đường đi ngắn nhất nào?",
      question_type: "SHORT_ANSWER",
      body_content: "Nhập tên thuật toán.",
      max_points: 1.0,
    },
  ]);

  // Mock Danh sách Question Pools
  const [pools, setPools] = useState<QuestionPool[]>([
    {
      pool_id: "p-01",
      title: "Kho câu hỏi Dễ - Chương 1 & 2",
      description: "Các câu hỏi cơ bản dành cho bài kiểm tra 15 phút.",
      created_at: "2026-03-20",
      questions: [subjectQuestions[0]], // Đã gán q-101
    },
    {
      pool_id: "p-02",
      title: "Kho câu hỏi Nâng cao - Mạng máy tính",
      description: "Các câu hỏi phân loại sinh viên giỏi.",
      created_at: "2026-03-22",
      questions: [subjectQuestions[2], subjectQuestions[3]], // Đã gán q-103, q-104
    },
  ]);

  // States quản lý UI Modal
  const [selectedPool, setSelectedPool] = useState<QuestionPool | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Form State tạo Pool mới
  const [newPoolTitle, setNewPoolTitle] = useState("");
  const [newPoolDesc, setNewPoolDesc] = useState("");

  // Checkbox State chọn câu hỏi để gán vào Pool
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  // 1. Xử lý Tạo Pool mới
  const handleCreatePool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoolTitle.trim()) return;

    const newPool: QuestionPool = {
      pool_id: crypto.randomUUID(),
      title: newPoolTitle,
      description: newPoolDesc,
      created_at: new Date().toISOString().split("T")[0],
      questions: [],
    };

    setPools([newPool, ...pools]);
    setNewPoolTitle("");
    setNewPoolDesc("");
    setIsCreateModalOpen(false);
  };

  // 2. Mở Modal gán câu hỏi cho 1 Pool cụ thể
  const handleOpenAssignModal = (pool: QuestionPool) => {
    setSelectedPool(pool);
    // Lấy danh sách ID các câu hỏi hiện đã có trong Pool
    const currentIds = pool.questions?.map((q) => q.question_id) || [];
    setSelectedQuestionIds(currentIds);
    setIsAssignModalOpen(true);
  };

  // 3. Toggle chọn/bỏ chọn câu hỏi trong Modal
  const handleToggleQuestion = (qId: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId],
    );
  };

  // 4. Lưu danh sách câu hỏi gán vào Pool (Cập nhật QuestionPoolLink)
  const handleSaveAssignedQuestions = () => {
    if (!selectedPool) return;

    // Lọc ra các object Question tương ứng với các ID đã chọn
    const updatedQuestions = subjectQuestions.filter((q) =>
      selectedQuestionIds.includes(q.question_id),
    );

    setPools((prevPools) =>
      prevPools.map((p) =>
        p.pool_id === selectedPool.pool_id
          ? { ...p, questions: updatedQuestions }
          : p,
      ),
    );

    setIsAssignModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Quản lý Kho câu hỏi (Question Pools)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gom nhóm các câu hỏi từ Ngân hàng câu hỏi của Subject để phục vụ rút
            đề ngẫu nhiên (Random Quiz Rules).
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm shrink-0"
        >
          ➕ Tạo Pool Mới
        </button>
      </div>

      {/* Danh sách các Question Pools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pools.map((pool) => (
          <div
            key={pool.pool_id}
            className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:border-blue-300 transition shadow-sm"
          >
            <div>
              <div className="flex justify-between items-start gap-2 mb-2">
                <h3 className="text-base font-bold text-slate-800">
                  {pool.title}
                </h3>
                <span className="text-[11px] font-mono bg-blue-50 text-[#0066FF] font-bold px-2 py-0.5 rounded-md border border-blue-100 shrink-0">
                  {pool.questions?.length || 0} câu hỏi
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                {pool.description || "Chưa có mô tả cho kho câu hỏi này."}
              </p>

              {/* Xem nhanh một số câu hỏi trong Pool */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 block mb-2 uppercase">
                  Câu hỏi đã gán:
                </span>
                {pool.questions && pool.questions.length > 0 ? (
                  <ul className="space-y-1.5">
                    {pool.questions.slice(0, 3).map((q) => (
                      <li
                        key={q.question_id}
                        className="text-xs text-slate-700 truncate flex items-center gap-1.5"
                      >
                        <span className="text-blue-500">•</span>{" "}
                        {q.question_title}
                      </li>
                    ))}
                    {pool.questions.length > 3 && (
                      <li className="text-[11px] text-slate-400 italic">
                        + còn {pool.questions.length - 3} câu hỏi khác...
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                    ⚠️ Kho này chưa có câu hỏi nào. Nhấn "Chọn câu hỏi" để thêm.
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-[10px] text-slate-400 font-mono">
                ID: {pool.pool_id}
              </span>
              <button
                onClick={() => handleOpenAssignModal(pool)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-[#0066FF] hover:text-white text-slate-700 rounded-xl text-xs font-bold transition"
              >
                ⚙️ Thêm / Bớt câu hỏi
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ================= MODAL 1: TẠO QUESTION POOL MỚI ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Tạo Question Pool Mới
            </h3>
            <form onSubmit={handleCreatePool} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Pool *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Vd: Ngân hàng câu hỏi Chương 1 - Dễ"
                  value={newPoolTitle}
                  onChange={(e) => setNewPoolTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0066FF] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô tả kho câu hỏi
                </label>
                <textarea
                  rows={3}
                  placeholder="Ghi chú về mức độ khó, phạm vi kiến thức..."
                  value={newPoolDesc}
                  onChange={(e) => setNewPoolDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0066FF] outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0066FF] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Xác nhận Tạo Pool
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: GÁN CÂU HỎI TỪ SUBJECT VÀO POOL ================= */}
      {isAssignModalOpen && selectedPool && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
            {/* Header Modal */}
            <div className="pb-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">
                Chọn câu hỏi cho Pool:{" "}
                <span className="text-[#0066FF]">{selectedPool.title}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tích chọn các câu hỏi thuộc Ngân hàng câu hỏi Subject để gán vào
                Pool này.
              </p>
            </div>

            {/* List danh sách câu hỏi có sẵn từ Subject */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {subjectQuestions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Chưa có câu hỏi nào trong Ngân hàng câu hỏi của Subject này.
                </p>
              ) : (
                subjectQuestions.map((q) => {
                  const isChecked = selectedQuestionIds.includes(q.question_id);
                  return (
                    <label
                      key={q.question_id}
                      onClick={() => handleToggleQuestion(q.question_id)}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                        isChecked
                          ? "bg-blue-50/60 border-[#0066FF]"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handle bởi onClick ở container
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0066FF] focus:ring-[#0066FF]"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">
                            {q.question_title}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {q.question_type}
                          </span>
                        </div>
                        {q.body_content && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                            {q.body_content}
                          </p>
                        )}
                        <span className="text-[11px] font-semibold text-emerald-600 mt-1 block">
                          Điểm tối đa: {q.max_points}đ
                        </span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            {/* Footer Modal Actions */}
            <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-600">
                Đã chọn:{" "}
                <strong className="text-[#0066FF]">
                  {selectedQuestionIds.length}
                </strong>{" "}
                / {subjectQuestions.length} câu hỏi
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveAssignedQuestions}
                  className="px-5 py-2 bg-[#0066FF] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Lưu thay đổi (QuestionPoolLink)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
