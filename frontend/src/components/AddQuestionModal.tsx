"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Question, QuestionTypeEnum } from "@/types/questions-bank";
import { Plus, Trash2, CheckCircle2, X } from "lucide-react";

const RichTextEditor = dynamic(
  () => import("@/components/editors/RichTextEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-32 rounded-xl border bg-slate-50 animate-pulse p-4 text-xs text-slate-400">
        Đang tải trình soạn thảo...
      </div>
    ),
  },
);

interface OptionItem {
  option_id: string;
  option_text: string;
  is_correct: boolean;
}

interface AddQuestionModalProps {
  open: boolean;
  subjectId: string;
  onClose: () => void;
  onSave: (question: Question) => void;
  editQuestion?: Question;
}

// Hàm bổ trợ re-index chữ cái A, B, C, D... theo thứ tự mảng
const reindexOptions = (opts: OptionItem[]): OptionItem[] => {
  return opts.map((opt, idx) => ({
    ...opt,
    option_id: String.fromCharCode(65 + idx), // 65 là mã ASCII của 'A'
  }));
};

// Mặc định khởi tạo 2 phương án (A và B)
const DEFAULT_INITIAL_OPTIONS: OptionItem[] = [
  { option_id: "A", option_text: "", is_correct: true },
  { option_id: "B", option_text: "", is_correct: false },
];

export default function AddQuestionModal({
  open,
  subjectId,
  onClose,
  onSave,
  editQuestion,
}: AddQuestionModalProps) {
  const [content, setContent] = useState("");
  const [questionType, setQuestionType] =
    useState<QuestionTypeEnum>("MULTIPLE_CHOICE");
  const [maxPoints, setMaxPoints] = useState<number>(1.0);

  // State cho Trắc nghiệm (Mặc định 2 phương án)
  const [options, setOptions] = useState<OptionItem[]>(DEFAULT_INITIAL_OPTIONS);

  // State cho Tự luận
  const [sampleAnswer, setSampleAnswer] = useState("");

  useEffect(() => {
    if (editQuestion) {
      setContent(editQuestion.content || "");
      setQuestionType(editQuestion.question_type || "MULTIPLE_CHOICE");
      setMaxPoints(editQuestion.max_points ?? 1.0);

      const qOptions = (editQuestion as unknown as { options?: OptionItem[] })
        .options;
      if (qOptions && qOptions.length > 0) {
        setOptions(reindexOptions(qOptions));
      } else {
        setOptions(DEFAULT_INITIAL_OPTIONS);
      }

      const qSample = (editQuestion as unknown as { sample_answer?: string })
        .sample_answer;
      setSampleAnswer(qSample || "");
    } else {
      // Reset khi mở modal thêm mới
      setContent("");
      setQuestionType("MULTIPLE_CHOICE");
      setMaxPoints(1.0);
      setOptions(DEFAULT_INITIAL_OPTIONS);
      setSampleAnswer("");
    }
  }, [editQuestion, open]);

  if (!open) return null;

  // Cập nhật nội dung phương án
  const handleOptionChange = (index: number, text: string) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, option_text: text } : opt)),
    );
  };

  // Chọn đáp án đúng
  const handleSelectCorrect = (index: number) => {
    setOptions((prev) =>
      prev.map((opt, i) => ({
        ...opt,
        is_correct: i === index,
      })),
    );
  };

  // Thêm phương án mới & tự động re-index A, B, C...
  const handleAddOption = () => {
    setOptions((prev) => {
      const newOptions = [
        ...prev,
        { option_id: "", option_text: "", is_correct: false },
      ];
      return reindexOptions(newOptions);
    });
  };

  // Xóa phương án & tự động re-index A, B, C...
  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      alert("Câu hỏi trắc nghiệm cần tối thiểu 2 phương án!");
      return;
    }

    setOptions((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      const reindexed = reindexOptions(filtered);

      // Nếu xóa trúng đáp án đang được chọn đúng -> mặc định chuyển đáp án đúng về phương án A
      const hasCorrect = reindexed.some((o) => o.is_correct);
      if (!hasCorrect && reindexed.length > 0) {
        reindexed[0].is_correct = true;
      }

      return reindexed;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate nội dung câu hỏi
    const cleanContent = content.replace(/<[^>]*>/g, "").trim();
    if (!cleanContent) {
      return alert("Vui lòng nhập nội dung câu hỏi!");
    }

    // Validate phương án trắc nghiệm
    if (questionType === "MULTIPLE_CHOICE") {
      if (options.length < 2) {
        return alert("Câu hỏi trắc nghiệm phải có ít nhất 2 phương án!");
      }

      const hasEmptyOption = options.some((opt) => !opt.option_text.trim());
      if (hasEmptyOption) {
        return alert("Vui lòng nhập đầy đủ nội dung cho các phương án!");
      }
    }

    const payload: Question & {
      options?: OptionItem[];
      sample_answer?: string;
    } = {
      question_id: editQuestion
        ? editQuestion.question_id
        : crypto.randomUUID(),
      subject_id: subjectId,
      question_type: questionType,
      content: content,
      max_points: maxPoints,
      ...(questionType === "MULTIPLE_CHOICE"
        ? { options }
        : { sample_answer: sampleAnswer }),
    };

    onSave(payload as Question);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold text-slate-800">
            {editQuestion ? "Cập nhật câu hỏi" : "Thêm câu hỏi mới"}
          </h2>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-5 overflow-y-auto flex-1"
        >
          {/* Trình soạn thảo CKEditor cho Nội dung */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Nội dung câu hỏi <span className="text-rose-500">*</span>
            </label>
            <RichTextEditor value={content} onChange={setContent} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Loại câu hỏi */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Loại câu hỏi
              </label>
              <select
                value={questionType}
                onChange={(e) =>
                  setQuestionType(e.target.value as QuestionTypeEnum)
                }
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="MULTIPLE_CHOICE">
                  Trắc nghiệm (MULTIPLE_CHOICE)
                </option>
                <option value="ESSAY">Tự luận (ESSAY)</option>
              </select>
            </div>

            {/* Điểm tối đa */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Điểm tối đa
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                value={maxPoints}
                onChange={(e) => setMaxPoints(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <hr className="border-slate-100 my-2" />

          {/* HIỂN THỊ ĐỘNG THEO LOẠI CÂU HỎI */}
          {questionType === "MULTIPLE_CHOICE" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-700">
                  Phương án trả lời <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-slate-400">
                  Nhấp vào chữ cái đại diện để chọn đáp án đúng
                </span>
              </div>

              <div className="space-y-3">
                {options.map((opt, index) => {
                  const currentLabel =
                    opt.option_id || String.fromCharCode(65 + index);

                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-2 rounded-xl border transition ${
                        opt.is_correct
                          ? "border-emerald-500 bg-emerald-50/30"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {/* Nút chọn đáp án đúng */}
                      <button
                        type="button"
                        onClick={() => handleSelectCorrect(index)}
                        className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold transition shrink-0 ${
                          opt.is_correct
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                        title="Đánh dấu đáp án đúng"
                      >
                        {currentLabel}
                      </button>

                      {/* Input nhập nội dung phương án */}
                      <input
                        type="text"
                        value={opt.option_text}
                        onChange={(e) =>
                          handleOptionChange(index, e.target.value)
                        }
                        placeholder={`Phương án ${currentLabel}...`}
                        className="flex-1 bg-transparent text-sm focus:outline-none px-2"
                      />

                      {opt.is_correct && (
                        <CheckCircle2
                          size={18}
                          className="text-emerald-600 shrink-0"
                        />
                      )}

                      {/* Nút Xóa (Ẩn khi chỉ còn 2 phương án) */}
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(index)}
                          className="text-slate-300 hover:text-rose-500 p-1 rounded-md transition shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Nút Thêm phương án mới */}
              <button
                type="button"
                onClick={handleAddOption}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 pt-1"
              >
                <Plus size={15} /> Thêm phương án (
                {String.fromCharCode(65 + options.length)})
              </button>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Hướng dẫn chấm / Đáp án gợi ý (Tự luận)
              </label>
              <textarea
                rows={4}
                value={sampleAnswer}
                onChange={(e) => setSampleAnswer(e.target.value)}
                placeholder="Nhập tiêu chuẩn chấm hoặc hướng dẫn giải..."
                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-sm"
            >
              Lưu câu hỏi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
