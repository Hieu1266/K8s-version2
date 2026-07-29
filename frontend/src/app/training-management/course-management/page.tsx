"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Clock,
  Award,
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  Calendar,
  FileText,
  Type,
  X,
  Layers,
  Sparkles,
} from "lucide-react";

import { Course } from "@/types/course";

import { getCurriculums } from "@/actions/getCurriculum";

import {
  getCoursesAction,
  createCourseAction,
  updateCourseAction,
  deleteCourseAction,
} from "@/actions/getCourse";

// --- UTILS HELPER FUNCTIONS ---
const getCookie = (name: string): string | null => {
  if (typeof window === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  if (match) return decodeURIComponent(match[2]);
  return null;
};

const generateFallbackUUID = (): string => {
  return "00000000-0000-4000-8000-000000000000";
};

const isValidUUID = (uuid: string | null | undefined): boolean => {
  if (!uuid) return false;
  const regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
};

export default function CourseManagementPage() {
  // --- STATES ---
  const [courses, setCourses] = useState<Course[]>([]);
  const [curriculums, setCurriculums] = useState<any[]>([]);
  const [keyword, setKeyword] = useState("");

  // --- BỘ LỌC DUY NHẤT: LOẠI HÌNH ĐÀO TẠO ---
  const [filterType, setFilterType] = useState<
    "ALL" | "SHORT_TERM" | "LONG_TERM"
  >("ALL");

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCourseRow, setSelectedCourseRow] = useState<Course | null>(
    null,
  );

  const [form, setForm] = useState({
    course_id: "",
    title: "",
    description: "",
    price: 0,
    curriculum_id: "",
  });

  // --- INTERCEPTOR ---
  const verifyToken = (): string | null => {
    let token = getCookie("token");
    if (!token) return "bypass_token_dev";
    return token;
  };

  // --- MAP THỐNG KÊ SỐ LẦN ĐÃ SỬ DỤNG CỦA MỖI CURRICULUM ---
  const curriculumUsageMap = useMemo(() => {
    const usageCount = new Map<
      string,
      { count: number; courseTitles: string[] }
    >();
    courses.forEach((course) => {
      const cId = course.curriculum_id || (course as any).curriculumId;
      if (!cId) return;
      const key = String(cId).toLowerCase();

      const current = usageCount.get(key) || { count: 0, courseTitles: [] };
      current.count += 1;
      if (course.title) current.courseTitles.push(course.title);
      usageCount.set(key, current);
    });
    return usageCount;
  }, [courses]);

  // --- MEMOS ---
  const curriculumMap = useMemo(() => {
    const map = new Map<
      string,
      { type: string; finishedMonths: string | number; name: string }
    >();
    curriculums.forEach((c) => {
      const targetId = c.curriculum_id || c.curriculumId || c._id;
      if (!targetId) return;
      const targetIdStr =
        typeof targetId === "object" && targetId?.$oid
          ? String(targetId.$oid).toLowerCase()
          : String(targetId).toLowerCase();
      const type = c.course_type || c.courseType || "SHORT_TERM";
      const finishedMonths =
        c.course_finished_months !== undefined
          ? c.course_finished_months
          : "Chưa rõ";
      const name = c.curriculum_name || "N/A";
      map.set(targetIdStr, {
        type: String(type).toUpperCase(),
        finishedMonths,
        name,
      });
    });
    return map;
  }, [curriculums]);

  const getCourseTypeFromCurriculum = (curriculumId: any) => {
    if (!curriculumId) return "SHORT_TERM";
    const searchId =
      typeof curriculumId === "object" && curriculumId?.$oid
        ? String(curriculumId.$oid).toLowerCase()
        : String(curriculumId).toLowerCase();
    return curriculumMap.get(searchId)?.type || "SHORT_TERM";
  };

  const getMonthFromCurriculum = (curriculumId: any): string => {
    if (!curriculumId) return "Chưa cập nhật";
    const searchId =
      typeof curriculumId === "object" && curriculumId?.$oid
        ? String(curriculumId.$oid).toLowerCase()
        : String(curriculumId).toLowerCase();
    const months = curriculumMap.get(searchId)?.finishedMonths;
    if (months === undefined || months === "Chưa rõ") return "Chưa cập nhật";
    return `${months} Tháng`;
  };

  // --- THỐNG KÊ SỐ LƯỢNG KHOÁ NGẮN HẠN VÀ DÀI HẠN ---
  const typeCounts = useMemo(() => {
    let shortTerm = 0;
    let longTerm = 0;

    courses.forEach((c) => {
      const cId = c.curriculum_id || (c as any).curriculumId;
      const currentType = getCourseTypeFromCurriculum(cId);
      if (currentType === "LONG_TERM") {
        longTerm++;
      } else {
        shortTerm++;
      }
    });

    return { shortTerm, longTerm };
  }, [courses, curriculumMap]);

  // --- HÀM LỌC TỪ KHÓA TÊN KHOÁ HỌC + LOẠI HÌNH ---
  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    const lowerKeyword = keyword.toLowerCase();

    return courses.filter((c) => {
      const cId = c.curriculum_id || (c as any).curriculumId;

      // 1. Lọc từ khóa
      if (c.title && !c.title.toLowerCase().includes(lowerKeyword))
        return false;

      // 2. Lọc hình thức đào tạo
      const currentType = getCourseTypeFromCurriculum(cId);
      if (filterType !== "ALL" && currentType !== filterType) return false;

      return true;
    });
  }, [courses, keyword, filterType]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [coursesData, curriculumsData] = await Promise.all([
        getCoursesAction(),
        getCurriculums(),
      ]);
      const validCourses = coursesData || [];
      const validCurriculums = curriculumsData || [];

      const synchronizedData = validCourses.map((course: Course) => {
        const targetCurriculum = validCurriculums.find((c: any) => {
          const cId = c.curriculum_id || c.id;
          const courseCId = course.curriculum_id || (course as any).id;
          return String(cId).toLowerCase() === String(courseCId).toLowerCase();
        });
        return {
          ...course,
          modules: targetCurriculum?.modules || (course as any).modules || [],
        };
      });

      setCourses(synchronizedData);
      setCurriculums(validCurriculums);
      if (synchronizedData.length > 0)
        setSelectedCourseRow(synchronizedData[0]);
      if (validCurriculums.length > 0 && !form.curriculum_id) {
        setForm((prev) => ({
          ...prev,
          curriculum_id:
            validCurriculums[0].curriculum_id || validCurriculums[0].id,
        }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const resetForm = () => {
    setShowModal(false);
    setEditing(null);
    setForm({
      course_id: "",
      title: "",
      description: "",
      price: 0,
      curriculum_id:
        curriculums.length > 0
          ? curriculums[0].curriculum_id || curriculums[0].id
          : "",
    });
  };

  const handleEdit = (course: Course) => {
    setEditing(course);
    setForm({
      course_id: course.course_id,
      title: course.title,
      description: course.description || "",
      price: course.price,
      curriculum_id: course.curriculum_id || (course as any).curriculumId || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const token = verifyToken();
    if (!token) return;
    if (confirm("Bạn có chắc chắn muốn xóa khóa học này khỏi hệ thống?")) {
      const res = await deleteCourseAction(id);
      if (res.success) {
        alert("Xóa khóa học thành công!");
        await fetchInitialData();
      } else {
        alert(`Không thể xóa bản ghi: ${res.error}`);
      }
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.curriculum_id) {
      alert("Vui lòng điền đầy đủ Tên khóa học và Chương trình đào tạo!");
      return;
    }
    setIsLoading(true);
    try {
      const correctType = getCourseTypeFromCurriculum(form.curriculum_id);
      let rawUserId = getCookie("user_id") || "";
      let validInstructorId = isValidUUID(rawUserId)
        ? rawUserId
        : generateFallbackUUID();

      const payload: any = {
        curriculum_id: form.curriculum_id,
        title: form.title,
        course_type: correctType,
        description: form.description,
        price: Number(form.price),
        image_url: editing?.image_url || "",
        status_id: "COURSE_REGISTRATION",
        instructor_id: validInstructorId,
      };

      let res;
      if (editing && form.course_id) {
        payload.total_lessons = (editing as any).total_lessons ?? 0;
        res = await updateCourseAction(form.course_id, payload);
      } else {
        payload.total_lessons = 0;
        res = await createCourseAction(payload);
      }

      if (res?.success) {
        alert(
          editing
            ? "Cập nhật khóa học thành công!"
            : "Tạo khóa học mới thành công!",
        );
        resetForm();
        await fetchInitialData();
      } else {
        alert(`Thao tác thất bại: ${res?.error || "Lỗi không xác định"}`);
      }
    } catch (error: any) {
      alert(`Đã xảy ra lỗi hệ thống: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-[#1E293B] antialiased">
      <Navbar />

      <section className="relative overflow-hidden bg-gradient-to-r from-[#0066FF] to-[#0052cc] px-6 pb-24 pt-10 text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-cyan-200 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-white/80">
            <Link
              href="/training-management"
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 shadow-sm backdrop-blur-md transition-all hover:bg-white/20 hover:text-white"
            >
              <ArrowLeft size={14} />
              Quản lý đào tạo
            </Link>
            <ChevronRight size={12} className="opacity-50" />
            <span className="font-semibold tracking-wide text-white">
              Quản lý khóa học
            </span>
          </div>

          <div className="max-w-3xl">

            <h1 className="text-3xl font-black uppercase tracking-tight drop-shadow-md md:text-4xl">
              QUẢN LÝ KHÓA HỌC HỆ THỐNG
            </h1>

            <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-blue-100">
              Quản lý thông tin, học phí hiển thị và phân bổ đề cương chi tiết
              cho các lớp đào tạo.
            </p>
          </div>
        </div>
      </section>

      <main className="relative z-20 mx-auto -mt-14 w-full max-w-7xl px-6 pb-20">
        <div className="space-y-6 rounded-[2rem] border border-white bg-white/80 p-6 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] backdrop-blur-xl md:p-8">
          {/* Widget thống kê cân đối - Grid 4 Cột */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-sm">
              <p className="text-2xl font-black text-[#0066FF]">
                {courses?.length || 0}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">
                Tổng khóa học
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-sm">
              <p className="text-2xl font-black text-amber-500">
                {typeCounts.shortTerm}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">
                Khóa ngắn hạn
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-sm">
              <p className="text-2xl font-black text-purple-600">
                {typeCounts.longTerm}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">
                Khóa dài hạn
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-sm">
              <p className="text-2xl font-black text-emerald-600">
                {courses
                  ?.reduce((sum, c) => sum + (c.price || 0), 0)
                  .toLocaleString() || 0}
                đ
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">
                Tổng giá trị lưu trữ
              </p>
            </div>
          </div>

          {/* Thanh Tìm kiếm & 1 Bộ lọc duy nhất (Loại hình) */}
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:flex-row">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:flex-1">
              {/* Tìm kiếm */}
              <div className="relative w-full sm:w-80">
                <Search
                  size={16}
                  className="absolute left-3 top-2.5 text-slate-400"
                />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm tiêu đề khóa học..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
                />
              </div>

              {/* Lọc Ngắn / Dài hạn */}
              <div className="relative w-full sm:w-56 flex items-center gap-1.5">
                <Clock size={14} className="text-slate-400 shrink-0" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0066FF] cursor-pointer"
                >
                  <option value="ALL">Loại hình: Tất cả</option>
                  <option value="SHORT_TERM">Khóa ngắn hạn</option>
                  <option value="LONG_TERM">Khóa dài hạn</option>
                </select>
              </div>
            </div>

            <div className="flex w-full md:w-auto items-center justify-end shrink-0">
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#0066FF] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/10 transition-all hover:bg-blue-700 active:scale-[0.98] md:w-auto"
              >
                <Plus size={16} /> Thêm khóa học mới
              </button>
            </div>
          </div>

          {/* Table Layout */}
          {isLoading && courses.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-slate-400 text-xs font-bold shadow-sm">
              Đang tải dữ liệu khóa học...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-4">
                {filteredCourses.length === 0 ? (
                  <div className="bg-white p-8 border rounded-xl text-center text-slate-400 text-xs italic shadow-xs">
                    Không tìm thấy khóa học nào khớp với điều kiện lọc hiện tại.
                  </div>
                ) : (
                  filteredCourses.map((course) => {
                    const isSelected =
                      selectedCourseRow?.course_id === course.course_id;
                    const currentCurriculumId =
                      course.curriculum_id || (course as any).curriculumId;
                    const currentType =
                      getCourseTypeFromCurriculum(currentCurriculumId);

                    const cKey = currentCurriculumId
                      ? String(currentCurriculumId).toLowerCase()
                      : "";
                    const usage = curriculumUsageMap.get(cKey);
                    const isDuplicated = usage && usage.count > 1;

                    return (
                      <div
                        key={course.course_id}
                        onClick={() => setSelectedCourseRow(course)}
                        className={`relative cursor-pointer rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${isSelected
                            ? "border-[#0066FF] ring-2 ring-[#0066FF]/10 shadow-md bg-blue-50/10"
                            : isDuplicated
                              ? "border-amber-300 bg-amber-50/5"
                              : "border-slate-200"
                          }`}
                      >
                        {isDuplicated && (
                          <span className="absolute top-2 right-2 text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                            Dùng chung Curriculum
                          </span>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                          <div className="flex gap-2 items-start flex-1 min-w-0">
                            <div className="space-y-1 min-w-0 flex-1">
                              <h4 className="text-sm font-bold text-slate-900 truncate pr-24">
                                {course.title}
                              </h4>
                              <p className="text-xs text-slate-400 line-clamp-1">
                                {course.description || "Chưa cập nhật mô tả."}
                              </p>
                              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-1 text-[11px] text-slate-500 font-medium">
                                <span className="font-semibold text-slate-700">
                                  {(course.price || 0).toLocaleString()}đ
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${currentType === "LONG_TERM"
                                      ? "text-purple-600 bg-purple-50"
                                      : "text-[#0066FF] bg-blue-50"
                                    }`}
                                >
                                  {currentType === "LONG_TERM"
                                    ? "DÀI HẠN"
                                    : "NGẮN HẠN"}
                                </span>
                                <span className="text-slate-400 flex items-center gap-1 font-bold">
                                  <Calendar size={12} />{" "}
                                  {getMonthFromCurriculum(currentCurriculumId)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div
                            className="flex items-center gap-1 shrink-0 pt-4 sm:pt-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleEdit(course)}
                              className="bg-white text-slate-700 font-bold text-[10px] px-2.5 py-1.5 border border-slate-200 rounded-lg cursor-pointer transition flex items-center gap-1 hover:bg-slate-50"
                            >
                              <Pencil size={12} /> Sửa
                            </button>
                            <button
                              onClick={() => handleDelete(course.course_id)}
                              className="bg-white text-rose-600 font-bold text-[10px] px-2.5 py-1.5 border border-slate-200 rounded-lg cursor-pointer transition flex items-center gap-1 hover:bg-slate-50"
                            >
                              <Trash2 size={12} /> Xóa
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chi tiết bên phải */}
              <div className="sticky top-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0066FF]"></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3.5 pl-1">
                  Thông tin chi tiết đính kèm
                </p>

                {selectedCourseRow ? (
                  <div className="space-y-4 pl-1">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Đang xem:
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-900 mt-0.5 leading-snug">
                        {selectedCourseRow.title}
                      </h3>
                    </div>
                    <div className="space-y-2.5 pt-3 border-t text-xs font-medium text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        <span>
                          Loại hình khóa học:{" "}
                          <strong className="text-slate-800">
                            {getCourseTypeFromCurriculum(
                              selectedCourseRow.curriculum_id ||
                              (selectedCourseRow as any).curriculumId,
                            ) === "LONG_TERM"
                              ? "DÀI HẠN"
                              : "NGẮN HẠN"}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award size={14} className="text-slate-400" />
                        <span>
                          Chi phí khóa:{" "}
                          <strong className="text-emerald-600">
                            {(selectedCourseRow.price || 0).toLocaleString()}đ
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-blue-500" />
                        <span>
                          Thời gian đào tạo:{" "}
                          <strong className="text-slate-800">
                            {getMonthFromCurriculum(
                              selectedCourseRow.curriculum_id ||
                              (selectedCourseRow as any).curriculumId,
                            )}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
                        Đề cương bài học đa tầng:
                      </span>
                      <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {(selectedCourseRow as any).modules &&
                          (selectedCourseRow as any).modules.length > 0 ? (
                          (selectedCourseRow as any).modules.map(
                            (mod: any, mIdx: number) => (
                              <div
                                key={mod.module_id || mIdx}
                                className="bg-slate-50 p-2 rounded-lg border border-slate-100"
                              >
                                <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                  {mod.title}
                                </p>
                                <ul className="mt-1 pl-4 space-y-1 border-l-2 border-slate-200 ml-1.5">
                                  {mod.lessons?.map(
                                    (les: any, lIdx: number) => (
                                      <li
                                        key={les.lesson_id || lIdx}
                                        className="text-[11px] text-slate-600 flex justify-between items-center"
                                      >
                                        <span>{les.title}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          {les.duration}
                                        </span>
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            ),
                          )
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">
                            Chương trình đào tạo này hiện chưa cấu hình bài học.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-8 text-center">
                    Vui lòng chọn một khóa học bên danh sách để xem.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* MODAL POPUP FORM */}
          {showModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[6px] flex items-center justify-center z-50 text-slate-800 p-4 transition-all duration-300">
              <div className="bg-white w-full max-w-xl rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] max-h-[90vh] flex flex-col overflow-hidden border border-slate-100/80 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-blue-50/30">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl text-white shadow-xs ${editing ? "bg-amber-500 shadow-amber-500/20" : "bg-[#0066FF] shadow-blue-500/20"}`}
                    >
                      {editing ? <Sparkles size={18} /> : <Plus size={18} />}
                    </div>
                    <div>
                      <h2 className="font-extrabold text-base text-slate-900 tracking-tight">
                        {editing ? "Cập nhật khóa học" : "Tạo khóa học mới"}
                      </h2>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {editing
                          ? `Đang chỉnh sửa mã: ${form.course_id}`
                          : "Nhập thông tin khóa học chuẩn hóa liên kết hệ thống"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={resetForm}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 border-none bg-transparent cursor-pointer transition-all active:scale-95"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1 bg-white">
                  {/* Trường 1: Chọn Chương trình đào tạo */}
                  <div className="space-y-2">
                    <label className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Layers size={13} className="text-slate-400" /> Chương
                        trình gốc (Curriculum){" "}
                        <span className="text-rose-500">*</span>
                      </span>
                      <span className="text-[10px] text-amber-600 font-semibold normal-case bg-amber-50 px-2 py-0.5 rounded-md">
                        Khuyến nghị: 1 Curriculum nên đi với 1 khóa
                      </span>
                    </label>

                    <select
                      value={form.curriculum_id}
                      onChange={(e) =>
                        setForm({ ...form, curriculum_id: e.target.value })
                      }
                      className="w-full border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-3 bg-slate-50/50 font-semibold text-slate-800 text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0066FF]/10 focus:border-[#0066FF] focus:bg-white transition-all duration-200"
                      required
                    >
                      <option value="" disabled>
                        -- Chọn một chương trình đào tạo có sẵn --
                      </option>
                      {curriculums.map((curr) => {
                        const cId = curr.curriculum_id || curr.id;
                        const cIdKey = String(cId).toLowerCase();
                        const typeBadge = String(
                          curr.course_type || curr.courseType || "SHORT_TERM",
                        ).toUpperCase();

                        const usage = curriculumUsageMap.get(cIdKey);
                        const isUsed = usage && usage.count > 0;

                        let usageText = isUsed
                          ? ` — Đã dùng bởi: ${usage.courseTitles.join(", ")}`
                          : ` — Chưa sử dụng`;

                        return (
                          <option
                            key={cId}
                            value={cId}
                            className={
                              isUsed
                                ? "text-slate-400 bg-amber-50/30"
                                : "text-slate-800 font-bold"
                            }
                          >
                            {curr.curriculum_name} (
                            {typeBadge === "LONG_TERM" ? "DÀI HẠN" : "NGẮN HẠN"}
                            ) {usageText}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Trường 2: Tên hiển thị khóa học */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <Type size={13} className="text-slate-400" /> Tên thương
                      mại khóa học <span className="text-rose-500">*</span>
                    </label>
                    <input
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                      className="w-full border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-3 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/10 focus:border-[#0066FF] text-xs bg-slate-50/50 focus:bg-white transition-all duration-200"
                      placeholder="Nhập tên khóa học (Ví dụ: Lập trình Next.js ứng dụng thực tế)"
                      required
                    />
                  </div>

                  {/* Trường 3: Học phí */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <Award size={13} className="text-slate-400" /> Giá bán /
                      Học phí công bố
                    </label>
                    <div className="relative rounded-xl">
                      <input
                        type="number"
                        value={form.price}
                        onChange={(e) =>
                          setForm({ ...form, price: Number(e.target.value) })
                        }
                        className="w-full border border-slate-200 hover:border-slate-300 rounded-xl pl-3.5 pr-8 py-3 font-bold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/10 focus:border-[#0066FF] text-xs bg-slate-50/50 focus:bg-white transition-all duration-200"
                      />
                      <span className="absolute right-3.5 top-3.5 text-xs text-slate-400 font-extrabold select-none">
                        đ
                      </span>
                    </div>
                  </div>

                  {/* Trường 4: Mô tả */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <FileText size={13} className="text-slate-400" /> Mô tả
                      vắn tắt khóa học
                    </label>
                    <textarea
                      rows={4}
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      className="w-full border border-slate-200 hover:border-slate-300 rounded-xl p-3.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/10 focus:border-[#0066FF] text-xs bg-slate-50/50 focus:bg-white transition-all duration-200 resize-none leading-relaxed"
                      placeholder="Ghi chú ngắn về mục tiêu, lộ trình học tập để học viên dễ nắm bắt thông tin..."
                    />
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-bold cursor-pointer transition-all active:scale-95 shadow-2xs"
                  >
                    Đóng lại
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="px-5 py-2.5 text-white font-extrabold rounded-xl text-xs border-none cursor-pointer transition-all active:scale-95 shadow-md flex items-center gap-2 bg-[#0066FF] hover:bg-blue-600 shadow-blue-500/10 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Đang thực hiện...
                      </>
                    ) : (
                      <>{editing ? "Cập nhật dữ liệu" : "Lưu khóa học"}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
