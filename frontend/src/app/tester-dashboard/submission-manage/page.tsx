"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Loader2, AlertCircle, Search, X, FileCheck, ChevronRight, Inbox } from "lucide-react";
import { getTesterAssignedSubjectsAction, TesterSubjectSummary } from "@/actions/getTesterSubject";
import { getTotalQuizzesBySubjectAction } from "@/actions/getQuizzes";

export default function TesterSubmissionManageSubjectsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [subjects, setSubjects] = useState<TesterSubjectSummary[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => {
            getTesterAssignedSubjectsAction(searchTerm)
                .then(async (res) => {
                    if (res.success) {
                        const list = res.data || [];
                        // Môn học nằm ở Course Service, còn số lượng bài thi nằm ở Quiz Service
                        // (khác microservice) nên phải gọi bổ sung API get-total-quizzes cho từng môn.
                        const withQuizCount = await Promise.all(
                            list.map(async (sub) => ({
                                ...sub,
                                total_quizzes: await getTotalQuizzesBySubjectAction(sub.subject_id),
                            }))
                        );
                        setSubjects(withQuizCount);
                        setError(null);
                    } else {
                        setError(res.error || "Không thể tải danh sách môn học được giao.");
                    }
                })
                .finally(() => setLoading(false));
        }, 400);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800">
            <Navbar />

            {/* Header Banner */}
            <section className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white py-10 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <Link
                                    href="/tester-dashboard"
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 rounded-full transition"
                                >
                                    ← Bàn làm việc
                                </Link>
                                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                                    Bài thi được giao
                                </span>
                            </div>
                            <h1 className="text-3xl font-bold">Chấm điểm bài thi</h1>
                            <p className="text-orange-50 text-sm mt-1">
                                Bước 1: Chọn môn học bạn được Giảng viên phân công để xem các bài thi cần chấm điểm.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <section className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                {/* Tìm kiếm */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm theo tên môn học..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none transition"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500 bg-white rounded-2xl border border-slate-200">
                        <Loader2 size={32} className="animate-spin text-orange-500" />
                        <p className="text-sm font-semibold">Đang tải danh sách môn học...</p>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-700 text-sm flex items-center justify-center gap-2">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Empty */}
                {!loading && !error && subjects.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 text-center p-6">
                        <Inbox size={40} className="text-slate-300 mb-2" />
                        <h3 className="text-base font-bold text-slate-700">Chưa được giao môn học nào</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Bạn chưa được Giảng viên phân công môn học nào để chấm điểm.
                        </p>
                    </div>
                )}

                {/* Dynamic List */}
                {!loading && !error && subjects.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subjects.map((sub) => (
                            <div
                                key={sub.subject_id}
                                className="bg-white rounded-2xl border border-slate-200 hover:border-orange-400 hover:shadow-lg transition flex flex-col justify-between overflow-hidden group"
                            >
                                <div className="p-6">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                                            <FileCheck size={20} />
                                        </div>
                                        <h2 className="text-base font-bold text-slate-800 group-hover:text-orange-500 transition line-clamp-1">
                                            {sub.title}
                                        </h2>
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                        {sub.description || "Chưa có mô tả môn học."}
                                    </p>

                                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                                        <span className="text-slate-500">Tổng bài thi:</span>
                                        <span className="font-bold text-slate-800">{sub.total_quizzes || 0} bài</span>
                                    </div>
                                </div>

                                <Link
                                    href={`/tester-dashboard/submission-manage/${sub.subject_id}`}
                                    className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 text-xs font-bold text-orange-500 hover:bg-orange-50 flex items-center justify-between transition"
                                >
                                    <span>Chọn bài thi cần chấm</span>
                                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
