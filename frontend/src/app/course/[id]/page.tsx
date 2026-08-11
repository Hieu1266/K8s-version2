"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import LessonNotesPanel from "@/components/LessonNotesPanel";
import { QuizSection } from "@/components/LessonQuizContainer";
import { getLearningCourse } from "@/actions/getCourse";
import {
  attachStatusToLessons,
  completeLessonAction,
} from "@/actions/getLesson";
import { getLessonNotesAction, createNoteAction } from "@/actions/getNotes";
import {
  getOrCreateVideoProgressAction,
  updateVideoProgressAction,
} from "@/actions/getVideoProgress";
import { getLessonResourcesAction } from "@/actions/getLessonResource";
import { LessonResourceItem } from "@/types/lessons";
import { CourseLearningStructure } from "@/types/course";
import { SubjectLearningStructure } from "@/types/subjects";
import { ModuleLearningStructure } from "@/types/modules";
import { UserLessonNote, NoteCreatePayload } from "@/types/progresses";
import { LessonStatus } from "@/types/statuses";
import { VideoProgress } from "@/types/video";

import { TabKey, LessonWithStatus } from "@/components/course-learning/types";
import {
  getSubjectAccent,
  getLastLessonId,
  setLastLessonId,
  getSidebarCollapsed,
  setSidebarCollapsed,
} from "@/components/course-learning/helpers";
import CourseHeaderBar from "@/components/course-learning/CourseHeaderBar";
import CourseSidebar from "@/components/course-learning/CourseSidebar";
import CourseLoadingScreen from "@/components/course-learning/CourseLoadingScreen";
import CourseErrorScreen from "@/components/course-learning/CourseErrorScreen";
import LessonTitleHeader from "@/components/course-learning/LessonTitleHeader";
import LessonTabsNav from "@/components/course-learning/LessonTabsNav";
import LectureTabContent from "@/components/course-learning/LectureTabContent";
import ResourcesTabContent from "@/components/course-learning/ResourcesTabContent";

const COURSE_URL = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL;

export default function CourseLearningPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  // State quản lý dữ liệu lấy từ Backend API
  const [course, setCourse] = useState<CourseLearningStructure | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State điều hướng cây thư mục bài học
  const [currentLesson, setCurrentLesson] = useState<
    LessonWithStatus | undefined
  >(undefined);
  const [currentSubject, setCurrentSubject] = useState<
    SubjectLearningStructure | undefined
  >(undefined);

  // State quản lý thu gọn / mở rộng
  const [expandedSubjects, setExpandedSubjects] = useState<
    Record<string, boolean>
  >({});
  const [expandedModules, setExpandedModules] = useState<
    Record<string, boolean>
  >({});
  const [activeTab, setActiveTab] = useState<TabKey>("lecture");

  // State thu gọn thanh sidebar bên trái (ghi nhớ lựa chọn của người dùng ở trình duyệt)
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);

  useEffect(() => {
    setSidebarCollapsedState(getSidebarCollapsed());
  }, []);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsedState((prev) => {
      const next = !prev;
      setSidebarCollapsed(next);
      return next;
    });
  };

  // State Ghi chú + Video
  const [notes, setNotes] = useState<UserLessonNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);

  // Tiến độ video THẬT
  const [videoProgress, setVideoProgress] = useState<VideoProgress | null>(
    null,
  );
  const [videoProgressLoading, setVideoProgressLoading] = useState(false);

  // STATE TÀI LIỆU ĐÍNH KÈM (RESOURCES)
  const [resources, setResources] = useState<LessonResourceItem[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  // Ô tạo ghi chú nhanh
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [quickNoteContent, setQuickNoteContent] = useState("");
  const [quickNoteSaving, setQuickNoteSaving] = useState(false);

  // State xử lý quá trình gửi API hoàn thành bài đọc
  const [completing, setCompleting] = useState(false);
  // Chặn nhiều lần gửi hoàn thành trước khi React kịp cập nhật state.
  const slideCompletionInFlightRef = useRef(false);

  // Ref tới khung nội dung bài học bên phải, dùng để cuộn lên đầu mỗi khi đổi bài học
  const lessonContentScrollRef = useRef<HTMLDivElement>(null);

  // Call Server Action để lấy dữ liệu khóa học và status
  useEffect(() => {
    if (!id) return;

    async function fetchLearningData() {
      try {
        setLoading(true);
        setErrorMessage(null);

        const rawCourse = await getLearningCourse(id);

        const updatedSubjects = await Promise.all(
          rawCourse.subjects.map(async (subject) => {
            const updatedModules = await Promise.all(
              subject.modules.map(async (mod) => {
                const lessonsWithStatus = await attachStatusToLessons(
                  mod.lessons,
                );
                return {
                  ...mod,
                  lessons: lessonsWithStatus,
                };
              }),
            );
            return {
              ...subject,
              modules: updatedModules,
            };
          }),
        );

        const courseWithStatus: CourseLearningStructure = {
          ...rawCourse,
          subjects: updatedSubjects,
        };

        setCourse(courseWithStatus);

        const firstSubject = courseWithStatus.subjects[0];
        const firstModule = firstSubject?.modules[0];
        const firstLesson = firstModule?.lessons[0] as
          | LessonWithStatus
          | undefined;

        // Nếu người dùng đã từng mở một bài học trong khóa này, ưu tiên mở lại đúng bài đó
        let targetSubject = firstSubject;
        let targetModule = firstModule;
        let targetLesson = firstLesson;

        const savedLessonId = getLastLessonId(id);
        if (savedLessonId) {
          for (const subject of courseWithStatus.subjects) {
            for (const mod of subject.modules) {
              const found = mod.lessons.find(
                (les) => les.lesson_id === savedLessonId,
              ) as LessonWithStatus | undefined;
              if (found && found.status !== LessonStatus.LOCKED) {
                targetSubject = subject;
                targetModule = mod;
                targetLesson = found;
              }
            }
          }
        }

        if (targetSubject) {
          setCurrentSubject(targetSubject);
          setExpandedSubjects({ [targetSubject.subject_id]: true });
        }
        if (targetModule) {
          setExpandedModules({ [targetModule.module_id]: true });
        }
        if (targetLesson) {
          setCurrentLesson(targetLesson);
          setActiveTab(targetLesson.is_quiz ? "quiz" : "lecture");
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Không thể lấy dữ liệu khóa học");
      } finally {
        setLoading(false);
      }
    }

    fetchLearningData();
  }, [id]);

  // Reset các state phụ ngay khi đổi lesson, không phụ thuộc tab đang mở.
  useEffect(() => {
    setVideoCurrentTime(0);
    setSeekTarget(null);
    setQuickNoteOpen(false);
    setQuickNoteContent("");
  }, [currentLesson?.lesson_id]);

  // Lấy danh sách ghi chú
  useEffect(() => {
    if (!currentLesson?.lesson_id) {
      setNotes([]);
      return;
    }

    // Chỉ tải ghi chú khi người dùng thực sự mở tab Ghi chú.
    if (activeTab !== "notes") {
      setNotes([]);
      setNotesLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setNotesLoading(true);
      const data = await getLessonNotesAction(currentLesson.lesson_id);
      if (!cancelled) {
        setNotes(data);
        setNotesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentLesson?.lesson_id, activeTab]);

  // EFFECT TẢI DANH SÁCH TÀI LIỆU KHI CHỌN BÀI HỌC
  useEffect(() => {
    if (!currentLesson?.lesson_id) {
      setResources([]);
      return;
    }

    // Không tải tài liệu trong lúc người dùng đang trình chiếu bài giảng.
    if (activeTab !== "resources") {
      setResources([]);
      setResourcesLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setResourcesLoading(true);
      const data = await getLessonResourcesAction(currentLesson.lesson_id);
      if (!cancelled) {
        setResources(data);
        setResourcesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentLesson?.lesson_id, activeTab]);

  const flatLessons = useMemo(() => {
    if (!course) return [];
    const flat: {
      subject: SubjectLearningStructure;
      module: ModuleLearningStructure;
      lesson: LessonWithStatus;
    }[] = [];
    course.subjects.forEach((subject) => {
      subject.modules.forEach((mod) => {
        mod.lessons.forEach((lesson) =>
          flat.push({
            subject,
            module: mod,
            lesson: lesson as LessonWithStatus,
          }),
        );
      });
    });
    return flat;
  }, [course]);

  const completedCount = flatLessons.filter(
    (f) => f.lesson.status === LessonStatus.COMPLETED,
  ).length;

  const progressPercent = flatLessons.length
    ? Math.round((completedCount / flatLessons.length) * 100)
    : 0;

  const findNextLockedLesson = (startIndex: number) => {
    for (let i = startIndex; i < flatLessons.length; i++) {
      if (flatLessons[i].lesson.status === LessonStatus.LOCKED) {
        return flatLessons[i];
      }
    }
    return null;
  };

  const handleProgressUpdate = async (updatedProgress: VideoProgress) => {
    if (!updatedProgress.video_progress_id) return;

    const result = await updateVideoProgressAction(
      updatedProgress.video_progress_id,
      {
        last_watched_second: updatedProgress.last_watched_second,
        max_watched_second: updatedProgress.max_watched_second,
        completion_percentage: updatedProgress.completion_percentage,
        is_finished: updatedProgress.is_finished,
      },
    );

    if (!result.success) {
      console.error("Đồng bộ tiến độ video thất bại:", result.error);
    }
  };

  const selectLesson = (
    subject: SubjectLearningStructure,
    lesson: LessonWithStatus,
  ) => {
    if (lesson.status === LessonStatus.LOCKED) return;
    setCurrentSubject(subject);
    setCurrentLesson(lesson);
    setLastLessonId(id, lesson.lesson_id);

    if (lesson.is_quiz) {
      setActiveTab("quiz");
    } else {
      setActiveTab("lecture");
    }
  };

  // Điều hướng trình chiếu: mỗi lesson là một slide và chỉ di chuyển
  // giữa các lesson nằm trong cùng module hiện tại.
  const moduleLessonNavigation = useMemo(() => {
    if (!course || !currentLesson) {
      return {
        previous: null,
        next: null,
      };
    }

    for (const subject of course.subjects) {
      for (const mod of subject.modules) {
        const currentLessonIndex = mod.lessons.findIndex(
          (lesson) => lesson.lesson_id === currentLesson.lesson_id,
        );

        if (currentLessonIndex === -1) continue;

        const previousLesson = mod.lessons[currentLessonIndex - 1] as
          | LessonWithStatus
          | undefined;
        const nextLesson = mod.lessons[currentLessonIndex + 1] as
          | LessonWithStatus
          | undefined;

        return {
          previous:
            previousLesson && previousLesson.status !== LessonStatus.LOCKED
              ? { subject, module: mod, lesson: previousLesson }
              : null,
          next: nextLesson
            ? { subject, module: mod, lesson: nextLesson }
            : null,
        };
      }
    }

    return {
      previous: null,
      next: null,
    };
  }, [course, currentLesson]);

  const navigateToModuleLesson = (direction: "previous" | "next") => {
    const target = moduleLessonNavigation[direction];
    if (!target) return;

    selectLesson(target.subject, target.lesson);

    setExpandedSubjects((prev) => ({
      ...prev,
      [target.subject.subject_id]: true,
    }));
    setExpandedModules((prev) => ({
      ...prev,
      [target.module.module_id]: true,
    }));
  };

  const handleQuizPassed = (submissionStatus?: string, isPass?: boolean) => {
    if (!currentLesson || !course) return;

    const isPendingGrading = submissionStatus === "SUBMITTED";
    const isFailed = isPass === false;

    const shouldMarkCompleted = !isPendingGrading && !isFailed;
    const shouldUnlockNext = shouldMarkCompleted || isPendingGrading;

    const currentIndex = flatLessons.findIndex(
      (f) => f.lesson.lesson_id === currentLesson.lesson_id,
    );

    const nextItem =
      currentIndex !== -1 && currentIndex + 1 < flatLessons.length
        ? flatLessons[currentIndex + 1]
        : null;

    // Nếu bài kế tiếp đã mở sẵn (không LOCKED) và không phải bài tùy chọn
    // -> không cần tìm/mở thêm gì (tránh mở nhầm bài xa hơn, sai thứ tự)
    const nextAlreadyAccessible =
      !!nextItem &&
      nextItem.lesson.status !== LessonStatus.LOCKED &&
      !nextItem.lesson.is_optional;

    const unlockTarget =
      shouldUnlockNext && currentIndex !== -1 && !nextAlreadyAccessible
        ? findNextLockedLesson(currentIndex + 1)
        : null;

    setCourse((prevCourse) => {
      if (!prevCourse) return prevCourse;
      return {
        ...prevCourse,
        subjects: prevCourse.subjects.map((sub) => ({
          ...sub,
          modules: sub.modules.map((mod) => ({
            ...mod,
            lessons: mod.lessons.map((les: any) => {
              if (les.lesson_id === currentLesson.lesson_id) {
                return {
                  ...les,
                  submit_status: submissionStatus ?? les.submit_status,
                  ...(shouldMarkCompleted
                    ? { status: LessonStatus.COMPLETED }
                    : {}),
                };
              }
              if (
                unlockTarget &&
                les.lesson_id === unlockTarget.lesson.lesson_id
              ) {
                return { ...les, status: LessonStatus.UNLOCKED };
              }
              return les;
            }),
          })),
        })),
      };
    });

    setCurrentLesson(
      (prev: LessonWithStatus | undefined): LessonWithStatus | undefined =>
        prev
          ? {
              ...prev,
              submit_status: (submissionStatus ??
                prev.submit_status) as LessonWithStatus["submit_status"],
              ...(shouldMarkCompleted
                ? { status: LessonStatus.COMPLETED }
                : {}),
            }
          : prev,
    );
  };

  const handleCompleteAndNext = async () => {
    if (!currentLesson || !course) return;

    const targetLessonId = currentLesson.lesson_id;
    const isOptionalLesson = Boolean(currentLesson.is_optional);

    setCompleting(true);
    try {
      const result = await completeLessonAction(targetLessonId);

      if (result.success) {
        const currentIndex = flatLessons.findIndex(
          (f) => f.lesson.lesson_id === currentLesson.lesson_id,
        );

        const nextItem =
          currentIndex !== -1 && currentIndex + 1 < flatLessons.length
            ? flatLessons[currentIndex + 1]
            : null;

        const unlockTarget =
          !isOptionalLesson && currentIndex !== -1
            ? findNextLockedLesson(currentIndex + 1)
            : null;

        setCourse((prevCourse) => {
          if (!prevCourse) return prevCourse;
          return {
            ...prevCourse,
            subjects: prevCourse.subjects.map((sub) => ({
              ...sub,
              modules: sub.modules.map((mod) => ({
                ...mod,
                lessons: mod.lessons.map((les: any) => {
                  if (les.lesson_id === currentLesson.lesson_id) {
                    return { ...les, status: LessonStatus.COMPLETED };
                  }
                  if (
                    unlockTarget &&
                    les.lesson_id === unlockTarget.lesson.lesson_id
                  ) {
                    return { ...les, status: LessonStatus.UNLOCKED };
                  }
                  return les;
                }),
              })),
            })),
          };
        });

        setCurrentLesson((prev) =>
          prev ? { ...prev, status: LessonStatus.COMPLETED } : prev,
        );

        if (!isOptionalLesson && nextItem) {
          const updatedNextStatus =
            nextItem.lesson.status === LessonStatus.LOCKED
              ? LessonStatus.UNLOCKED
              : nextItem.lesson.status;

          const nextLessonUpdated: LessonWithStatus = {
            ...nextItem.lesson,
            status: updatedNextStatus,
          };

          selectLesson(nextItem.subject, nextLessonUpdated);

          setExpandedSubjects((prev) => ({
            ...prev,
            [nextItem.subject.subject_id]: true,
          }));
          setExpandedModules((prev) => ({
            ...prev,
            [nextItem.module.module_id]: true,
          }));
        }
      } else {
        alert(result.error || "Có lỗi xảy ra khi xác nhận hoàn thành bài học.");
      }
    } catch (err) {
      console.error("Lỗi khi bấm hoàn thành:", err);
    } finally {
      setCompleting(false);
    }
  };

  const handleSlideNext = async () => {
    if (
      !currentLesson ||
      !course ||
      completing ||
      slideCompletionInFlightRef.current
    ) {
      return;
    }

    if (currentLesson.status === LessonStatus.COMPLETED) {
      navigateToModuleLesson("next");
      return;
    }

    const target = moduleLessonNavigation.next;
    if (!target) return;

    const previousLesson = currentLesson;
    const previousSubject = currentSubject;
    const previousLessonStatus = currentLesson.status;
    const previousTargetStatus = target.lesson.status;
    const nextLesson: LessonWithStatus = {
      ...target.lesson,
      status:
        target.lesson.status === LessonStatus.LOCKED
          ? LessonStatus.UNLOCKED
          : target.lesson.status,
    };

    // Optimistic UI: đổi lesson ngay, không chờ độ trễ của API.
    slideCompletionInFlightRef.current = true;
    setCompleting(true);

    setCourse((prevCourse) => {
      if (!prevCourse) return prevCourse;

      return {
        ...prevCourse,
        subjects: prevCourse.subjects.map((subject) => ({
          ...subject,
          modules: subject.modules.map((mod) => ({
            ...mod,
            lessons: mod.lessons.map((lesson: any) => {
              if (lesson.lesson_id === previousLesson.lesson_id) {
                return { ...lesson, status: LessonStatus.COMPLETED };
              }

              if (lesson.lesson_id === nextLesson.lesson_id) {
                return { ...lesson, status: nextLesson.status };
              }

              return lesson;
            }),
          })),
        })),
      };
    });

    selectLesson(target.subject, nextLesson);
    setExpandedSubjects((prev) => ({
      ...prev,
      [target.subject.subject_id]: true,
    }));
    setExpandedModules((prev) => ({
      ...prev,
      [target.module.module_id]: true,
    }));

    try {
      const result = await completeLessonAction(previousLesson.lesson_id);

      if (!result.success) {
        throw new Error(
          result.error || "Không thể lưu trạng thái hoàn thành bài học.",
        );
      }
    } catch (error) {
      console.error("Đồng bộ tiến độ bài học thất bại:", error);

      // API thất bại: hoàn tác đúng hai trạng thái vừa cập nhật.
      setCourse((prevCourse) => {
        if (!prevCourse) return prevCourse;

        return {
          ...prevCourse,
          subjects: prevCourse.subjects.map((subject) => ({
            ...subject,
            modules: subject.modules.map((mod) => ({
              ...mod,
              lessons: mod.lessons.map((lesson: any) => {
                if (lesson.lesson_id === previousLesson.lesson_id) {
                  return { ...lesson, status: previousLessonStatus };
                }

                if (lesson.lesson_id === nextLesson.lesson_id) {
                  return { ...lesson, status: previousTargetStatus };
                }

                return lesson;
              }),
            })),
          })),
        };
      });

      if (previousSubject) {
        setCurrentSubject(previousSubject);
      }
      setCurrentLesson(previousLesson);
      setLastLessonId(id, previousLesson.lesson_id);
      alert(
        error instanceof Error
          ? error.message
          : "Không thể lưu tiến độ. Vui lòng thử lại.",
      );
    } finally {
      slideCompletionInFlightRef.current = false;
      setCompleting(false);
    }
  };

  const handleVideoCompleted = () => {
    if (!currentLesson || !course) return;

    const targetLessonId = currentLesson.lesson_id;
    const isOptionalLesson = Boolean(currentLesson.is_optional);

    const currentIndex = flatLessons.findIndex(
      (f) => f.lesson.lesson_id === currentLesson.lesson_id,
    );

    const nextItem =
      currentIndex !== -1 && currentIndex + 1 < flatLessons.length
        ? flatLessons[currentIndex + 1]
        : null;

    const unlockTarget =
      !isOptionalLesson && currentIndex !== -1
        ? findNextLockedLesson(currentIndex + 1)
        : null;

    setCourse((prevCourse) => {
      if (!prevCourse) return prevCourse;
      return {
        ...prevCourse,
        subjects: prevCourse.subjects.map((sub) => ({
          ...sub,
          modules: sub.modules.map((mod) => ({
            ...mod,
            lessons: mod.lessons.map((les: any) => {
              if (les.lesson_id === targetLessonId) {
                return { ...les, status: LessonStatus.COMPLETED };
              }
              if (
                unlockTarget &&
                les.lesson_id === unlockTarget.lesson.lesson_id
              ) {
                return { ...les, status: LessonStatus.UNLOCKED };
              }
              return les;
            }),
          })),
        })),
      };
    });

    setCurrentLesson((prev) =>
      prev ? { ...prev, status: LessonStatus.COMPLETED } : prev,
    );

    if (!isOptionalLesson && nextItem) {
      const updatedNextStatus =
        nextItem.lesson.status === LessonStatus.LOCKED
          ? LessonStatus.UNLOCKED
          : nextItem.lesson.status;

      const nextLessonUpdated: LessonWithStatus = {
        ...nextItem.lesson,
        status: updatedNextStatus,
      };

      selectLesson(nextItem.subject, nextLessonUpdated);

      setExpandedSubjects((prev) => ({
        ...prev,
        [nextItem.subject.subject_id]: true,
      }));
      setExpandedModules((prev) => ({
        ...prev,
        [nextItem.module.module_id]: true,
      }));
    }
  };

  const toggleSubject = (subjectId: string) =>
    setExpandedSubjects((prev) => ({ ...prev, [subjectId]: !prev[subjectId] }));

  const toggleModule = (moduleId: string) =>
    setExpandedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));

  const isAllExpanded = useMemo(() => {
    if (!course) return false;
    const allSubjectIds = course.subjects.map((s) => s.subject_id);
    return allSubjectIds.every((id) => expandedSubjects[id]);
  }, [course, expandedSubjects]);

  const toggleAll = () => {
    if (!course) return;
    const nextState = !isAllExpanded;
    const newSubjects: Record<string, boolean> = {};
    const newModules: Record<string, boolean> = {};

    course.subjects.forEach((sub) => {
      newSubjects[sub.subject_id] = nextState;
      sub.modules.forEach((mod) => {
        newModules[mod.module_id] = nextState;
      });
    });

    setExpandedSubjects(newSubjects);
    setExpandedModules(newModules);
  };

  const hasVideo = Boolean(
    currentLesson?.video_url && currentLesson.video_url.trim() !== "",
  );

  // Danh sách Tab Động (Chỉ thêm tab 'Bài thi' khi had_quiz == true VÀ KHÔNG CÓ video)
  const lessonTabs = useMemo(() => {
    const tabs: [TabKey, string][] = [
      ["lecture", "Bài giảng"],
      [
        "resources",
        `Tài liệu${resources.length ? ` (${resources.length})` : ""}`,
      ],
      ["notes", `Ghi chú${notes.length ? ` (${notes.length})` : ""}`],
    ];

    if (currentLesson?.had_quiz && !hasVideo) {
      tabs.push(["quiz", "Bài thi"]);
    }

    return tabs;
  }, [currentLesson?.had_quiz, hasVideo, resources.length, notes.length]);

  useEffect(() => {
    if (!currentLesson?.lesson_id || !hasVideo) {
      setVideoProgress(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setVideoProgressLoading(true);
      const data = await getOrCreateVideoProgressAction(
        currentLesson.lesson_id,
        currentLesson.duration_seconds ?? 0,
      );
      if (!cancelled) setVideoProgress(data);
      setVideoProgressLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentLesson?.lesson_id, hasVideo]);

  const handleQuickCreateNote = async () => {
    if (!quickNoteContent.trim() || !currentLesson || !course) return;

    setQuickNoteSaving(true);
    const payload: NoteCreatePayload = {
      course_id: id,
      lesson_id: currentLesson.lesson_id,
      timestamp_seconds: Math.floor(videoCurrentTime),
      content: quickNoteContent.trim(),
    };
    const result = await createNoteAction(payload);
    setQuickNoteSaving(false);

    if (result.success && result.data) {
      setNotes((prev) => [...prev, result.data as UserLessonNote]);
      setQuickNoteContent("");
      setQuickNoteOpen(false);
    } else {
      alert(result.error || "Tạo ghi chú thất bại.");
    }
  };

  if (loading) {
    return <CourseLoadingScreen />;
  }

  if (errorMessage || !course) {
    return (
      <CourseErrorScreen
        errorMessage={errorMessage}
        onBackHome={() => router.push("/home")}
      />
    );
  }

  return (
    <div
      className="h-screen overflow-hidden bg-[#F7F8FB] flex flex-col text-[#161826]"
      style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
    >
      <Navbar />

      <CourseHeaderBar
        courseTitle={course.title}
        progressPercent={progressPercent}
        onLeaveCourse={() => router.push("/dashboard-student")}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <CourseSidebar
          course={course}
          expandedSubjects={expandedSubjects}
          expandedModules={expandedModules}
          onToggleSubject={toggleSubject}
          onToggleModule={toggleModule}
          isAllExpanded={isAllExpanded}
          onToggleAll={toggleAll}
          completedCount={completedCount}
          totalLessons={flatLessons.length}
          currentLessonId={currentLesson?.lesson_id}
          onSelectLesson={selectLesson}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapsed}
        />

        {/* Khung Hiển Thị Nội Dung Bài Học */}
        <div
          ref={lessonContentScrollRef}
          className="flex-1 min-h-0 overflow-y-auto bg-[#F7F8FB] flex flex-col"
        >
          <div className="px-10 pt-8 space-y-6 flex-1 max-w-7xl">
            <LessonTitleHeader
              subjectTitle={currentSubject?.title}
              subjectAccentColor={
                currentSubject
                  ? getSubjectAccent(course, currentSubject.subject_id)
                  : "#5B5FEF"
              }
              isOptional={currentLesson?.is_optional}
              lessonTitle={currentLesson?.title}
            />

            {!currentLesson?.is_quiz && (
              <LessonTabsNav
                tabs={lessonTabs}
                activeTab={activeTab}
                onChange={setActiveTab}
              />
            )}

            {/* TAB BÀI GIẢNG / BÀI ĐỌC */}
            {activeTab === "lecture" && !currentLesson?.is_quiz && (
              <div key="lecture" className="anim-fade-up space-y-6 pb-12">
                <LectureTabContent
                  currentLesson={currentLesson}
                  hasVideo={hasVideo}
                  videoProgress={videoProgress}
                  videoProgressLoading={videoProgressLoading}
                  onProgressUpdate={handleProgressUpdate}
                  onTimeUpdate={setVideoCurrentTime}
                  onVideoEnded={handleVideoCompleted}
                  quickNoteOpen={quickNoteOpen}
                  quickNoteContent={quickNoteContent}
                  quickNoteSaving={quickNoteSaving}
                  videoCurrentTime={videoCurrentTime}
                  onQuickNoteOpen={() => setQuickNoteOpen(true)}
                  onQuickNoteContentChange={setQuickNoteContent}
                  onQuickNoteSave={handleQuickCreateNote}
                  onQuickNoteCancel={() => {
                    setQuickNoteOpen(false);
                    setQuickNoteContent("");
                  }}
                  completing={completing}
                  onCompleteAndNext={handleCompleteAndNext}
                  hasPreviousLesson={Boolean(moduleLessonNavigation.previous)}
                  hasNextLesson={
                    Boolean(moduleLessonNavigation.next) && !completing
                  }
                  onPreviousLesson={() => navigateToModuleLesson("previous")}
                  onNextLesson={handleSlideNext}
                />
              </div>
            )}

            {/* TAB TÀI LIỆU */}
            {activeTab === "resources" && !currentLesson?.is_quiz && (
              <div key="resources" className="anim-fade-up space-y-3 pb-12">
                <ResourcesTabContent
                  loading={resourcesLoading}
                  resources={resources}
                  courseBackendUrl={COURSE_URL}
                />
              </div>
            )}

            {/* TAB GHI CHÚ */}
            {activeTab === "notes" &&
              !currentLesson?.is_quiz &&
              currentLesson && (
                <div key="notes" className="anim-fade-up pb-12">
                  <LessonNotesPanel
                    courseId={id}
                    lessonId={currentLesson.lesson_id}
                    hasVideo={hasVideo}
                    videoCurrentTime={videoCurrentTime}
                    notes={notes}
                    loading={notesLoading}
                    onNotesChange={setNotes}
                    onSeekRequest={(seconds) => {
                      setSeekTarget(seconds);
                      setActiveTab("lecture");
                    }}
                  />
                </div>
              )}

            {/* TAB BÀI THI / QUIZ SECTION */}
            {(activeTab === "quiz" || currentLesson?.is_quiz) &&
              currentLesson && (
                <div key="quiz" className="anim-fade-up pb-12">
                  <QuizSection
                    lessonId={currentLesson.lesson_id}
                    onQuizPassed={handleQuizPassed}
                  />
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
