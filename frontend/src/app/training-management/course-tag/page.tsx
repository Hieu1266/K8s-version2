"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  Search,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  Tag as TagIcon,
  Plus,
  X,
  Check,
  Save,
  Filter,
  Layers,
  Sparkles,
} from "lucide-react";

// Types definition
interface TagItem {
  tag_id: string;
  tag_name: string;
  description?: string;
}

interface CourseItem {
  course_id: string;
  title: string;
  description: string;
  tags: string[]; // Danh sách tag_name hoặc tag_id đang được gán
}

export default function CourseTagAssignmentPage() {
  // Mock Data: Danh sách Tag trong hệ thống
  const [availableTags] = useState<TagItem[]>([
    {
      tag_id: "TAG001",
      tag_name: "Lập trình Web",
      description: "Frontend, Backend & Fullstack",
    },
    { tag_id: "TAG002", tag_name: "Python", description: "Ngôn ngữ Python" },
    {
      tag_id: "TAG003",
      tag_name: "AI & Data Science",
      description: "Trí tuệ nhân tạo & Dữ liệu",
    },
    { tag_id: "TAG004", tag_name: "Cơ bản", description: "Dành cho người mới" },
    {
      tag_id: "TAG005",
      tag_name: "Nâng cao",
      description: "Chuyên sâu & Nâng cao",
    },
    {
      tag_id: "TAG006",
      tag_name: "Mobile App",
      description: "Flutter, React Native, iOS, Android",
    },
    {
      tag_id: "TAG007",
      tag_name: "DevOps",
      description: "Docker, CI/CD, Cloud",
    },
  ]);

  // Mock Data: Danh sách Khóa học
  const [courses, setCourses] = useState<CourseItem[]>([
    {
      course_id: "CRS001",
      title: "Lập trình Web Fullstack với Next.js & FastAPI",
      description:
        "Khóa học xây dựng hệ thống quản lý hoàn chỉnh từ giao diện đến API backend.",
      tags: ["Lập trình Web", "Python"],
    },
    {
      course_id: "CRS002",
      title: "Nhập môn Trí tuệ Nhân tạo & Machine Learning",
      description:
        "Cung cấp nền tảng toán học, xử lý dữ liệu và xây dựng mô hình AI cơ bản.",
      tags: ["AI & Data Science", "Python", "Cơ bản"],
    },
    {
      course_id: "CRS003",
      title: "Thiết kế Hệ thống & Phân tích Thiết kế Giải thuật",
      description:
        "Chuyên đề tối ưu cấu trúc dữ liệu, thuật toán và kiến trúc phần mềm nâng cao.",
      tags: ["Nâng cao"],
    },
  ]);

  // State quản lý UI & Modal
  const [keyword, setKeyword] = useState<string>("");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("ALL");
  const [activeCourse, setActiveCourse] = useState<CourseItem | null>(null);
  const [tempSelectedTags, setTempSelectedTags] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);

  // Mở Modal gán Tag
  const handleOpenAssignModal = (course: CourseItem) => {
    setActiveCourse(course);
    setTempSelectedTags([...course.tags]);
    setShowAssignModal(true);
  };

  // Toggle chọn/bỏ chọn Tag trong Modal
  const handleToggleTagInModal = (tagName: string) => {
    if (tempSelectedTags.includes(tagName)) {
      setTempSelectedTags(tempSelectedTags.filter((t) => t !== tagName));
    } else {
      setTempSelectedTags([...tempSelectedTags, tagName]);
    }
  };

  // Lưu gán Tag
  const handleSaveTags = () => {
    if (!activeCourse) return;
    setCourses(
      courses.map((c) =>
        c.course_id === activeCourse.course_id
          ? { ...c, tags: tempSelectedTags }
          : c,
      ),
    );
    setShowAssignModal(false);
    setActiveCourse(null);
  };

  // Lọc danh sách khóa học
  const filteredCourses = courses.filter((course) => {
    const matchesKeyword =
      course.title.toLowerCase().includes(keyword.toLowerCase()) ||
      course.course_id.toLowerCase().includes(keyword.toLowerCase());
    const matchesTag =
      selectedTagFilter === "ALL" || course.tags.includes(selectedTagFilter);
    return matchesKeyword && matchesTag;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased">
      <Navbar />

      {/* HEADER SECTION */}
      <section className="bg-gradient-to-r from-[#0066FF] to-[#0052cc] text-white pt-10 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto space-y-4 relative z-10">
          <div className="flex items-center gap-2 text-xs text-white/80 font-medium">
            <Link
              href="/training-management"
              className="hover:text-white hover:bg-white/20 flex items-center gap-1.5 transition-all bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm border border-white/10"
            >
              <ArrowLeft size={14} /> Quản lý đào tạo
            </Link>
            <ChevronRight size={12} className="opacity-50" />
            <span className="text-white font-semibold tracking-wide flex items-center gap-1.5">
              <TagIcon size={14} /> Gán Tag Khóa Học
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight drop-shadow-md">
            GÁN TAG CHO KHÓA HỌC
          </h1>
          <p className="text-sm text-blue-100 max-w-2xl font-medium leading-relaxed">
            Giao diện phân loại và liên kết các Nhãn (Tag) vào từng Khóa học
            giúp sinh viên và giảng viên dễ dàng lọc, tìm kiếm chương trình đào
            tạo.
          </p>
        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-6 -mt-14 pb-20 relative z-20">
        <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-6 md:p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] space-y-8">
          {/* TOOLBAR: SEARCH & FILTER */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search
                size={18}
                className="absolute left-4 top-3.5 text-slate-400"
              />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm khóa học theo mã hoặc tên..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#0066FF]/10 focus:border-[#0066FF] transition-all"
              />
            </div>

            {/* TAG FILTER */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 custom-scrollbar">
              <span className="text-xs font-bold text-slate-400 shrink-0 flex items-center gap-1">
                <Filter size={14} /> Lọc Tag:
              </span>
              <button
                onClick={() => setSelectedTagFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedTagFilter === "ALL"
                    ? "bg-[#0066FF] text-white shadow-md shadow-blue-500/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tất cả
              </button>
              {availableTags.map((tag) => (
                <button
                  key={tag.tag_id}
                  onClick={() => setSelectedTagFilter(tag.tag_name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedTagFilter === tag.tag_name
                      ? "bg-[#0066FF] text-white shadow-md shadow-blue-500/20"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tag.tag_name}
                </button>
              ))}
            </div>
          </div>

          {/* COURSE LIST WITH TAGS */}
          {filteredCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
              <BookOpen size={48} className="text-slate-300" />
              <p className="text-sm font-medium text-slate-500">
                Không tìm thấy khóa học nào khớp với bộ lọc.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <div
                  key={course.course_id}
                  className="bg-white border border-slate-200 hover:border-blue-300 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-5 group relative"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-extrabold uppercase bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg border border-slate-200">
                        {course.course_id}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">
                        {course.tags.length} Tag
                      </span>
                    </div>

                    <h3 className="font-extrabold text-base text-slate-800 group-hover:text-[#0066FF] transition-colors line-clamp-2">
                      {course.title}
                    </h3>

                    <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  {/* DISPLAY ASSIGNED TAGS */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center">
                      {course.tags.length > 0 ? (
                        course.tags.map((tagName, idx) => (
                          <span
                            key={idx}
                            className="bg-blue-50 text-[#0066FF] border border-blue-100 px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                          >
                            <TagIcon size={10} /> {tagName}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          Chưa được gán Tag nào
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleOpenAssignModal(course)}
                      className="w-full bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#0066FF] border border-slate-200 hover:border-blue-200 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Plus size={14} /> Quản lý / Gán Tag
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* MODAL: GÁN TAG CHO KHÓA HỌC */}
      {showAssignModal && activeCourse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[2rem] max-w-lg w-full p-8 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-[#0066FF] rounded-xl">
                  <Sparkles size={20} />
                </div>
                Cập Nhật Tag Khóa Học
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* COURSE INFO BOX */}
            <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] font-black uppercase text-[#0066FF] tracking-wider">
                Khóa học đang chọn
              </span>
              <h4 className="font-extrabold text-sm text-slate-800">
                {activeCourse.title}
              </h4>
            </div>

            {/* TAG SELECTOR GRID */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Chọn các nhãn muốn gán:
                </label>
                <span className="text-xs font-semibold text-slate-400">
                  Đã chọn:{" "}
                  <strong className="text-[#0066FF]">
                    {tempSelectedTags.length}
                  </strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {availableTags.map((tag) => {
                  const isSelected = tempSelectedTags.includes(tag.tag_name);
                  return (
                    <div
                      key={tag.tag_id}
                      onClick={() => handleToggleTagInModal(tag.tag_name)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                        isSelected
                          ? "bg-blue-50/80 border-[#0066FF] shadow-sm"
                          : "bg-slate-50/50 border-slate-200 hover:bg-slate-100/80"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border transition-colors ${
                          isSelected
                            ? "bg-[#0066FF] border-[#0066FF] text-white"
                            : "bg-white border-slate-300 text-transparent"
                        }`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span
                          className={`text-xs font-bold block truncate ${isSelected ? "text-[#0066FF]" : "text-slate-800"}`}
                        >
                          {tag.tag_name}
                        </span>
                        {tag.description && (
                          <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                            {tag.description}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-600 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveTags}
                className="px-6 py-2.5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                <Save size={16} /> Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
