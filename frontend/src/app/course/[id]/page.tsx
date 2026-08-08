'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import LessonVideoPlayer from '@/components/LessonVideoPlayer';
import LessonNotesPanel from '@/components/LessonNotesPanel';
import { QuizSection } from '@/components/LessonQuizContainer';
import { getLearningCourse } from '@/actions/getCourse';
import { attachStatusToLessons, completeLessonAction } from '@/actions/getLesson';
import { getLessonNotesAction, createNoteAction } from '@/actions/getNotes';
import { getOrCreateVideoProgressAction, updateVideoProgressAction } from '@/actions/getVideoProgress';
import { getLessonResourcesAction } from '@/actions/getLessonResource';
import { LessonResourceItem } from '@/types/lessons';
import { CourseLearningStructure } from '@/types/course';
import { SubjectLearningStructure } from '@/types/subjects';
import { ModuleLearningStructure } from '@/types/modules';
import { LessonLearningStructure } from '@/types/lessons';
import { UserLessonNote, NoteCreatePayload } from '@/types/progresses';
import { LessonStatus } from '@/types/statuses';
import { VideoProgress } from '@/types/video';
import { InVideoQuizWrapper } from '@/components/InVideoQuizWrapper';

type TabKey = 'lecture' | 'resources' | 'notes' | 'quiz';

const SUBJECT_ACCENTS = ['#5B5FEF', '#12B886', '#F2A93B', '#E5484D', '#0EA5E9'];
const COURSE_URL = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL;

type LessonWithStatus = LessonLearningStructure & {
  status?: LessonStatus;
  progress_id?: string;
  video_url?: string | null;
  content_body?: string | null;
  submit_status?: string | null;
  is_optional?: boolean;
  had_quiz?: boolean;
};

export default function CourseLearningPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  // State quản lý dữ liệu lấy từ Backend API
  const [course, setCourse] = useState<CourseLearningStructure | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State điều hướng cây thư mục bài học
  const [currentLesson, setCurrentLesson] = useState<LessonWithStatus | undefined>(undefined);
  const [currentSubject, setCurrentSubject] = useState<SubjectLearningStructure | undefined>(undefined);

  // State quản lý thu gọn / mở rộng
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<TabKey>('lecture');

  // State Ghi chú + Video
  const [notes, setNotes] = useState<UserLessonNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);

  // Tiến độ video THẬT
  const [videoProgress, setVideoProgress] = useState<VideoProgress | null>(null);
  const [videoProgressLoading, setVideoProgressLoading] = useState(false);

  // STATE TÀI LIỆU ĐÍNH KÈM (RESOURCES)
  const [resources, setResources] = useState<LessonResourceItem[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  // Ô tạo ghi chú nhanh
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [quickNoteContent, setQuickNoteContent] = useState('');
  const [quickNoteSaving, setQuickNoteSaving] = useState(false);

  // State xử lý quá trình gửi API hoàn thành bài đọc
  const [completing, setCompleting] = useState(false);

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
                const lessonsWithStatus = await attachStatusToLessons(mod.lessons);
                return {
                  ...mod,
                  lessons: lessonsWithStatus,
                };
              })
            );
            return {
              ...subject,
              modules: updatedModules,
            };
          })
        );

        const courseWithStatus: CourseLearningStructure = {
          ...rawCourse,
          subjects: updatedSubjects,
        };

        setCourse(courseWithStatus);

        const firstSubject = courseWithStatus.subjects[0];
        const firstModule = firstSubject?.modules[0];
        const firstLesson = firstModule?.lessons[0] as LessonWithStatus | undefined;

        if (firstSubject) {
          setCurrentSubject(firstSubject);
          setExpandedSubjects({ [firstSubject.subject_id]: true });
        }
        if (firstModule) {
          setExpandedModules({ [firstModule.module_id]: true });
        }
        if (firstLesson) {
          setCurrentLesson(firstLesson);
          setActiveTab(firstLesson.is_quiz ? 'quiz' : 'lecture');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Không thể lấy dữ liệu khóa học');
      } finally {
        setLoading(false);
      }
    }

    fetchLearningData();
  }, [id]);

  // Lấy danh sách ghi chú
  useEffect(() => {
    if (!currentLesson?.lesson_id) {
      setNotes([]);
      return;
    }

    let cancelled = false;

    (async () => {
      setNotesLoading(true);
      const data = await getLessonNotesAction(currentLesson.lesson_id);
      if (!cancelled) setNotes(data);
      setNotesLoading(false);
    })();

    setVideoCurrentTime(0);
    setSeekTarget(null);
    setQuickNoteOpen(false);
    setQuickNoteContent('');

    return () => {
      cancelled = true;
    };
  }, [currentLesson?.lesson_id]);

  // EFFECT TẢI DANH SÁCH TÀI LIỆU KHI CHỌN BÀI HỌC
  useEffect(() => {
    if (!currentLesson?.lesson_id) {
      setResources([]);
      return;
    }

    let cancelled = false;

    (async () => {
      setResourcesLoading(true);
      const data = await getLessonResourcesAction(currentLesson.lesson_id);
      if (!cancelled) setResources(data);
      setResourcesLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentLesson?.lesson_id]);

  const flatLessons = useMemo(() => {
    if (!course) return [];
    const flat: { subject: SubjectLearningStructure; module: ModuleLearningStructure; lesson: LessonWithStatus }[] = [];
    course.subjects.forEach((subject) => {
      subject.modules.forEach((mod) => {
        mod.lessons.forEach((lesson) => flat.push({ subject, module: mod, lesson: lesson as LessonWithStatus }));
      });
    });
    return flat;
  }, [course]);

  const completedCount = flatLessons.filter(
    (f) => f.lesson.status === LessonStatus.COMPLETED
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

  const subjectAccent = (subjectId: string) => {
    const idx = (course?.subjects.findIndex((s) => s.subject_id === subjectId) ?? 0) % SUBJECT_ACCENTS.length;
    return SUBJECT_ACCENTS[idx < 0 ? 0 : idx];
  };

  const handleProgressUpdate = async (updatedProgress: VideoProgress) => {
    if (!updatedProgress.video_progress_id) return;

    const result = await updateVideoProgressAction(updatedProgress.video_progress_id, {
      last_watched_second: updatedProgress.last_watched_second,
      max_watched_second: updatedProgress.max_watched_second,
      completion_percentage: updatedProgress.completion_percentage,
      is_finished: updatedProgress.is_finished,
    });

    if (!result.success) {
      console.error('Đồng bộ tiến độ video thất bại:', result.error);
    }
  };

  const selectLesson = (subject: SubjectLearningStructure, lesson: LessonWithStatus) => {
    if (lesson.status === LessonStatus.LOCKED) return;
    setCurrentSubject(subject);
    setCurrentLesson(lesson);

    if (lesson.is_quiz) {
      setActiveTab('quiz');
    } else {
      setActiveTab('lecture');
    }
  };

  const handleQuizPassed = (submissionStatus?: string) => {
    if (!currentLesson || !course) return;

    const currentIndex = flatLessons.findIndex(
      (f) => f.lesson.lesson_id === currentLesson.lesson_id
    );

    const unlockTarget =
      currentIndex !== -1 ? findNextLockedLesson(currentIndex + 1) : null;

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
                return { ...les, status: LessonStatus.COMPLETED, submit_status: submissionStatus ?? 'GRADED' };
              }
              if (unlockTarget && les.lesson_id === unlockTarget.lesson.lesson_id) {
                return { ...les, status: LessonStatus.UNLOCKED };
              }
              return les;
            }),
          })),
        })),
      };
    });
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
          (f) => f.lesson.lesson_id === currentLesson.lesson_id
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
                  if (unlockTarget && les.lesson_id === unlockTarget.lesson.lesson_id) {
                    return { ...les, status: LessonStatus.UNLOCKED };
                  }
                  return les;
                }),
              })),
            })),
          };
        });

        setCurrentLesson((prev) => (prev ? { ...prev, status: LessonStatus.COMPLETED } : prev));

        if (!isOptionalLesson && nextItem) {
          const updatedNextStatus =
            nextItem.lesson.status === LessonStatus.LOCKED
              ? LessonStatus.UNLOCKED
              : nextItem.lesson.status;

          if (updatedNextStatus !== LessonStatus.LOCKED) {
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
        }
      } else {
        alert(result.error || 'Có lỗi xảy ra khi xác nhận hoàn thành bài học.');
      }
    } catch (err) {
      console.error('Lỗi khi bấm hoàn thành:', err);
    } finally {
      setCompleting(false);
    }
  };

  const handleVideoCompleted = () => {
    if (!currentLesson || !course) return;

    const targetLessonId = currentLesson.lesson_id;
    const isOptionalLesson = Boolean(currentLesson.is_optional);

    const currentIndex = flatLessons.findIndex(
      (f) => f.lesson.lesson_id === currentLesson.lesson_id
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
              if (unlockTarget && les.lesson_id === unlockTarget.lesson.lesson_id) {
                return { ...les, status: LessonStatus.UNLOCKED };
              }
              return les;
            }),
          })),
        })),
      };
    });

    setCurrentLesson((prev) => (prev ? { ...prev, status: LessonStatus.COMPLETED } : prev));

    if (!isOptionalLesson && nextItem) {
      const updatedNextStatus =
        nextItem.lesson.status === LessonStatus.LOCKED
          ? LessonStatus.UNLOCKED
          : nextItem.lesson.status;

      if (updatedNextStatus !== LessonStatus.LOCKED) {
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

  const hasVideo = Boolean(currentLesson?.video_url && currentLesson.video_url.trim() !== '');

  // Danh sách Tab Động (Chỉ thêm tab 'Bài thi' khi had_quiz == true VÀ KHÔNG CÓ video)
  const lessonTabs = useMemo(() => {
    const tabs: [TabKey, string][] = [
      ['lecture', 'Bài giảng'],
      ['resources', `Tài liệu${resources.length ? ` (${resources.length})` : ''}`],
      ['notes', `Ghi chú${notes.length ? ` (${notes.length})` : ''}`],
    ];

    if (currentLesson?.had_quiz && !hasVideo) {
      tabs.push(['quiz', 'Bài thi']);
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
        currentLesson.duration_seconds ?? 0
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
      setQuickNoteContent('');
      setQuickNoteOpen(false);
    } else {
      alert(result.error || 'Tạo ghi chú thất bại.');
    }
  };

  const formatSeconds = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const renderQuizBadge = (submitStatus?: string | null) => {
    switch (submitStatus) {
      case 'GRADED':
        return (
          <span
            className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#E6F4EA', color: '#137333', border: '1px solid #CEEAD6' }}
            title="Đã chấm điểm"
          >
            ĐÃ CHẤM
          </span>
        );
      case 'SUBMITTED':
        return (
          <span
            className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#FEF7E0', color: '#B06000', border: '1px solid #FDE293' }}
            title="Đã nộp bài, đang chờ chấm điểm"
          >
            ĐÃ NỘP BÀI
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span
            className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#E8F0FE', color: '#1A73E8', border: '1px solid #AECBFA' }}
            title="Đang làm bài"
          >
            ĐANG LÀM
          </span>
        );
      default:
        return (
          <span
            className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#FDF3DA', color: '#9A6B00' }}
          >
            KIỂM TRA
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-[#E7E9F0] border-t-[#5B5FEF] animate-spin" />
          <span className="text-sm text-[#565A70] font-semibold">Đang tải không gian học tập...</span>
        </div>
      </div>
    );
  }

  if (errorMessage || !course) {
    return (
      <div className="min-h-screen bg-[#F7F8FB] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-[#ECEAF0] text-center max-w-md shadow-sm space-y-4">
          <div className="w-12 h-12 bg-[#FDE8E8] text-[#E5484D] rounded-full flex items-center justify-center mx-auto text-lg font-bold">!</div>
          <div>
            <h3 className="font-display text-lg font-bold text-[#161826]">Không thể truy cập</h3>
            <p className="text-sm text-[#565A70] mt-1.5 leading-relaxed">{errorMessage || 'Khóa học không tồn tại.'}</p>
          </div>
          <button onClick={() => router.push('/home')} className="w-full py-3 bg-[#5B5FEF] text-white rounded-full text-sm font-bold transition-transform hover:scale-[1.02]">
            Quay về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FB] flex flex-col text-[#161826]" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <Navbar />

      {/* HEADER TỔNG QUAN KHÓA HỌC */}
      <div className="bg-[#12141C] text-white px-6 py-3.5 flex justify-between items-center border-b border-white/10 shadow-md">
        <div className="flex items-center gap-3 min-w-0 pr-4">
          <span className="bg-[#5B5FEF] text-white text-[11px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wide shrink-0">
            Khóa học
          </span>
          <h1 className="text-base sm:text-lg font-bold text-white truncate" title={course.title}>
            {course.title}
          </h1>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <div className="hidden sm:flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
            <span className="text-xs font-semibold text-white/80">Tiến độ:</span>
            <div className="w-40 h-2.5 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, #5B5FEF 0%, #12B886 100%)',
                }}
              />
            </div>
            <span className="text-xs font-extrabold text-[#12B886] tabular-nums w-10 text-right">
              {progressPercent}%
            </span>
          </div>

          <button
            type="button"
            onClick={() => router.push('/dashboard-student')}
            className="text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer hover:bg-red-500/20"
            style={{ backgroundColor: 'rgba(229,72,77,0.15)', color: '#FF6B6B', border: '1px solid rgba(229,72,77,0.3)' }}
          >
            Rời khỏi lớp học
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden h-[calc(100vh-108px)]">
        {/* Sidebar Cây Thư Mục Khóa Học */}
        <div className="w-[22rem] border-r border-[#ECEAF0] bg-white flex flex-col overflow-y-auto shrink-0">
          <div className="p-5 border-b border-[#ECEAF0] bg-[#FBFBFD]">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display text-base font-bold text-[#161826] line-clamp-2 leading-snug">
                {course.title}
              </h2>
              <button
                type="button"
                onClick={toggleAll}
                className="shrink-0 text-xs font-bold text-[#5B5FEF] hover:bg-[#EEF0FE] px-2.5 py-1 rounded-md transition-colors"
                title={isAllExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
              >
                {isAllExpanded ? 'Thu gọn' : 'Mở rộng'}
              </button>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs font-semibold text-[#565A70]">
              <span>Đã hoàn thành</span>
              <span className="text-[#5B5FEF] font-bold tabular-nums">{completedCount}/{flatLessons.length} bài học</span>
            </div>
          </div>

          <div className="flex-1 py-3 px-3 space-y-2">
            {course.subjects.map((subject, subIdx) => {
              const subjectExpanded = !!expandedSubjects[subject.subject_id];
              const accent = subjectAccent(subject.subject_id);

              return (
                <div key={subject.subject_id} className="rounded-2xl overflow-hidden bg-[#FBFBFD] border border-[#EFEFF5]">
                  <button
                    type="button"
                    onClick={() => toggleSubject(subject.subject_id)}
                    className="w-full text-left pl-4 pr-3 py-3 flex justify-between items-center gap-2 hover:bg-white transition-colors duration-200 relative group cursor-pointer"
                  >
                    <span className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: accent }} />
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider block" style={{ color: accent }}>
                        Môn học {subIdx + 1}
                      </span>
                      <span className="text-sm font-bold text-[#2B2D3D] flex items-center gap-1.5 line-clamp-1">
                        {subject.title}
                      </span>
                    </div>

                    <div className="shrink-0 text-[#9195A8] group-hover:text-[#161826] transition-transform duration-200">
                      <svg
                        className={`w-4 h-4 transform transition-transform duration-200 ${subjectExpanded ? 'rotate-180' : 'rotate-0'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  <div
                    className="transition-all duration-300 ease-in-out overflow-hidden"
                    style={{
                      maxHeight: subjectExpanded ? '2000px' : '0px',
                      opacity: subjectExpanded ? 1 : 0,
                    }}
                  >
                    <div className="pb-2 px-2 space-y-1.5 pt-1">
                      {subject.modules.map((mod, modIdx) => {
                        const isExpanded = !!expandedModules[mod.module_id];
                        return (
                          <div key={mod.module_id} className="bg-white rounded-xl border border-[#F0F0F5] overflow-hidden">
                            <button
                              type="button"
                              onClick={() => toggleModule(mod.module_id)}
                              className="w-full text-left px-3.5 py-2.5 flex justify-between items-center transition-colors duration-200 hover:bg-[#FAFAFD] rounded-xl cursor-pointer"
                            >
                              <span className="text-xs font-bold text-[#3E4054] line-clamp-1">
                                Module {modIdx + 1}. {mod.title}
                              </span>

                              <div className="shrink-0 text-[#B0B3C4]">
                                <svg
                                  className={`w-3.5 h-3.5 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </button>

                            <div
                              className="transition-all duration-300 ease-in-out overflow-hidden"
                              style={{
                                maxHeight: isExpanded ? '1000px' : '0px',
                                opacity: isExpanded ? 1 : 0,
                              }}
                            >
                              <div className="pb-2 px-2 space-y-1">
                                {mod.lessons.map((lessonItem) => {
                                  const lesson = lessonItem as LessonWithStatus;
                                  const isSelected = currentLesson?.lesson_id === lesson.lesson_id;
                                  const isLocked = lesson.status === LessonStatus.LOCKED;

                                  const isWaitingGrading = lesson.submit_status === 'SUBMITTED';
                                  const isCompleted = lesson.status === LessonStatus.COMPLETED && !isWaitingGrading;

                                  return (
                                    <button
                                      key={lesson.lesson_id}
                                      type="button"
                                      disabled={isLocked}
                                      onClick={() => selectLesson(subject, lesson)}
                                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-2.5 cursor-pointer ${isSelected
                                        ? 'bg-[#EEF0FE] text-[#3F3FC9] font-bold shadow-sm'
                                        : isLocked
                                          ? 'opacity-40 cursor-not-allowed'
                                          : 'hover:bg-[#FAFAFD] hover:translate-x-0.5 text-[#4B4E60]'
                                        }`}
                                    >
                                      <span className="shrink-0 relative w-4 h-4 flex items-center justify-center">
                                        {isCompleted ? (
                                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white font-extrabold" style={{ backgroundColor: '#12B886' }}>✓</span>
                                        ) : isSelected ? (
                                          <span className="w-3.5 h-3.5 rounded-full anim-pulse-ring" style={{ backgroundColor: '#5B5FEF' }} />
                                        ) : (
                                          <span className="w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: accent }} />
                                        )}
                                      </span>

                                      <span className="flex-1 line-clamp-2 leading-relaxed">
                                        {lesson.title}
                                      </span>

                                      {lesson.is_optional && (
                                        <span
                                          className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200"
                                          title="Bài học không bắt buộc"
                                        >
                                          Tùy chọn
                                        </span>
                                      )}

                                      {/* Hiển thị Badge cho bài học quiz */}
                                      {(lesson.is_quiz || lesson.had_quiz) && renderQuizBadge(lesson.submit_status)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Khung Hiển Thị Nội Dung Bài Học */}
        <div className="flex-1 overflow-y-auto bg-[#F7F8FB] flex flex-col">
          <div className="px-8 pt-8 space-y-6 flex-1 max-w-5xl">
            {/* Tiêu đề bài học */}
            <div className="space-y-2 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg"
                  style={{
                    color: currentSubject ? subjectAccent(currentSubject.subject_id) : '#5B5FEF',
                    backgroundColor: currentSubject ? `${subjectAccent(currentSubject.subject_id)}1A` : '#EEF0FE',
                  }}
                >
                  {currentSubject?.title ?? 'Bài học'}
                </span>

                {currentLesson?.is_optional && (
                  <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 border border-gray-200">
                    Tùy chọn (Không bắt buộc)
                  </span>
                )}
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#161826] leading-snug">
                {currentLesson ? currentLesson.title : 'Vui lòng chọn một bài học bên danh sách'}
              </h1>
            </div>

            {/* THANH MỤC / TAB (Dynamic) */}
            {!currentLesson?.is_quiz && (
              <div className="flex gap-2 relative">
                {lessonTabs.map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`relative px-5 py-3 text-sm font-bold transition-colors duration-200 cursor-pointer ${activeTab === key ? 'text-[#161826]' : 'text-[#8A8FA3] hover:text-[#565A70]'}`}
                  >
                    {label}
                    <span
                      className="absolute left-4 right-4 -bottom-px h-[3px] rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: activeTab === key ? '#5B5FEF' : 'transparent',
                        transform: activeTab === key ? 'scaleX(1)' : 'scaleX(0)',
                      }}
                    />
                  </button>
                ))}
                <span className="absolute left-0 right-0 bottom-0 h-px bg-[#ECEAF0]" />
              </div>
            )}

            {/* TAB BÀI GIẢNG / BÀI ĐỌC */}
            {activeTab === 'lecture' && !currentLesson?.is_quiz && (
              <div key="lecture" className="anim-fade-up space-y-6 pb-12">
                {currentLesson ? (
                  <>
                    {hasVideo ? (
                      videoProgressLoading || !videoProgress ? (
                        <div className="w-full aspect-video rounded-3xl bg-[#12141C] flex items-center justify-center">
                          <div className="flex items-center gap-2 text-sm text-white/70 font-semibold">
                            <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
                            Đang tải tiến độ video...
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* --- MÃ MỚI: Đã thay thế LessonVideoPlayer bằng InVideoQuizWrapper --- */}
                          <InVideoQuizWrapper
                            key={currentLesson.lesson_id}
                            lessonId={currentLesson.lesson_id}
                            videoData={{
                              url: currentLesson.video_url as string,
                              progressId: videoProgress.video_progress_id,
                              initialProgress: videoProgress
                            }}
                            onProgressUpdate={handleProgressUpdate}
                            onTimeUpdate={setVideoCurrentTime} // Bắt buộc giữ để ghi chú nhanh lấy được thời gian
                            onVideoEnded={handleVideoCompleted}

                          // Lưu ý: Nếu bạn có tính năng Seek (tua video khi bấm vào ghi chú cũ), 
                          // bạn cần truyền thêm 2 props này và khai báo chúng bên trong InVideoQuizWrapperProps
                          // seekToSeconds={seekTarget}
                          // onSeeked={() => setSeekTarget(null)}
                          />
                          {/* ---------------------------------------------------------------------- */}

                          <div className="bg-white border border-[#ECEAF0] rounded-2xl p-4 shadow-sm mt-4">
                            {!quickNoteOpen ? (
                              <button
                                onClick={() => setQuickNoteOpen(true)}
                                className="text-sm font-bold text-[#5B5FEF] hover:text-[#4B4FEF] flex items-center gap-2 cursor-pointer"
                              >
                                📝 Thêm ghi chú nhanh tại mốc {formatSeconds(videoCurrentTime)}
                              </button>
                            ) : (
                              <div className="flex gap-2">
                                <input
                                  autoFocus
                                  value={quickNoteContent}
                                  onChange={(e) => setQuickNoteContent(e.target.value)}
                                  placeholder="Nhập nội dung ghi chú..."
                                  className="flex-1 text-sm bg-[#F7F8FB] border border-[#E7E9F0] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#5B5FEF]"
                                  onKeyDown={(e) => e.key === 'Enter' && handleQuickCreateNote()}
                                />
                                <button
                                  onClick={handleQuickCreateNote}
                                  disabled={quickNoteSaving || !quickNoteContent.trim()}
                                  className="text-white text-xs font-bold px-5 rounded-xl bg-[#5B5FEF] disabled:opacity-50 cursor-pointer"
                                >
                                  {quickNoteSaving ? 'Lưu...' : 'Lưu'}
                                </button>
                                <button
                                  onClick={() => { setQuickNoteOpen(false); setQuickNoteContent(''); }}
                                  className="text-xs font-bold px-3 text-[#565A70] cursor-pointer"
                                >
                                  Hủy
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )
                    ) : null}

                    {currentLesson.content_body && currentLesson.content_body.trim() !== '' ? (
                      <div className="bg-white border border-[#ECEAF0] rounded-3xl p-8 space-y-4 shadow-sm">
                        <div className="flex items-center gap-2 text-[#5B5FEF] font-bold text-sm uppercase tracking-wider">
                          <span>📖 Nội dung bài học</span>
                        </div>
                        <div
                          className="prose prose-base max-w-none text-[#2B2D3D] leading-relaxed font-normal"
                          dangerouslySetInnerHTML={{ __html: currentLesson.content_body }}
                        />
                      </div>
                    ) : (
                      !hasVideo && (
                        <div className="bg-white border border-[#ECEAF0] rounded-3xl p-8 text-center text-sm text-[#8A8FA3]">
                          Bài học này hiện chưa có nội dung chi tiết.
                        </div>
                      )
                    )}

                    {/* NÚT HOÀN THÀNH BÀI ĐỌC: Chỉ hiển thị khi KHÔNG có video VÀ had_quiz == false */}
                    {!hasVideo && !currentLesson.had_quiz && (
                      <div className="flex justify-end pt-4 border-t border-[#ECEAF0]">
                        <button
                          type="button"
                          onClick={handleCompleteAndNext}
                          disabled={
                            completing ||
                            (currentLesson.is_optional && currentLesson.status === LessonStatus.COMPLETED)
                          }
                          className="flex items-center gap-2.5 bg-[#5B5FEF] hover:bg-[#4B4FEF] text-white text-sm font-bold px-7 py-3.5 rounded-full shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                        >
                          {completing ? (
                            <span>Đang lưu tiến độ...</span>
                          ) : (
                            <>
                              <span>
                                {currentLesson.is_optional
                                  ? currentLesson.status === LessonStatus.COMPLETED
                                    ? 'Đã hoàn thành'
                                    : 'Xác nhận hoàn thành'
                                  : currentLesson.status === LessonStatus.COMPLETED
                                    ? 'Bài tiếp theo'
                                    : 'Xác nhận hoàn thành & Bài tiếp theo'}
                              </span>
                              {!currentLesson.is_optional && <span className="text-base">→</span>}
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full aspect-video rounded-3xl flex flex-col items-center justify-center bg-[#12141C] text-white">
                    <p className="text-sm font-bold text-white/85">Vui lòng chọn một bài học ở danh sách bên trái</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB TÀI LIỆU */}
            {activeTab === 'resources' && !currentLesson?.is_quiz && (
              <div key="resources" className="anim-fade-up space-y-3 pb-12">
                {resourcesLoading ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-[#8A8FA3] py-12">
                    <div className="w-5 h-5 rounded-full border-2 border-[#E7E9F0] border-t-[#5B5FEF] animate-spin" />
                    Đang tải danh sách tài liệu...
                  </div>
                ) : resources.length > 0 ? (
                  <div className="space-y-3">
                    {resources.map((item) => {
                      const downloadUrl = `${COURSE_URL}/lesson-resources/download/${item.resource_id}`;

                      return (
                        <div
                          key={item.resource_id}
                          className="bg-white border border-[#ECEAF0] rounded-2xl p-5 flex items-center justify-between shadow-sm hover:border-[#D0D4F7] transition-all"
                        >
                          <div className="flex items-center gap-4 min-w-0 pr-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#EEF0FE] text-[#5B5FEF] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {item.file_extension || 'TỆP'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#161826] truncate" title={item.file_name}>
                                {item.file_name}
                              </p>
                              <span className="text-xs text-[#8A8FA3] font-semibold uppercase mt-0.5 block">
                                Định dạng: .{item.file_extension}
                              </span>
                            </div>
                          </div>

                          <a
                            href={downloadUrl}
                            download={item.file_name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 flex items-center gap-2 bg-[#F7F8FB] hover:bg-[#EEF0FE] text-[#5B5FEF] border border-[#ECEAF0] text-xs font-bold px-5 py-2.5 rounded-full transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Tải về
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-[#8A8FA3] font-semibold py-12 text-center bg-white border border-[#ECEAF0] rounded-2xl">
                    Bài học này chưa có tài liệu đính kèm.
                  </p>
                )}
              </div>
            )}

            {/* TAB GHI CHÚ */}
            {activeTab === 'notes' && !currentLesson?.is_quiz && currentLesson && (
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
                    setActiveTab('lecture');
                  }}
                />
              </div>
            )}

            {/* TAB BÀI THI / QUIZ SECTION */}
            {(activeTab === 'quiz' || currentLesson?.is_quiz) && currentLesson && (
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