"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
    ArrowLeft,
    Loader2,
    Search,
    CheckCircle,
    Clock,
    Edit3,
    X,
    ExternalLink,
} from "lucide-react";

// Enum định nghĩa chuẩn theo Backend
type SubmissionStatus = "IN_PROGRESS" | "SUBMITTED" | "GRADED";

interface SubmissionItem {
    submission_id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    attempt_number: number;
    status: SubmissionStatus;
    started_at: string;
    submitted_at?: string;
    total_score?: number;
    is_passed?: boolean;
}

interface EssayDetail {
    detail_id: string;
    question_title: string;
    essay_answer_text?: string;
    graph_image_url?: string;
    max_points: number;
    score_earned?: number;
    teacher_feedback?: string;
}

export default function QuizSubmissionsPage({
    params,
}: {
    params: Promise<{ subject_id: string; quiz_id: string }>;
}) {
    const { subject_id, quiz_id } = use(params);

    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);

    // State cho Modal Chấm bài Tự Luận
    const [selectedSubmission, setSelectedSubmission] = useState<SubmissionItem | null>(null);
    const [gradingDetails, setGradingDetails] = useState<EssayDetail[]>([]);
    const [isGradingOpen, setIsGradingOpen] = useState(false);
    const [savingGrade, setSavingGrade] = useState(false);

    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => {
            setSubmissions([
                {
                    submission_id: "sub-001",
                    user_id: "user-101",
                    user_name: "Nguyễn Văn A",
                    user_email: "a.nguyen@student.edu.vn",
                    attempt_number: 1,
                    status: "SUBMITTED",
                    started_at: "2026-03-29 08:00",
                    submitted_at: "2026-03-29 08:35",
                    total_score: 6.0,
                    is_passed: false,
                },
                {
                    submission_id: "sub-002",
                    user_id: "user-102",
                    user_name: "Trần Thị B",
                    user_email: "b.tran@student.edu.vn",
                    attempt_number: 2,
                    status: "GRADED",
                    started_at: "2026-03-29 09:00",
                    submitted_at: "2026-03-29 09:40",
                    total_score: 8.5,
                    is_passed: true,
                },
                {
                    submission_id: "sub-003",
                    user_id: "user-103",
                    user_name: "Lê Hoàng C",
                    user_email: "c.le@student.edu.vn",
                    attempt_number: 1,
                    status: "IN_PROGRESS",
                    started_at: "2026-03-29 10:10",
                },
            ]);
            setLoading(false);
        }, 400);

        return () => clearTimeout(timer);
    }, [quiz_id]);

    // Lọc dữ liệu
    const filteredList = submissions.filter((item) => {
        const matchStatus = statusFilter === "ALL" || item.status === statusFilter;
        const matchSearch =
            item.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.user_email.toLowerCase().includes(searchTerm.toLowerCase());
        return matchStatus && matchSearch;
    });

    // Mở Modal chấm điểm
    const handleOpenGrading = (sub: SubmissionItem) => {
        setSelectedSubmission(sub);
        // Mock dữ liệu SubmissionDetail tự luận từ DB
        setGradingDetails([
            {
                detail_id: "dt-01",
                question_title: "Câu 1: Viết phương trình tiếp tuyến và biểu diễn đồ thị hàm số f(x) = x^2 - 2x",
                essay_answer_text: "<p>Phương trình tiếp tuyến tại điểm x0 = 1 là y = -1.</p>",
                graph_image_url: "https://via.placeholder.com/600x300.png?text=Graph+Image+From+Storage",
                max_points: 2.0,
                score_earned: sub.status === "GRADED" ? 2.0 : undefined,
                teacher_feedback: sub.status === "GRADED" ? "Đồ thị chính xác, lời giải ngắn gọn." : "",
            },
        ]);
        setIsGradingOpen(true);
    };

    // Lưu kết quả chấm điểm
    const handleSaveGrade = () => {
        setSavingGrade(true);
        setTimeout(() => {
            setSubmissions((prev) =>
                prev.map((item) =>
                    item.submission_id === selectedSubmission?.submission_id
                        ? { ...item, status: "GRADED", total_score: 8.0, is_passed: true }
                        : item
                )
            );
            setSavingGrade(false);
            setIsGradingOpen(false);
        }, 500);
    };

    const getStatusBadge = (status: SubmissionStatus) => {
        switch (status) {
            case "GRADED":
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                        <CheckCircle size={12} /> Đã chấm
                    </span>
                );
            case "SUBMITTED":
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                        <Clock size={12} /> Chờ chấm
                    </span>
                );
            case "IN_PROGRESS":
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        Đang làm bài
                    </span>
                );
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800">
            <Navbar />

            {/* Header */}
            <section className="bg-gradient-to-r from-[#0052D4] via-[#0066FF] to-[#4364F7] text-white py-8 px-6">
                <div className="max-w-7xl mx-auto">
                    <Link
                        href={`/instructor-management/submission-manage/${subject_id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 rounded-full mb-3 transition"
                    >
                        <ArrowLeft size={14} /> Danh sách bài thi
                    </Link>
                    <h1 className="text-2xl font-bold">Danh Sách Bài Nộp Của Thí Sinh</h1>
                    <p className="text-xs text-blue-100 mt-1">Quiz ID: {quiz_id}</p>
                </div>
            </section>

            {/* Content */}
            <section className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                {/* Filters */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm theo tên học viên, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0066FF] outline-none"
                        />
                    </div>

                    <div className="flex gap-2">
                        {[
                            { key: "ALL", label: "Tất cả" },
                            { key: "SUBMITTED", label: "Chờ chấm" },
                            { key: "GRADED", label: "Đã chấm" },
                            { key: "IN_PROGRESS", label: "Đang làm" },
                        ].map((st) => (
                            <button
                                key={st.key}
                                onClick={() => setStatusFilter(st.key)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${statusFilter === st.key
                                        ? "bg-[#0066FF] text-white"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                            >
                                {st.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500">
                            <Loader2 className="animate-spin mx-auto text-[#0066FF] mb-2" size={28} />
                            Đang tải bài nộp...
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                                    <th className="py-3.5 px-6">Thí sinh</th>
                                    <th className="py-3.5 px-4 text-center">Lần làm</th>
                                    <th className="py-3.5 px-4">Thời gian nộp</th>
                                    <th className="py-3.5 px-4 text-center">Trạng thái</th>
                                    <th className="py-3.5 px-4 text-center">Điểm số</th>
                                    <th className="py-3.5 px-6 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {filteredList.map((item) => (
                                    <tr key={item.submission_id} className="hover:bg-slate-50 transition">
                                        <td className="py-4 px-6 font-medium">
                                            <div className="font-bold text-slate-800">{item.user_name}</div>
                                            <div className="text-[11px] text-slate-400">{item.user_email}</div>
                                        </td>
                                        <td className="py-4 px-4 text-center font-bold text-slate-600">
                                            Lần {item.attempt_number}
                                        </td>
                                        <td className="py-4 px-4 text-slate-500">
                                            {item.submitted_at || "--"}
                                        </td>
                                        <td className="py-4 px-4 text-center">{getStatusBadge(item.status)}</td>
                                        <td className="py-4 px-4 text-center font-bold text-sm">
                                            {item.total_score !== undefined ? (
                                                <span className={item.is_passed ? "text-emerald-600" : "text-rose-600"}>
                                                    {item.total_score} pts
                                                </span>
                                            ) : (
                                                <span className="text-slate-300">--</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            {item.status !== "IN_PROGRESS" && (
                                                <button
                                                    onClick={() => handleOpenGrading(item)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-[#0066FF] hover:bg-blue-100 font-bold transition"
                                                >
                                                    <Edit3 size={14} />
                                                    {item.status === "SUBMITTED" ? "Chấm bài" : "Xem / Sửa điểm"}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>

            {/* Modal Chấm Bài Tự Luận */}
            {isGradingOpen && selectedSubmission && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center p-4">
                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-slate-800">
                                    Chấm điểm bài nộp: {selectedSubmission.user_name}
                                </h3>
                                <p className="text-xs text-slate-500">Lần nộp: {selectedSubmission.attempt_number}</p>
                            </div>
                            <button
                                onClick={() => setIsGradingOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            {gradingDetails.map((detail, idx) => (
                                <div key={detail.detail_id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                                    <div className="font-bold text-sm text-slate-800">{detail.question_title}</div>

                                    {/* Nội dung Tự luận dạng Text/HTML */}
                                    {detail.essay_answer_text && (
                                        <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700">
                                            <span className="text-[10px] font-bold text-slate-400 block mb-1">CÂU TRẢ LỜI TEXT:</span>
                                            <div dangerouslySetInnerHTML={{ __html: detail.essay_answer_text }} />
                                        </div>
                                    )}

                                    {/* Ảnh đồ thị/vẽ hình gửi từ Storage Service */}
                                    {detail.graph_image_url && (
                                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                                            <span className="text-[10px] font-bold text-slate-400 block mb-1">ĐỒ THỊ / HÌNH VẼ NỘP:</span>
                                            <img
                                                src={detail.graph_image_url}
                                                alt="Đồ thị bài nộp"
                                                className="max-h-60 rounded border object-contain"
                                            />
                                            <a
                                                href={detail.graph_image_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[11px] text-[#0066FF] hover:underline inline-flex items-center gap-1 mt-2"
                                            >
                                                <ExternalLink size={12} /> Xem ảnh kích thước đầy đủ
                                            </a>
                                        </div>
                                    )}

                                    {/* Nhập điểm và Nhận xét */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">
                                                Điểm đạt được (Tối đa {detail.max_points}đ)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.25"
                                                max={detail.max_points}
                                                defaultValue={detail.score_earned || 0}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold focus:ring-[#0066FF] outline-none"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-600 mb-1">
                                                Nhận xét của Giảng viên
                                            </label>
                                            <input
                                                type="text"
                                                defaultValue={detail.teacher_feedback || ""}
                                                placeholder="Nhập góp ý, nhận xét..."
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-[#0066FF] outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button
                                onClick={() => setIsGradingOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveGrade}
                                disabled={savingGrade}
                                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0066FF] text-white hover:bg-blue-700 transition flex items-center gap-1.5"
                            >
                                {savingGrade && <Loader2 size={14} className="animate-spin" />}
                                Lưu kết quả chấm điểm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}