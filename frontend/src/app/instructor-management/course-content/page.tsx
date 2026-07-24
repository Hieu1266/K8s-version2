"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { InstructorStatistics } from "@/types/statistic";
import { GeneralInfoInstructorSubject } from "@/types/subject";
import { fetchInstructorStatistics } from "@/actions/getStatistic";
import { getInstructorGeneralInfoAction } from "@/actions/getSubject";
import {
  Search,
  BookOpen,
  FolderKanban,
  FileQuestion,
  ArrowRight,
  CheckCircle,
  FileText,
  AlertCircle,
  Loader2,
  X,
  HelpCircle,
  Layers,
  Info,
} from "lucide-react";

const getStatusBadge = (statusId: string) => {
  switch (statusId) {
    case "SUBJECT_ACTIVE":
      return {
        text: "Đang giảng dạy",
        className: "bg-emerald-100/80 text-emerald-700 border-emerald-200",
      };
    case "SUBJECT_DEVELOPING":
      return {
        text: "Đang biên soạn",
        className: "bg-amber-100/80 text-amber-700 border-amber-200",
      };
    case "SUBJECT_SUSPENDED":
      return {
        text: "Tạm dừng",
        className: "bg-rose-100/80 text-rose-700 border-rose-200",
      };
    default:
      return {
        text: "Khác",
        className: "bg-slate-100 text-slate-700 border-slate-200",
      };
  }
};

export default function CourseContentPage() {
  const router = useRouter();

  // State tìm kiếm
  const [searchTerm, setSearchTerm] = useState("");

  // States Thống kê
  const [stats, setStats] = useState<InstructorStatistics | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  // States Danh sách môn học
  const [subjects, setSubjects] = useState<GeneralInfoInstructorSubject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState<boolean>(true);
  const [errorSubjects, setErrorSubjects] = useState<string | null>(null);

  // 1. Fetch Thống kê
  useEffect(() => {
    setLoadingStats(true);
    fetchInstructorStatistics()
      .then((data) => {
        if (data) setStats(data);
      })
      .catch((err) =>
        console.error("Lỗi đồng bộ thống kê:", err?.message || err),
      )
      .finally(() => setLoadingStats(false));
  }, []);

  // 2. Fetch danh sách môn học phân công
  useEffect(() => {
    setLoadingSubjects(true);
    setErrorSubjects(null);

    const timer = setTimeout(() => {
      getInstructorGeneralInfoAction(searchTerm)
        .then((data) => setSubjects(data || []))
        .catch((err) => {
          console.error("Lỗi tải môn học:", err?.message || err);
          setErrorSubjects(
            err?.message || "Không thể tải danh sách môn học được phân công.",
          );
        })
        .finally(() => setLoadingSubjects(false));
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Banner Header */}
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Môn Học Được Phân Công
            </h1>
            <p className="text-slate-500 text-sm sm:text-base mt-1 max-w-2xl">
              Danh sách các môn học bạn phụ trách giảng dạy. Nhấn vào từng môn
              học để cập nhật bài học, tài nguyên và đề cương.
            </p>
          </div>

        </div>

        {/* Khối Thống kê */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Môn Đảm Nhận
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {loadingStats ? (
                  <Loader2 className="animate-spin text-slate-400" size={20} />
                ) : (
                  (stats?.total_subjects ?? 0)
                )}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <FolderKanban size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tổng Số Module
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {loadingStats ? (
                  <Loader2 className="animate-spin text-slate-400" size={20} />
                ) : (
                  (stats?.total_modules ?? 0)
                )}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Đang Giảng Dạy
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {loadingStats ? (
                  <Loader2 className="animate-spin text-slate-400" size={20} />
                ) : (
                  (stats?.total_active_subject ?? 0)
                )}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Đang Biên Soạn
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {loadingStats ? (
                  <Loader2 className="animate-spin text-slate-400" size={20} />
                ) : (
                  (stats?.total_developing_subject ?? 0)
                )}
              </h3>
            </div>
          </div>
        </div>

        {/* Ô Tìm kiếm */}
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Tìm kiếm môn học theo tên hoặc mã môn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl bg-white border border-slate-200 py-3 pl-11 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition shadow-sm"
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

        {/* Loading */}
        {loadingSubjects && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <p className="text-sm font-medium">Đang tải danh sách môn học...</p>
          </div>
        )}

        {/* Error */}
        {!loadingSubjects && errorSubjects && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-center text-rose-600 text-sm flex items-center justify-center gap-2">
            <AlertCircle size={18} />
            <span>{errorSubjects}</span>
          </div>
        )}

        {/* Danh sách Môn học dạng Grid */}
        {!loadingSubjects && !errorSubjects && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subjects.map((subject) => {
              const statusConfig = getStatusBadge(subject.status_id);

              return (
                <div
                  key={subject.subject_id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start gap-3">
                      <h2
                        onClick={() =>
                          router.push(
                            `/instructor-management/course-content/${subject.subject_id}`,
                          )
                        }
                        className="text-lg font-bold text-slate-800 hover:text-blue-600 transition cursor-pointer line-clamp-2 leading-snug"
                      >
                        {subject.title}
                      </h2>

                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${statusConfig.className}`}
                      >
                        {statusConfig.text}
                      </span>
                    </div>

                    <p className="text-slate-600 text-sm leading-relaxed line-clamp-2">
                      {subject.description || "Chưa có mô tả môn học."}
                    </p>

                    <div className="pt-2 flex items-center gap-6 text-xs text-slate-600 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Layers size={16} className="text-blue-500" />
                        <span>
                          <strong>{subject.total_modules || 0}</strong> Modules
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium">
                        <FileQuestion size={16} className="text-indigo-500" />
                        <span>
                          <strong>{subject.total_lessons || 0}</strong> Bài học
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Card: Điều hướng trực tiếp vào biên soạn nội dung */}
                  <div className="bg-slate-50/80 px-6 py-3.5 border-t border-slate-200 rounded-b-xl flex items-center justify-between gap-3">
                    <button
                      onClick={() =>
                        router.push(
                          `/instructor-management/questions-bank/${subject.subject_id}`,
                        )
                      }
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
                    >
                      <HelpCircle size={15} />
                      Ngân hàng câu hỏi
                    </button>

                    <button
                      onClick={() =>
                        router.push(
                          `/instructor-management/course-content/${subject.subject_id}`,
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
                    >
                      Soạn nội dung & Đề cương
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loadingSubjects && !errorSubjects && subjects.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3 shadow-sm">
            <AlertCircle size={36} className="text-slate-400" />
            <p className="text-sm font-medium">
              {searchTerm
                ? `Không tìm thấy môn học nào khớp với từ khóa "${searchTerm}".`
                : "Bạn hiện chưa được phân công đảm nhận môn học nào."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
