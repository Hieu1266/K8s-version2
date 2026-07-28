"use client";

import { Question } from "@/types/questions-bank";

interface QuestionCardProps {
  question: Question;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

export default function QuestionCard({
  question,
  index,
  onEdit,
  onDelete,
}: QuestionCardProps) {
  // Chuẩn hóa loại câu hỏi
  const qType = String(question.question_type || "").toUpperCase();

  const isMultipleChoice = qType === "MULTIPLE_CHOICE" || qType === "TRẮC NGHIỆM";
  const isTrueFalse = qType === "TRUE_FALSE" || qType === "ĐÚNG / SAI" || qType === "ĐÚNG/SAI";

  // Hàm xác định nhãn và màu sắc hiển thị
  const getTypeBadge = () => {
    if (isMultipleChoice) {
      return {
        label: "Trắc nghiệm",
        className: "bg-blue-50 text-blue-600 border border-blue-100",
      };
    }
    if (isTrueFalse) {
      return {
        label: "Đúng / Sai",
        className: "bg-emerald-50 text-emerald-600 border border-emerald-100",
      };
    }
    return {
      label: "Tự luận",
      className: "bg-purple-50 text-purple-600 border border-purple-100",
    };
  };

  const typeInfo = getTypeBadge();
  
  // Hiển thị phương án cho cả Trắc nghiệm & Đúng/Sai nếu có
  const showOptions = (isMultipleChoice || isTrueFalse) && question.options && question.options.length > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3 flex-1">
          {/* Header Badge: Số thứ tự, Loại câu hỏi, Điểm tối đa */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 text-lg">
              Câu {index + 1}:
            </span>

            <span
              className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${typeInfo.className}`}
            >
              {typeInfo.label}
            </span>

            <span className="rounded-md bg-amber-50 border border-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              {question.max_points} điểm
            </span>
          </div>

          {/* Hiển thị nội dung rich text sinh ra từ CKEditor */}
          <div
            className="ck-content text-slate-800 text-base leading-relaxed overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: question.content }}
          />

          {/* Hiển thị danh sách câu trả lời cho Trắc nghiệm & Đúng/Sai */}
          {showOptions && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 pt-3 border-t border-slate-100">
              {question.options!.map((opt, optIdx) => (
                <div
                  key={opt.option_id || optIdx}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm ${
                    opt.is_correct
                      ? "border-emerald-300 bg-emerald-50/50 text-emerald-900 font-medium"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      opt.is_correct
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {String.fromCharCode(65 + optIdx)} {/* A, B, C, D */}
                  </span>
                  <span className="flex-1">{opt.option_text}</span>
                  {opt.is_correct && (
                    <span className="text-xs text-emerald-600 font-semibold">
                      (Đúng)
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nút hành động Sửa / Xóa */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors"
          >
            Sửa
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}