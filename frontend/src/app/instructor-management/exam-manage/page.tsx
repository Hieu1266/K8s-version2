"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Subject, SubjectStatus } from "@/types/exam-management";

export default function InstructorSubjectsPage() {
  // Mock dữ liệu khớp với SQLModel Subject
  const [subjects] = useState<Subject[]>([
    {
      subject_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      course_id: "c8f2d1e0-8a1a-4b9e-9d2c-3f4e5a6b7c8d",
      title: "Lập trình Hướng đối tượng với Java",
      description:
        "Cung cấp kiến thức về Encapsulation, Inheritance, Polymorphism và Abstraction.",
      order_index: 1,
      status_id: "PUBLISHED",
      course_title: "Công nghệ Thông tin K48",
      total_modules: 5,
      total_quizzes: 4,
    },
    {
      subject_id: "b1f3c882-7d22-4e92-9e1d-8f921a418b22",
      course_id: "c8f2d1e0-8a1a-4b9e-9d2c-3f4e5a6b7c8d",
      title: "Mạng máy tính & Lập trình Socket",
      description:
        "Cấu trúc mạng OSI/TCP-IP, định tuyến OSPF và lập trình truyền thông Socket.",
      order_index: 2,
      status_id: "PUBLISHED",
      course_title: "Công nghệ Thông tin K48",
      total_modules: 4,
      total_quizzes: 3,
    },
    {
      subject_id: "c2d4e993-8e33-4f03-af2e-9a032b529c33",
      course_id: "d9e3f2a1-9b2b-5c0f-0e3d-4a5b6c7d8e9f",
      title: "Cơ sở dữ liệu Quan hệ",
      description:
        "Mô hình ER, chuẩn hóa dữ liệu, truy vấn SQL nâng cao và quản lý giao dịch.",
      order_index: 1,
      status_id: "DRAFT",
      course_title: "Hệ thống Thông tin K49",
      total_modules: 6,
      total_quizzes: 2,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | SubjectStatus>(
    "ALL",
  );

  // Helper render badge trạng thái chuẩn theo Enum backend
  const renderStatusBadge = (status: SubjectStatus) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
            ● Đã duyệt
          </span>
        );
      case "DRAFT":
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
            ○ Bản nháp
          </span>
        );
      case "ARCHIVED":
        return (
          <span className="bg-slate-100 text-slate-500 border border-slate-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
            🔒 Hết hạn
          </span>
        );
    }
  };

  // Filter dữ liệu
  const filteredSubjects = subjects.filter((subject) => {
    const matchesSearch =
      subject.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.subject_id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      selectedStatus === "ALL" || subject.status_id === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <Navbar />

      {/* Header Banner */}
      <section className="bg-gradient-to-r from-[#66CCFF] to-[#0066FF] text-white py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              {/* Điều hướng Quay về Dashboard & Badge Cổng Giảng Viên */}
              <div className="flex items-center gap-3 mb-3">
                <Link
                  href="/instructor-management"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 rounded-full transition"
                >
                  ← Bàn làm việc
                </Link>
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                  Cổng Giảng Viên
                </span>
              </div>

              <h1 className="text-3xl font-bold">Quản lý bài thi</h1>
              <p className="text-blue-100 text-sm mt-1">
                Danh sách các Môn học bạn phụ trách.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 text-right shrink-0">
              <span className="text-xs text-blue-100 block font-medium">
                Tổng số Môn học
              </span>
              <span className="text-2xl font-extrabold">
                {subjects.length} Môn
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        {/* Bộ lọc và Tìm kiếm */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              🔍
            </span>
            <input
              type="text"
              placeholder="Tìm theo tên môn, mô tả hoặc UUID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0066FF] outline-none"
            />
          </div>

          <div className="flex gap-2">
            {(["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    selectedStatus === status
                      ? "bg-[#0066FF] text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {status === "ALL" ? "Tất cả" : status}
                </button>
              ),
            )}
          </div>
        </div>

        {/* List Môn học */}
        {filteredSubjects.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <p className="text-slate-400 font-medium text-sm">
              Không tìm thấy môn học nào phù hợp.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubjects.map((subject) => (
              <div
                key={subject.subject_id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-[#0066FF] hover:shadow-lg transition flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6">
                  {/* Status & Order Index */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
                      Thứ tự: #{subject.order_index}
                    </span>
                    {renderStatusBadge(subject.status_id)}
                  </div>

                  {/* Tên Môn học & Khóa học */}
                  <span className="text-xs font-semibold text-[#0066FF] block mb-1">
                    📚 {subject.course_title || "Chưa gán khóa học"}
                  </span>
                  <h2 className="text-lg font-bold text-slate-800 group-hover:text-[#0066FF] transition line-clamp-1">
                    {subject.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {subject.description}
                  </p>

                  {/* Thống kê Modules & Quizzes */}
                  <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-slate-100">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                      <span className="text-[11px] text-slate-400 block font-medium">
                        Modules
                      </span>
                      <span className="text-sm font-bold text-slate-700">
                        {subject.total_modules || 0} Học phần
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                      <span className="text-[11px] text-slate-400 block font-medium">
                        Bài thi (Quizzes)
                      </span>
                      <span className="text-sm font-bold text-slate-700">
                        {subject.total_quizzes || 0} Đề thi
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Link chuyển hướng kèm Subject ID */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                  <span
                    className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]"
                    title={subject.subject_id}
                  >
                    {subject.subject_id}
                  </span>
                  <Link
                    href={`/instructor-management/exam-manage/${subject.subject_id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#0066FF] hover:text-blue-700 group-hover:translate-x-1 transition-transform"
                  >
                    Quản lý đề thi →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
