"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  TestTube2,
  UserCheck,
  UsersRound,
  XCircle,
} from "lucide-react";

type Tester = {
  id: string;
  name: string;
  role: string;
  progress: number;
  isConfirmed: boolean;
  feedback: string;
};

type CourseModule = {
  title: string;
  lessons: string;
};

type PendingCourse = {
  id: string;
  name: string;
  lecturerName: string;
  submittedDate: string;
  duration: string;
  totalModules: number;
  courseMaterialUrl: string;
  lecturerNote: string;
  modules: CourseModule[];
  assignedTesterIds: string[];
};

const availableTesters: Tester[] = [
  {
    id: "T01",
    name: "Nguyễn Thúy Hằng",
    role: "QA Kiểm định Chất lượng",
    progress: 100,
    isConfirmed: true,
    feedback: "Video rõ nét, hệ thống lab Module 6 chạy mượt mà.",
  },
  {
    id: "T02",
    name: "Trần Minh Hoàng",
    role: "Học viên xuất sắc K21",
    progress: 100,
    isConfirmed: true,
    feedback:
      "Nội dung nâng cao rất hay, bài tập Server Actions có tính thực tế cao.",
  },
  {
    id: "T03",
    name: "Lê Văn Nam",
    role: "Chuyên gia Đánh giá Trải nghiệm",
    progress: 45,
    isConfirmed: false,
    feedback: "Đang học đến Module 3, giao diện trực quan.",
  },
  {
    id: "T04",
    name: "Phạm Thị Ngọc",
    role: "Trợ giảng chuyên môn",
    progress: 0,
    isConfirmed: false,
    feedback: "Chưa bắt đầu học.",
  },
];

const initialCourses: PendingCourse[] = [
  {
    id: "COURSE-NEXTJS-2026",
    name: "Khóa học Lập trình Next.js Toàn Diện & Triển khai Hệ thống",
    lecturerName: "TS. Nguyễn Văn A",
    submittedDate: "18/06/2026",
    duration: "12 tuần",
    totalModules: 6,
    courseMaterialUrl: "#",
    lecturerNote:
      "Tôi đã bổ sung thêm 3 bài lab thực hành thực tế về Server Actions và cấu hình CI/CD trên AWS ở Module 6.",
    modules: [
      {
        title: "Next.js Core Concepts & App Router Architecture",
        lessons: "8 bài giảng",
      },
      {
        title: "Data Fetching, Caching, and Server Actions",
        lessons: "6 bài giảng",
      },
      {
        title: "Advanced Authentication & Authorization",
        lessons: "5 bài giảng",
      },
      {
        title: "Database Integration (Prisma, PostgreSQL)",
        lessons: "7 bài giảng",
      },
      {
        title: "State Management & Performance Optimization",
        lessons: "6 bài giảng",
      },
      {
        title: "DevOps Pipeline: Dockerizing & AWS Deployment",
        lessons: "4 bài giảng",
      },
    ],
    assignedTesterIds: ["T01", "T02"],
  },
  {
    id: "COURSE-PYTHON-2026",
    name: "Khóa học Kỹ nghệ Dữ liệu & Ứng dụng Trí tuệ Nhân tạo",
    lecturerName: "Chuyên gia Lê Hoàng C",
    submittedDate: "19/06/2026",
    duration: "16 tuần",
    totalModules: 5,
    courseMaterialUrl: "#",
    lecturerNote:
      "Giáo án chuẩn hóa theo khung Python AI mới nhất. Đã tích hợp API của OpenAI.",
    modules: [
      {
        title: "Python Advanced & Data Structures",
        lessons: "10 bài giảng",
      },
      {
        title: "Data Analysis with Pandas & NumPy",
        lessons: "8 bài giảng",
      },
      {
        title: "Mathematics for Machine Learning",
        lessons: "12 bài giảng",
      },
      {
        title: "Supervised & Unsupervised Learning",
        lessons: "9 bài giảng",
      },
      {
        title: "Introduction to Deep Learning with PyTorch",
        lessons: "7 bài giảng",
      },
    ],
    assignedTesterIds: ["T03", "T04"],
  },
];

export default function CourseApprovalDashboardWithTesting() {
  const [pendingCourses, setPendingCourses] =
    useState<PendingCourse[]>(initialCourses);
  const [selectedCourseId, setSelectedCourseId] = useState(
    initialCourses[0].id,
  );
  const [searchKeyword, setSearchKeyword] = useState("");

  const activeCourse =
    pendingCourses.find((course) => course.id === selectedCourseId) ||
    pendingCourses[0];

  const activeTesters = useMemo(() => {
    if (!activeCourse) return [];

    return availableTesters.filter((tester) =>
      activeCourse.assignedTesterIds.includes(tester.id),
    );
  }, [activeCourse]);

  const filteredCourses = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    if (!keyword) return pendingCourses;

    return pendingCourses.filter(
      (course) =>
        course.name.toLowerCase().includes(keyword) ||
        course.lecturerName.toLowerCase().includes(keyword) ||
        course.id.toLowerCase().includes(keyword),
    );
  }, [pendingCourses, searchKeyword]);

  const getCourseTesters = (course: PendingCourse) =>
    availableTesters.filter((tester) =>
      course.assignedTesterIds.includes(tester.id),
    );

  const isCourseReady = (course: PendingCourse) => {
    const testers = getCourseTesters(course);

    return (
      testers.length > 0 &&
      testers.every((tester) => tester.progress === 100 && tester.isConfirmed)
    );
  };

  const isEligibleToPublish =
    activeTesters.length > 0 &&
    activeTesters.every(
      (tester) => tester.progress === 100 && tester.isConfirmed,
    );

  const readyCoursesCount = pendingCourses.filter(isCourseReady).length;
  const testingCoursesCount = pendingCourses.length - readyCoursesCount;

  const handleToggleTester = (testerId: string) => {
    if (!activeCourse) return;

    setPendingCourses((previousCourses) =>
      previousCourses.map((course) => {
        if (course.id !== activeCourse.id) return course;

        const isAssigned = course.assignedTesterIds.includes(testerId);

        return {
          ...course,
          assignedTesterIds: isAssigned
            ? course.assignedTesterIds.filter((id) => id !== testerId)
            : [...course.assignedTesterIds, testerId],
        };
      }),
    );
  };

  if (!activeCourse) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-slate-500">
          Chưa có khóa học nào đang chờ phê duyệt.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased">
      <Navbar />

      {/* HEADER SECTION */}
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
            <span className="flex items-center gap-1.5 font-semibold tracking-wide text-white">
              <ShieldCheck size={14} />
              Duyệt khóa học
            </span>
          </div>

          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
              <Sparkles size={14} />
              Trung tâm kiểm định chất lượng
            </div>

            <h1 className="text-3xl font-black uppercase tracking-tight drop-shadow-md md:text-4xl">
              PHÊ DUYỆT KHÓA HỌC
            </h1>

            <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-blue-100">
              Theo dõi quá trình học thử, đánh giá phản hồi và quyết định phát
              hành các khóa học đã hoàn thiện.
            </p>
          </div>
        </div>
      </section>

      <main className="relative z-20 mx-auto -mt-14 w-full max-w-7xl px-6 pb-20">
        <div className="rounded-[2rem] border border-white bg-white/80 p-6 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] backdrop-blur-xl md:p-8">
          {/* Statistics */}
          <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Chờ phê duyệt
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {pendingCourses.length}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <FileCheck2 size={24} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Đủ điều kiện
                  </p>
                  <p className="mt-2 text-3xl font-bold text-emerald-600">
                    {readyCoursesCount}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={24} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Đang thử nghiệm
                  </p>
                  <p className="mt-2 text-3xl font-bold text-amber-500">
                    {testingCoursesCount}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <TestTube2 size={24} />
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            {/* Course list */}
            <aside className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:sticky lg:top-6">
              <div className="border-b border-slate-100 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      Khóa học chờ duyệt
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {filteredCourses.length} khóa học được hiển thị
                    </p>
                  </div>
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">
                    {pendingCourses.length}
                  </span>
                </div>

                <div className="relative mt-4">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(event) => setSearchKeyword(event.target.value)}
                    placeholder="Tìm khóa học, giảng viên..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="max-h-[720px] space-y-3 overflow-y-auto p-3">
                {filteredCourses.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
                    <Search size={28} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm font-medium text-slate-600">
                      Không tìm thấy khóa học
                    </p>
                  </div>
                ) : (
                  filteredCourses.map((course) => {
                    const selected = course.id === selectedCourseId;
                    const courseTesters = getCourseTesters(course);
                    const ready = isCourseReady(course);

                    return (
                      <button
                        type="button"
                        key={course.id}
                        onClick={() => setSelectedCourseId(course.id)}
                        className={`group w-full rounded-xl border p-4 text-left transition-all ${
                          selected
                            ? "border-blue-500 bg-blue-50/70 shadow-sm ring-4 ring-blue-50"
                            : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p
                              className={`line-clamp-2 text-sm font-bold leading-5 ${
                                selected ? "text-blue-700" : "text-slate-900"
                              }`}
                            >
                              {course.name}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {course.lecturerName}
                            </p>
                          </div>

                          <ChevronRight
                            size={18}
                            className={`mt-0.5 shrink-0 transition-transform ${
                              selected
                                ? "translate-x-0.5 text-blue-600"
                                : "text-slate-300 group-hover:translate-x-0.5"
                            }`}
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                            <UsersRound size={12} />
                            {courseTesters.length} người học thử
                          </span>

                          {ready ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 size={12} />
                              Đủ điều kiện
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                              <Clock3 size={12} />
                              Đang thử nghiệm
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            {/* Course detail */}
            <div className="space-y-6">
              {/* General information */}
              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-6 sm:p-7">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-600">
                          {activeCourse.id}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                            isEligibleToPublish
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {isEligibleToPublish ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <Clock3 size={12} />
                          )}
                          {isEligibleToPublish
                            ? "Sẵn sàng phát hành"
                            : "Đang kiểm định"}
                        </span>
                      </div>

                      <h2 className="mt-3 text-xl font-bold leading-snug text-slate-900 sm:text-2xl">
                        {activeCourse.name}
                      </h2>

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <CircleUserRound size={15} />
                          {activeCourse.lecturerName}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 size={15} />
                          {activeCourse.duration}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <BookOpen size={15} />
                          {activeCourse.totalModules} chương
                        </span>
                      </div>
                    </div>

                    <span className="shrink-0 text-xs text-slate-400">
                      Gửi ngày {activeCourse.submittedDate}
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-7">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                    <div className="flex items-start gap-3">
                      <MessageSquareText
                        size={20}
                        className="mt-0.5 shrink-0 text-blue-600"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Ghi chú từ giảng viên
                        </p>
                        <p className="mt-1.5 text-sm leading-6 text-slate-600">
                          {activeCourse.lecturerNote}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Modules */}
              <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Nội dung khóa học
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Danh sách chương được gửi để kiểm định
                    </p>
                  </div>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {activeCourse.modules.length} chương
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {activeCourse.modules.map((module, index) => (
                    <div
                      key={`${activeCourse.id}-${index}`}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/30"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-blue-600 shadow-sm">
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-5 text-slate-800">
                          {module.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {module.lessons}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Tester results */}
              <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
                <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <TestTube2 size={20} className="text-blue-600" />
                      <h3 className="font-bold text-slate-900">
                        Kết quả học thử nghiệm
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Tiến độ và phản hồi của các tài khoản kiểm định
                    </p>
                  </div>

                  <span className="w-fit rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                    Đạt chuẩn:{" "}
                    <strong className="text-blue-600">
                      {
                        activeTesters.filter(
                          (tester) =>
                            tester.isConfirmed && tester.progress === 100,
                        ).length
                      }
                      /{activeTesters.length}
                    </strong>
                  </span>
                </div>

                {activeTesters.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
                    <UsersRound size={30} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm font-medium text-slate-600">
                      Chưa có người học thử
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Hãy chọn nhân sự kiểm định ở phần bên dưới.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeTesters.map((tester) => (
                      <div
                        key={tester.id}
                        className="rounded-xl border border-slate-200 p-4 transition-all hover:border-blue-200 hover:shadow-sm sm:p-5"
                      >
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-600">
                              {tester.name
                                .split(" ")
                                .slice(-2)
                                .map((word) => word.charAt(0))
                                .join("")}
                            </div>

                            <div>
                              <h4 className="text-sm font-bold text-slate-900">
                                {tester.name}
                              </h4>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {tester.role}
                              </p>
                            </div>
                          </div>

                          {tester.isConfirmed ? (
                            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 size={13} />
                              Đã xác nhận đạt chuẩn
                            </span>
                          ) : (
                            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700">
                              <Clock3 size={13} />
                              Đang học và đánh giá
                            </span>
                          )}
                        </div>

                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-500">
                              Tiến độ học tập
                            </span>
                            <span
                              className={`font-bold ${
                                tester.progress === 100
                                  ? "text-emerald-600"
                                  : "text-blue-600"
                              }`}
                            >
                              {tester.progress}%
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                tester.progress === 100
                                  ? "bg-emerald-500"
                                  : "bg-blue-500"
                              }`}
                              style={{ width: `${tester.progress}%` }}
                            />
                          </div>
                        </div>

                        {tester.feedback && (
                          <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3">
                            <MessageSquareText
                              size={15}
                              className="mt-0.5 shrink-0 text-slate-400"
                            />
                            <p className="text-xs italic leading-5 text-slate-600">
                              “{tester.feedback}”
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Assign testers */}
              <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7">
                <div className="mb-5">
                  <div className="flex items-center gap-2">
                    <UserCheck size={20} className="text-blue-600" />
                    <h3 className="font-bold text-slate-900">
                      Phân công người học thử
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Chọn hoặc bỏ chọn tài khoản tham gia kiểm định khóa học
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {availableTesters.map((tester) => {
                    const assigned = activeCourse.assignedTesterIds.includes(
                      tester.id,
                    );

                    return (
                      <button
                        type="button"
                        key={tester.id}
                        onClick={() => handleToggleTester(tester.id)}
                        className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-all ${
                          assigned
                            ? "border-blue-400 bg-blue-50/70 ring-2 ring-blue-50"
                            : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {tester.name}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {tester.role}
                          </p>
                        </div>

                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            assigned
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {assigned && <Check size={13} strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Approval actions */}
              <section
                className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${
                  isEligibleToPublish
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-amber-200 bg-amber-50/50"
                }`}
              >
                <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        isEligibleToPublish
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {isEligibleToPublish ? (
                        <CheckCircle2 size={21} />
                      ) : (
                        <AlertCircle size={21} />
                      )}
                    </div>

                    <div>
                      <p
                        className={`text-sm font-bold ${
                          isEligibleToPublish
                            ? "text-emerald-800"
                            : "text-amber-800"
                        }`}
                      >
                        {isEligibleToPublish
                          ? "Khóa học đã đủ điều kiện phát hành"
                          : "Khóa học chưa đủ điều kiện phát hành"}
                      </p>
                      <p
                        className={`mt-1 max-w-2xl text-xs leading-5 ${
                          isEligibleToPublish
                            ? "text-emerald-700"
                            : "text-amber-700"
                        }`}
                      >
                        {isEligibleToPublish
                          ? "Tất cả người học thử đã hoàn thành 100% và xác nhận khóa học đạt chuẩn chất lượng."
                          : "Tất cả người học thử phải hoàn thành 100% tiến độ và xác nhận đạt chuẩn trước khi khóa học được phát hành."}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() =>
                        alert(
                          "Đã từ chối và gửi yêu cầu chỉnh sửa nội dung đến giảng viên.",
                        )
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50"
                    >
                      <XCircle size={17} />
                      Từ chối duyệt
                    </button>

                    <button
                      type="button"
                      disabled={!isEligibleToPublish}
                      onClick={() =>
                        alert(
                          `🎉 Khóa học "${activeCourse.name}" đã được phê duyệt và phát hành thành công!`,
                        )
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                    >
                      <GraduationCap size={18} />
                      Duyệt và phát hành
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
