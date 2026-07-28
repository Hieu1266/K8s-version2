"use client";

import { useState, useEffect } from "react";

export default function CreateQuizDrawer({
    subjectId,
    isOpen,
    onClose,
    onSuccess,
}: {
    subjectId: string;
    isOpen: boolean;
    onClose: () => void;
    subjectQuestions: any[];
    subjectPools: any[];
    onSuccess: (data: any) => void;
}) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        duration_minutes: 45,
        passing_score: 5.0,
        max_attempts: 1,
        quiz_type: "FIXED_QUESTION",
        placement_type: "STANDALONE_LESSON",
        is_peer_review: false,
        is_active: true,
    });

    // Reset form khi mở lại Drawer
    useEffect(() => {
        if (isOpen) {
            setFormData({
                title: "", description: "", duration_minutes: 45, passing_score: 5.0, max_attempts: 1,
                quiz_type: "FIXED_QUESTION", placement_type: "STANDALONE_LESSON", is_peer_review: false, is_active: true,
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSuccess(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Overlay nền đen mờ - Bấm ra ngoài để đóng */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer trượt từ phải sang (Width cố định hoặc responsive) */}
            <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">

                {/* Header cố định */}
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                    <h2 className="text-lg font-semibold text-slate-900">Tạo bài thi mới</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl">
                        &times;
                    </button>
                </div>

                {/* Nội dung Form cuộn được */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tên bài thi *</label>
                        <input
                            required
                            type="text"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Nhập tên bài kiểm tra..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
                        <textarea
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Nhập mô tả ngắn gọn..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Thời gian (phút)</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.duration_minutes}
                                onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Điểm đạt (trên 10)</label>
                            <input
                                type="number" step="0.5"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.passing_score}
                                onChange={(e) => setFormData({ ...formData, passing_score: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Loại đề</label>
                        <select
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                            value={formData.quiz_type}
                            onChange={(e) => setFormData({ ...formData, quiz_type: e.target.value })}
                        >
                            <option value="FIXED_QUESTION">Đề cố định (Thủ công chọn câu hỏi)</option>
                            <option value="RANDOM_QUESTION">Đề ngẫu nhiên (Lấy từ Kho câu hỏi)</option>
                        </select>
                    </div>
                </div>

                {/* Footer cố định ở dưới cùng */}
                <div className="px-6 py-4 border-t border-slate-200 bg-gray-50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                        Lưu & Tạo mới
                    </button>
                </div>

            </div>
        </div>
    );
}