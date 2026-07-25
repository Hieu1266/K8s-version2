"use client";

import { useState, useEffect } from "react";
import { Quiz, QuizPlacementType } from "@/types/exam-management";

interface Props {
  quiz: Quiz | null;
  onClose: () => void;
  onSuccess: (updatedData: Partial<Quiz>) => void;
}

export default function EditQuizModal({ quiz, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [passingScore, setPassingScore] = useState(5.0);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [placementType, setPlacementType] =
    useState<QuizPlacementType>("STANDALONE_LESSON");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (quiz) {
      setTitle(quiz.title);
      setDescription(quiz.description || "");
      setDurationMinutes(quiz.duration_minutes);
      setPassingScore(quiz.passing_score);
      setMaxAttempts(quiz.max_attempts);
      setPlacementType(quiz.placement_type);
      setIsActive(quiz.is_active);
    }
  }, [quiz]);

  if (!quiz) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSuccess({
      title,
      description,
      duration_minutes: durationMinutes,
      passing_score: passingScore,
      max_attempts: maxAttempts,
      placement_type: placementType,
      is_active: isActive,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
        <div className="pb-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Cập nhật Bài thi</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên bài thi
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0066FF] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mô tả
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0066FF] outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Thời lượng (phút)
              </label>
              <input
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Điểm đạt
              </label>
              <input
                type="number"
                step="0.5"
                min={0}
                max={10}
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active_edit"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#0066FF]"
            />
            <label
              htmlFor="is_active_edit"
              className="text-xs font-bold text-slate-700"
            >
              Kích hoạt bài thi (Active)
            </label>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0066FF] text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
