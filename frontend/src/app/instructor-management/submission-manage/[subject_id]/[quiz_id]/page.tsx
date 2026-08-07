"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Loader2, ArrowLeft, AlertCircle, ChevronRight, User, Mail, Inbox, FileText } from "lucide-react";
import { getQuizUsersSummaryAction } from "@/actions/getQuizSubmission";
import { QuizUserSummaryItem } from "@/types/quiz-submission";

export default function QuizUsersPage({
    params,
}: {
    params: Promise<{ subject_id: string; quiz_id: string }>;
}) {
    const { subject_id, quiz_id } = use(params);

    const [users, setUsers] = useState<QuizUserSummaryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchUsers() {
            setLoading(true);
            setError(null);
            const res = await getQuizUsersSummaryAction(quiz_id);
            if (res.success && res.data) {
                setUsers(res.data);
            } else {
                setError(res.error || "Không thể tải danh sách học viên.");
            }
            setLoading(false);
        }

        if (quiz_id) fetchUsers();
    }, [quiz_id]);

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800">
            <Navbar />

            <section className="bg-gradient-to-r from-[#0052D4] via-[#0066FF] to-[#4364F7] text-white py-10 px-6">
                <div className="max-w-7xl mx-auto">
                    <Link
                        href={`/instructor-management/submission-manage/${subject_id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 rounded-full mb-3 transition"
                    >
                        <ArrowLeft size={14} /> Quay lại danh sách bài thi
                    </Link>
                    <h1 className="text-3xl font-bold">Danh sách học viên làm bài</h1>
                    <p className="text-blue-100 text-sm mt-1">
                        Quiz ID: <span className="font-mono text-cyan-200">{quiz_id}</span>
                    </p>
                </div>
            </section>

            <section className="max-w-7xl mx-auto px-6 py-8">
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
                        <Loader2 size={32} className="animate-spin text-[#0066FF] mb-2" />
                        <span className="text-xs text-slate-500 font-medium">Đang tải danh sách học viên...</span>
                    </div>
                )}

                {!loading && error && (
                    <div className="flex flex-col items-center justify-center py-12 bg-red-50 rounded-2xl border border-red-200 text-center p-6">
                        <AlertCircle size={36} className="text-red-500 mb-2" />
                        <h3 className="text-sm font-bold text-red-700">Đã xảy ra lỗi</h3>
                        <p className="text-xs text-red-600 mt-1">{error}</p>
                    </div>
                )}

                {!loading && !error && users.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 text-center p-6">
                        <Inbox size={40} className="text-slate-300 mb-2" />
                        <h3 className="text-base font-bold text-slate-700">Chưa có học viên nào làm bài</h3>
                        <p className="text-xs text-slate-500 mt-1">Chưa tìm thấy bài nộp nào cho bài thi này.</p>
                    </div>
                )}

                {!loading && !error && users.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="py-3.5 px-6">Học viên</th>
                                        <th className="py-3.5 px-6">Tổng lượt đã nộp</th>
                                        <th className="py-3.5 px-6">Lượt cần chấm</th>
                                        <th className="py-3.5 px-6">Lần nộp gần nhất</th>
                                        <th className="py-3.5 px-6 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {users.map((u) => (
                                        <tr key={u.user_id} className="hover:bg-slate-50/80 transition">
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                                        <User size={14} className="text-slate-400" />
                                                        {u.username}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                        <Mail size={12} className="text-slate-400" />
                                                        {u.email}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                                                    <FileText size={12} /> {u.total_submissions} lượt
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                {u.pending_gradings > 0 ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                                                        <AlertCircle size={12} /> {u.pending_gradings} bài cần chấm
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">0</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 text-slate-600">
                                                {u.latest_submitted_at
                                                    ? new Date(u.latest_submitted_at).toLocaleString("vi-VN")
                                                    : "--"}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <Link
                                                    href={`/instructor-management/submission-manage/${subject_id}/${quiz_id}/${u.user_id}`}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0066FF] text-white font-semibold hover:bg-blue-700 transition"
                                                >
                                                    Xem các lượt nộp <ChevronRight size={14} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}