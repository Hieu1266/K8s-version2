"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Search,
  X,
  Layers,
  FileQuestion,
} from "lucide-react";

interface Subject {
  id: string;
  code: string;
  title: string;
  description: string;
  image: string;
  totalQuestions: number;
  totalModules: number;
}

export default function QuestionBankPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  const subjects: Subject[] = [
    {
      id: "sub001",
      code: "CNTT301",
      title: "Python Programming",
      description:
        "Lập trình Python từ cơ bản đến nâng cao, xử lý dữ liệu và cấu trúc giải thuật.",
      image: "https://picsum.photos/400/200?1",
      totalQuestions: 124,
      totalModules: 8,
    },
    {
      id: "sub002",
      code: "CNTT302",
      title: "ReactJS & Next.js",
      description:
        "Xây dựng ứng dụng Web Single Page và Server-Side Rendering hiện đại.",
      image: "https://picsum.photos/400/200?2",
      totalQuestions: 96,
      totalModules: 10,
    },
    {
      id: "sub003",
      code: "CNTT401",
      title: "Java Spring Boot",
      description:
        "Phát triển hệ thống Backend doanh nghiệp với Spring Framework và RESTful API.",
      image: "https://picsum.photos/400/200?3",
      totalQuestions: 158,
      totalModules: 12,
    },
    {
      id: "sub004",
      code: "CNTT210",
      title: "Database Systems",
      description:
        "Cơ sở dữ liệu quan hệ, thiết kế ERD và truy vấn SQL tối ưu hiệu năng.",
      image: "https://picsum.photos/400/200?4",
      totalQuestions: 84,
      totalModules: 7,
    },
  ];

  // Lọc môn học theo từ khóa
  const filteredSubjects = subjects.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      <Navbar />

      {/* Hero Header Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#0052D4] via-[#0066FF] to-[#4364F7] text-white py-10 px-6 shadow-md">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Link
                  href="/instructor-management"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 rounded-full transition backdrop-blur-md"
                >
                  <ArrowLeft size={13} /> Bàn làm việc
                </Link>
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 text-blue-50 px-3 py-1 rounded-full backdrop-blur-md">
                  Ngân Hàng Đề
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
                Ngân Hàng Câu Hỏi
              </h1>
              <p className="text-blue-100 mt-2 text-sm md:text-base max-w-2xl leading-relaxed">
                Chọn môn học để biên soạn, phân loại độ khó và quản lý bộ câu
                hỏi trắc nghiệm/tự luận.
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Thanh Tìm kiếm & Lọc */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Tìm kiếm môn học theo tên môn hoặc mã môn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 pl-11 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 transition"
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

        {/* Danh sách Môn học dạng Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubjects.map((subject) => (
            <div
              key={subject.id}
              className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-200 flex flex-col justify-between overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#0066FF] opacity-0 group-hover:opacity-100 transition-opacity z-10" />

              <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                <img
                  src={subject.image}
                  alt={subject.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider">
                  {subject.code}
                </div>
              </div>

              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3
                    onClick={() =>
                      router.push(
                        `/instructor-management/questions-bank/${subject.id}`,
                      )
                    }
                    className="text-lg font-bold text-slate-900 group-hover:text-[#0066FF] transition cursor-pointer line-clamp-1"
                  >
                    {subject.title}
                  </h3>

                  <p className="text-slate-500 text-xs sm:text-sm mt-1.5 leading-relaxed line-clamp-2">
                    {subject.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-100/70 text-[#0066FF] flex items-center justify-center shrink-0">
                      <HelpCircle size={16} />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">
                        Câu hỏi
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {subject.totalQuestions}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0">
                      <Layers size={16} />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">
                        Module
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {subject.totalModules}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0">
                <button
                  onClick={() =>
                    router.push(
                      `/instructor-management/questions-bank/${subject.id}`,
                    )
                  }
                  className="w-full bg-[#0066FF] hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-sm group-hover:shadow-md"
                >
                  Quản lý câu hỏi
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredSubjects.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <FileQuestion size={28} />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              Không tìm thấy môn học nào khớp với từ khóa "{searchTerm}".
            </p>
            <p className="text-xs text-slate-400 max-w-sm">
              Vui lòng thử lại với tên môn học hoặc mã môn học khác.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
