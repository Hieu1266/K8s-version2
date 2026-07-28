"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Question, QuestionTypeEnum } from "@/types/questions-bank";
import {
  Plus,
  Trash2,
  CheckCircle2,
  X,
  HelpCircle,
  GripVertical,
  Percent,
  Divide,
  AlertTriangle,
} from "lucide-react";

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

export interface RubricCriterionItem {
  criteria_id?: string;
  title: string;
  description: string;
  percentage: number;
}

interface AddQuestionModalProps {
  open: boolean;
  subjectId: string;
  onClose: () => void;
  onSave: (question: Question) => void;
  editQuestion?: Question;
}

// Hàm làm tròn số thập phân triệt tiêu lỗi floating-point trong JS
const roundToFixed = (num: number, decimals: number = 2): number => {
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
};

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

const DEFAULT_RUBRICS: RubricCriterionItem[] = [
  { title: "Nội dung chính", description: "Nêu đầy đủ và chính xác các ý cốt lõi", percentage: 60 },
  { title: "Lập luận & Trình bày", description: "Diễn đạt logic, rõ ràng, không sai chính tả", percentage: 40 },
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
  const [maxPoints, setMaxPoints] = useState<number>(10.0);
  const [options, setOptions] = useState<OptionItem[]>(DEFAULT_INITIAL_OPTIONS);
  
  // State quản lý Rubric
  const [rubrics, setRubrics] = useState<RubricCriterionItem[]>(DEFAULT_RUBRICS);

  useEffect(() => {
    if (editQuestion) {
      setContent(editQuestion.content || "");
      setQuestionType(editQuestion.question_type || "MULTIPLE_CHOICE");
      setMaxPoints(editQuestion.max_points ?? 10.0);

      const qOptions = (editQuestion as unknown as { options?: OptionItem[] }).options;
      if (qOptions && qOptions.length > 0) {
        setOptions(reindexOptions(qOptions));
      } else {
        setOptions(DEFAULT_INITIAL_OPTIONS);
      }

      // Load Rubrics nếu có
      const qRubrics = (editQuestion as unknown as { rubrics?: RubricCriterionItem[] }).rubrics;
      if (qRubrics && Array.isArray(qRubrics) && qRubrics.length > 0) {
        setRubrics(qRubrics);
      } else {
        setRubrics(DEFAULT_RUBRICS);
      }
    } else {
      setContent("");
      setQuestionType("MULTIPLE_CHOICE");
      setMaxPoints(10.0);
      setOptions(DEFAULT_INITIAL_OPTIONS);
      setRubrics(DEFAULT_RUBRICS);
    }
  }, [editQuestion, open]);

  if (!open) return null;

  // Tính tổng % Rubric
  const totalPercentage = roundToFixed(
    rubrics.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0),
    1
  );
  const isPercentageValid = Math.abs(totalPercentage - 100) < 0.01;

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

  // Handlers Trắc nghiệm
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
    setOptions((prev) => reindexOptions([...prev, { option_id: "", option_text: "", is_correct: false }]));
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      alert("Câu hỏi trắc nghiệm cần tối thiểu 2 phương án!");
      return;
    }
    setOptions((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      const reindexed = reindexOptions(filtered);
      if (!reindexed.some((o) => o.is_correct) && reindexed.length > 0) {
        reindexed[0].is_correct = true;
      }
      return reindexed;
    });
  };

  // Handlers Rubric
  const handleAddCriterion = () => {
    const remaining = Math.max(0, roundToFixed(100 - totalPercentage, 1));
    setRubrics([
      ...rubrics,
      { title: "", description: "", percentage: remaining },
    ]);
  };

  const handleRemoveCriterion = (index: number) => {
    if (rubrics.length <= 1) {
      alert("Thang điểm Rubric cần có ít nhất 1 tiêu chí!");
      return;
    }
    setRubrics(rubrics.filter((_, i) => i !== index));
  };

  const handleCriterionChange = (index: number, field: keyof RubricCriterionItem, value: any) => {
    setRubrics(
      rubrics.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  // Chia đều % tròn số, tự dồn dư cho tiêu chí đầu
  const handleDistributeEqually = () => {
    if (rubrics.length === 0) return;
    const basePct = Math.floor(100 / rubrics.length);
    const remainder = roundToFixed(100 - basePct * rubrics.length, 1);

    setRubrics(
      rubrics.map((item, idx) => ({
        ...item,
        percentage: idx === 0 ? roundToFixed(basePct + remainder, 1) : basePct,
      }))
    );
  };

  // Sửa trực tiếp Điểm quy đổi (Thang 10) -> Tự chuyển ngược lại thành %
  const handleScoreDirectChange = (index: number, inputScore: number) => {
    if (maxPoints <= 0) return;
    const calculatedPct = roundToFixed((inputScore / maxPoints) * 100, 1);
    
    setRubrics(
      rubrics.map((item, i) =>
        i === index
          ? { ...item, percentage: Math.min(100, Math.max(0, calculatedPct)) }
          : item
      )
    );
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
      if (options.some((opt) => !opt.option_text.trim())) {
        return alert("Vui lòng nhập đầy đủ nội dung cho các phương án!");
      }
    }

    if (questionType === "ESSAY") {
      if (rubrics.length === 0) {
        return alert("Vui lòng thêm ít nhất 1 tiêu chí Rubric!");
      }
      if (rubrics.some((r) => !r.title.trim())) {
        return alert("Vui lòng nhập tên cho tất cả các tiêu chí Rubric!");
      }
      if (!isPercentageValid) {
        return alert(`Tổng trọng số các tiêu chí phải bằng 100%! (Hiện tại là ${totalPercentage}%)`);
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
        : {
            rubrics: rubrics.map((r) => ({
              ...(r.criteria_id ? { criteria_id: r.criteria_id } : {}),
              title: r.title,
              description: r.description,
              percentage: Number(r.percentage),
              max_score: roundToFixed((((Number(r.percentage) || 0) * maxPoints) / 100), 2),
            })),
          }),
    };

    onSave(payload as unknown as Question);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl max-h-[92vh] flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3.5 bg-slate-50/60 shrink-0 rounded-t-2xl">
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
                Điểm tối đa (Thang điểm 10)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="10"
                value={maxPoints}
                onChange={(e) => setMaxPoints(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <hr className="border-slate-100 my-1" />

          {/* TRẮC NGHIỆM / ĐÚNG SAI */}
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
                  const currentLabel = opt.option_id || String.fromCharCode(65 + index);

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
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Phương án ${currentLabel}...`}
                        className="flex-1 bg-transparent text-xs font-medium focus:outline-none px-1 text-slate-800"
                      />

                      {opt.is_correct && (
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mr-1" />
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
                  <Plus size={14} /> Thêm phương án ({String.fromCharCode(65 + options.length)})
                </button>
              )}
            </div>
          ) : (
            /* TỰ LUẬN (ESSAY) - CHẤM RUBRIC CHI TIẾT DÙNG TRỰC TIẾP */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Thang điểm Rubric chi tiết <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  Có thể sửa % hoặc gõ trực tiếp số điểm
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-3">
                {/* Danh sách tiêu chí Rubric */}
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {rubrics.map((criterion, index) => {
                    const calculatedScore = roundToFixed(
                      ((Number(criterion.percentage) || 0) * maxPoints) / 100,
                      2
                    );

                    return (
                      <div
                        key={index}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2 transition hover:border-slate-300"
                      >
                        <div className="flex items-center gap-2">
                          {/* Tên tiêu chí */}
                          <input
                            type="text"
                            value={criterion.title}
                            onChange={(e) =>
                              handleCriterionChange(index, "title", e.target.value)
                            }
                            placeholder={`Tiêu chí ${index + 1} (VD: Nêu đúng định nghĩa...)`}
                            className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />

                          {/* Ô Nhập Trọng số % */}
                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 shrink-0 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={criterion.percentage}
                              onChange={(e) =>
                                handleCriterionChange(
                                  index,
                                  "percentage",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-11 text-center bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                            />
                            <Percent size={11} className="text-slate-400" />
                          </div>

                          {/* Ô Nhập Điểm Quy Đổi Trực Tiếp */}
                          <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200/80 rounded-lg px-2 py-1 shrink-0 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500">
                            <input
                              type="number"
                              min="0"
                              max={maxPoints}
                              step="0.25"
                              value={calculatedScore}
                              onChange={(e) =>
                                handleScoreDirectChange(index, parseFloat(e.target.value) || 0)
                              }
                              className="w-12 text-center bg-transparent text-xs font-bold text-emerald-700 focus:outline-none"
                            />
                            <span className="text-[10px] font-bold text-emerald-600">đ</span>
                          </div>

                          {/* Nút xóa */}
                          {rubrics.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCriterion(index)}
                              className="text-slate-300 hover:text-rose-500 p-1 rounded-lg transition shrink-0"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>

                        {/* Mô tả chi tiết tiêu chí */}
                        <input
                          type="text"
                          value={criterion.description}
                          onChange={(e) =>
                            handleCriterionChange(index, "description", e.target.value)
                          }
                          placeholder="Mô tả chi tiết yêu cầu để đạt điểm tiêu chí này..."
                          className="w-full bg-slate-50/70 border border-slate-100 rounded-lg px-2.5 py-1 text-[11px] text-slate-600 focus:outline-none focus:bg-white focus:border-emerald-500 transition"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Thanh điều khiển & Trạng thái tổng % */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddCriterion}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 transition"
                    >
                      <Plus size={13} /> Thêm tiêu chí
                    </button>

                    <button
                      type="button"
                      onClick={handleDistributeEqually}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white px-2 py-1 rounded-lg border border-slate-200 transition"
                      title="Chia đều % cho tất cả các tiêu chí"
                    >
                      <Divide size={13} /> Chia đều %
                    </button>
                  </div>

                  {/* Badge trạng thái tổng % */}
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      isPercentageValid
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-600 border-rose-200 animate-pulse"
                    }`}
                  >
                    {!isPercentageValid && <AlertTriangle size={13} />}
                    <span>
                      Tổng: {totalPercentage}% / 100%
                    </span>
                  </div>
                </div>
              </div>
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