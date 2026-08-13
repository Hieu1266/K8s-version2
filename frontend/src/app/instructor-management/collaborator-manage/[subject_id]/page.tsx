"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
    Users,
    ArrowLeft,
    Search,
    X,
    Loader2,
    AlertCircle,
    UserPlus,
    UserMinus,
    Mail,
} from "lucide-react";
import { getSubjectByIdAction } from "@/actions/getSubject";
import { getTesterListAction } from "@/actions/getUser";
import {
    getSubjectCollaboratorsAction,
    addSubjectCollaboratorAction,
    removeSubjectCollaboratorAction,
} from "@/actions/getCollaborator";
import { SubjectData } from "@/types/subjects";
import { CourseCollaborator } from "@/types/collaborator";
import { UserGeneralInfo } from "@/types/user";

export default function SubjectCollaboratorPage() {
    const router = useRouter();
    const params = useParams();
    const subjectId = params.subject_id as string;

    const [subject, setSubject] = useState<SubjectData | null>(null);
    const [collaborators, setCollaborators] = useState<CourseCollaborator[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [removingId, setRemovingId] = useState<string | null>(null);

    // Modal thêm CTV
    const [showAddModal, setShowAddModal] = useState(false);
    const [testerSearch, setTesterSearch] = useState("");
    const [testers, setTesters] = useState<UserGeneralInfo[]>([]);
    const [testersLoading, setTestersLoading] = useState(false);
    const [testersError, setTestersError] = useState<string | null>(null);
    const [addingId, setAddingId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [subjectData, collabData] = await Promise.all([
                getSubjectByIdAction(subjectId),
                getSubjectCollaboratorsAction(subjectId),
            ]);
            setSubject(subjectData);
            setCollaborators(collabData || []);
        } catch (err: any) {
            console.error("Lỗi tải dữ liệu cộng tác viên:", err?.message || err);
            setError(err?.message || "Không thể tải dữ liệu môn học.");
        } finally {
            setLoading(false);
        }
    }, [subjectId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Danh sách Tester để thêm (loại trừ những người đã là CTV), có debounce tìm kiếm
    useEffect(() => {
        if (!showAddModal) return;

        setTestersLoading(true);
        setTestersError(null);

        const timer = setTimeout(() => {
            getTesterListAction(testerSearch)
                .then((res) => {
                    if (!res.success) {
                        setTestersError(res.message || "Không thể tải danh sách Tester.");
                        setTesters([]);
                        return;
                    }
                    setTesters((res.list as UserGeneralInfo[]) || []);
                })
                .catch((err) => setTestersError(err?.message || "Lỗi tải danh sách Tester."))
                .finally(() => setTestersLoading(false));
        }, 350);

        return () => clearTimeout(timer);
    }, [showAddModal, testerSearch]);

    const assignedIds = new Set(collaborators.map((c) => c.collaborator_id));
    const availableTesters = testers.filter((t) => !assignedIds.has(t.user_id));

    async function handleRemove(collaboratorId: string) {
        setRemovingId(collaboratorId);
        try {
            await removeSubjectCollaboratorAction(subjectId, collaboratorId);
            setCollaborators((prev) => prev.filter((c) => c.collaborator_id !== collaboratorId));
        } catch (err: any) {
            alert(err?.message || "Không thể xóa cộng tác viên này.");
        } finally {
            setRemovingId(null);
        }
    }

    async function handleAdd(tester: UserGeneralInfo) {
        setAddingId(tester.user_id);
        try {
            const newLink = await addSubjectCollaboratorAction(subjectId, tester.user_id);
            setCollaborators((prev) => [
                ...prev,
                { ...newLink, username: tester.username },
            ]);
        } catch (err: any) {
            alert(err?.message || "Không thể thêm cộng tác viên này.");
        } finally {
            setAddingId(null);
        }
    }

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
            <Navbar />

            {/* Hero Header */}
            <section className="relative overflow-hidden bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] text-white py-10 px-6 shadow-md">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 right-10 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl pointer-events-none" />

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <button
                            onClick={() => router.push("/instructor-management/collaborator-manage")}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 rounded-full transition backdrop-blur-md"
                        >
                            <ArrowLeft size={13} /> Danh sách môn học
                        </button>
                        <span className="text-xs font-bold uppercase tracking-wider bg-white/20 text-purple-50 px-3 py-1 rounded-full backdrop-blur-md">
                            Cộng Tác Viên
                        </span>
                    </div>

                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
                        {subject?.title || "Đang tải..."}
                    </h1>
                    <p className="text-purple-100 mt-2 text-sm md:text-base max-w-2xl leading-relaxed">
                        Danh sách cộng tác viên (Tester) đang được phân công hỗ trợ kiểm thử môn học này.
                    </p>
                </div>
            </section>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                        <Loader2 size={32} className="animate-spin text-[#8B5CF6]" />
                        <p className="text-sm font-semibold">Đang tải danh sách cộng tác viên...</p>
                    </div>
                )}

                {!loading && error && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-700 text-sm flex items-center justify-center gap-2 shadow-sm">
                        <AlertCircle size={20} />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                {!loading && !error && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between gap-4 p-5 border-b border-slate-100">
                            <div className="flex items-center gap-2 text-slate-700">
                                <Users size={18} className="text-[#8B5CF6]" />
                                <h3 className="text-sm font-bold">
                                    Cộng tác viên đã phân công{" "}
                                    <span className="text-slate-400 font-medium">({collaborators.length})</span>
                                </h3>
                            </div>

                            <button
                                onClick={() => setShowAddModal(true)}
                                className="inline-flex items-center gap-2 bg-[#8B5CF6] hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-xl text-xs sm:text-sm transition shadow-sm"
                            >
                                <UserPlus size={16} />
                                Thêm cộng tác viên
                            </button>
                        </div>

                        {/* Danh sách CTV */}
                        {collaborators.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                                    <Users size={28} />
                                </div>
                                <p className="text-sm font-semibold text-slate-700">
                                    Môn học này chưa có cộng tác viên nào.
                                </p>
                                <p className="text-xs text-slate-400 max-w-sm">
                                    Nhấn "Thêm cộng tác viên" để phân công Tester hỗ trợ kiểm thử.
                                </p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {collaborators.map((c) => (
                                    <li
                                        key={c.collab_id}
                                        className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50/60 transition"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white text-xs font-bold shadow-xs">
                                                {(c.username || "?")[0]?.toUpperCase()}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-800 truncate">
                                                    {c.username || "Không xác định tên"}
                                                </p>
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100">
                                                    Tester
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleRemove(c.collaborator_id)}
                                            disabled={removingId === c.collaborator_id}
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 bg-rose-50/50 hover:bg-rose-100/80 hover:border-rose-300 transition disabled:opacity-50 shrink-0"
                                        >
                                            {removingId === c.collaborator_id ? (
                                                <>
                                                    <Loader2 size={13} className="animate-spin" />
                                                    Đang xóa...
                                                </>
                                            ) : (
                                                <>
                                                    <UserMinus size={13} />
                                                    Xóa
                                                </>
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </main>

            {/* Modal thêm CTV */}
            {showAddModal && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setShowAddModal(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
                    >
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <UserPlus size={18} className="text-[#8B5CF6]" />
                                Thêm cộng tác viên
                            </h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-slate-400 hover:text-slate-600 p-1"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-4 border-b border-slate-100">
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Tìm theo tên hoặc email Tester..."
                                    value={testerSearch}
                                    onChange={(e) => setTesterSearch(e.target.value)}
                                    className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20 transition"
                                />
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            {testersLoading && (
                                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500">
                                    <Loader2 size={24} className="animate-spin text-[#8B5CF6]" />
                                    <p className="text-xs font-semibold">Đang tải danh sách Tester...</p>
                                </div>
                            )}

                            {!testersLoading && testersError && (
                                <div className="p-6 text-center text-rose-600 text-sm flex items-center justify-center gap-2">
                                    <AlertCircle size={16} />
                                    {testersError}
                                </div>
                            )}

                            {!testersLoading && !testersError && availableTesters.length === 0 && (
                                <div className="p-10 text-center text-slate-500 text-sm">
                                    {testerSearch
                                        ? `Không tìm thấy Tester nào khớp với "${testerSearch}".`
                                        : "Không còn Tester nào khả dụng để thêm."}
                                </div>
                            )}

                            {!testersLoading && !testersError && availableTesters.length > 0 && (
                                <ul className="divide-y divide-slate-100">
                                    {availableTesters.map((t) => (
                                        <li
                                            key={t.user_id}
                                            className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50/60 transition"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-slate-500 to-slate-600 text-white text-[11px] font-bold">
                                                    {t.username?.[0]?.toUpperCase() ?? "?"}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 truncate">{t.username}</p>
                                                    <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                                                        <Mail size={11} /> {t.email}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleAdd(t)}
                                                disabled={addingId === t.user_id}
                                                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/80 hover:border-emerald-300 transition disabled:opacity-50 shrink-0"
                                            >
                                                {addingId === t.user_id ? (
                                                    <>
                                                        <Loader2 size={13} className="animate-spin" />
                                                        Đang thêm...
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserPlus size={13} />
                                                        Thêm
                                                    </>
                                                )}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}