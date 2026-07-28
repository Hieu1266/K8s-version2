"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Question, QuestionTypeEnum } from "@/types/questions-bank";
import { Plus, Trash2, CheckCircle2, X, HelpCircle, GripVertical } from "lucide-react";

// Tải động RichTextEditor
const RichTextEditor = dynamic(
  () => import("@/components/editors/RichTextEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-28 rounded-xl border border-slate-200 bg-slate-50 animate-pulse p-3 text-xs text-slate-400 flex items-center justify-center">
        Đang tải trình soạn thảo...
      </div>
    ),
  }
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

const reindexOptions = (opts: OptionItem[]): OptionItem[] => {
  return opts.map((opt, idx) => ({
    ...opt,
    option_id: String.fromCharCode(65 + idx),
  }));
};

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
  const [questionType, setQuestionType] = useState<QuestionTypeEnum | string>("MULTIPLE_CHOICE");
  const [maxPoints, setMaxPoints] = useState<number>(1.0);
  const [options, setOptions] = useState<OptionItem[]>(DEFAULT_INITIAL_OPTIONS);
  const [sampleAnswer, setSampleAnswer] = useState("");

  useEffect(() => {
    if (editQuestion) {
      setContent(editQuestion.content || "");
      setQuestionType(editQuestion.question_type || "MULTIPLE_CHOICE");
      setMaxPoints(editQuestion.max_points ?? 1.0);

      const qOptions = (editQuestion as unknown as { options?: OptionItem[] }).options;
      if (qOptions && qOptions.length > 0) {
        setOptions(reindexOptions(qOptions));
      } else {
        setOptions(DEFAULT_INITIAL_OPTIONS);
      }

      const qSample = (editQuestion as unknown as { sample_answer?: string }).sample_answer;
      setSampleAnswer(qSample || "");
    } else {
      setContent("");
      setQuestionType("MULTIPLE_CHOICE");
      setMaxPoints(1.0);
      setOptions(DEFAULT_INITIAL_OPTIONS);
      setSampleAnswer("");
    }
  }, [editQuestion, open]);

  if (!open) return null;

  const handleTypeChange = (type: string) => {
    setQuestionType(type);
    if (type === "TRUE_FALSE") {
      setOptions([
        { option_id: "A", option_text: "Đúng", is_correct: true },
        { option_id: "B", option_text: "Sai", is_correct: false },
      ]);
    } else if (type === "MULTIPLE_CHOICE" && options.length < 2) {
      setOptions(DEFAULT_INITIAL_OPTIONS);
    }
  };

  const handleOptionChange = (index: number, text: string) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, option_text: text } : opt))
    );
  };

  const handleSelectCorrect = (index: number) => {
    setOptions((prev) =>
      prev.map((opt, i) => ({
        ...opt,
        is_correct: i === index,
      }))
    );
  };

  const handleAddOption = () => {
    setOptions((prev) => {
      const newOptions = [
        ...prev,
        { option_id: "", option_text: "", is_correct: false },
      ];
      return reindexOptions(newOptions);
    });
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      alert("Câu hỏi trắc nghiệm cần tối thiểu 2 phương án!");
      return;
    }

    setOptions((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      const reindexed = reindexOptions(filtered);
      const hasCorrect = reindexed.some((o) => o.is_correct);
      if (!hasCorrect && reindexed.length > 0) {
        reindexed[0].is_correct = true;
      }
      return reindexed;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanContent = content.replace(/<[^>]*>/g, "").trim();
    if (!cleanContent) {
      return alert("Vui lòng nhập nội dung câu hỏi!");
    }

    if (questionType === "MULTIPLE_CHOICE" || questionType === "TRUE_FALSE") {
      if (options.length < 2) {
        return alert("Câu hỏi trắc nghiệm phải có ít nhất 2 phương án!");
      }

      const hasEmptyOption = options.some((opt) => !opt.option_text.trim());
      if (hasEmptyOption) {
        return alert("Vui lòng nhập đầy đủ nội dung cho các phương án!");
      }
    }

    const payload: any = {
      ...(editQuestion?.question_id ? { question_id: editQuestion.question_id } : {}),
      subject_id: subjectId,
      question_type: questionType,
      content: content,
      max_points: maxPoints,
      ...(questionType === "MULTIPLE_CHOICE" || questionType === "TRUE_FALSE"
        ? { options }
        : { sample_answer: sampleAnswer }),
    };

    onSave(payload as unknown as Question);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl max-h-[92vh] flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3 bg-slate-50/60 shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-2 text-slate-800">
            <HelpCircle className="text-emerald-600" size={18} />
            <h2 className="text-sm font-bold text-slate-800">
              {editQuestion ? "Cập nhật câu hỏi" : "Thêm câu hỏi mới"}
            </h2>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* PHẦN NHẬP CÂU HỎI */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Nội dung câu hỏi <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <GripVertical size={12} /> Nắm góc dưới để kéo giãn khung
              </span>
            </div>

            {/* Đã thêm CSS căn lề phải cho Dropdown Menu: [&_.ck-dropdown\_\_panel]:!right-0 [&_.ck-dropdown\_\_panel]:!left-auto */}
            <div className="relative border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition resize-y overflow-auto min-h-[130px] max-h-[350px] 
              [&_.tox-tinymce]:!h-full [&_.tox-tinymce]:!min-h-[120px] 
              [&_.ck-editor]:!h-full 
              [&_.ck-dropdown\_\_panel]:!right-0 [&_.ck-dropdown\_\_panel]:!left-auto [&_.ck-dropdown\_\_panel]:!min-w-[150px]">
              <RichTextEditor value={content} onChange={setContent} />
            </div>
          </div>

          {/* Loại câu hỏi & Điểm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Loại câu hỏi
              </label>
              <select
                value={questionType}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                <option value="MULTIPLE_CHOICE">Trắc nghiệm (1 hoặc nhiều đáp án)</option>
                <option value="TRUE_FALSE">Đúng / Sai</option>
                <option value="ESSAY">Tự luận (ESSAY)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Điểm tối đa
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                value={maxPoints}
                onChange={(e) => setMaxPoints(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <hr className="border-slate-100 my-1" />

          {/* Các phương án A, B, C... */}
          {questionType === "MULTIPLE_CHOICE" || questionType === "TRUE_FALSE" ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Phương án trả lời <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  Bấm vào ký tự A, B, C... để chọn đáp án đúng
                </span>
              </div>

              <div className="space-y-2">
                {options.map((opt, index) => {
                  const currentLabel =
                    opt.option_id || String.fromCharCode(65 + index);

                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-2.5 p-1.5 rounded-xl border transition ${
                        opt.is_correct
                          ? "border-emerald-500 bg-emerald-50/40"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectCorrect(index)}
                        className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold transition shrink-0 ${
                          opt.is_correct
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                        title="Đánh dấu đáp án đúng"
                      >
                        {currentLabel}
                      </button>

                      <input
                        type="text"
                        value={opt.option_text}
                        onChange={(e) =>
                          handleOptionChange(index, e.target.value)
                        }
                        placeholder={`Phương án ${currentLabel}...`}
                        className="flex-1 bg-transparent text-xs font-medium focus:outline-none px-1 text-slate-800"
                      />

                      {opt.is_correct && (
                        <CheckCircle2
                          size={16}
                          className="text-emerald-600 shrink-0 mr-1"
                        />
                      )}

                      {options.length > 2 && questionType !== "TRUE_FALSE" && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(index)}
                          className="text-slate-300 hover:text-rose-500 p-1 rounded-md transition shrink-0"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {questionType !== "TRUE_FALSE" && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 pt-0.5"
                >
                  <Plus size={14} /> Thêm phương án (
                  {String.fromCharCode(65 + options.length)})
                </button>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Hướng dẫn chấm / Đáp án gợi ý (Tự luận)
              </label>
              <textarea
                rows={2}
                value={sampleAnswer}
                onChange={(e) => setSampleAnswer(e.target.value)}
                placeholder="Nhập tiêu chuẩn chấm hoặc hướng dẫn giải chi tiết..."
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-sm"
            >
              Lưu câu hỏi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}