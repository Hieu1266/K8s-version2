'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import LessonVideoPlayer from '@/components/LessonVideoPlayer';
import LessonNotesPanel from '@/components/LessonNotesPanel';
import { getLearningCourse } from '@/actions/getCourse';
import { attachStatusToLessons, completeLessonAction } from '@/actions/getLesson';
import { getLessonNotesAction, createNoteAction } from '@/actions/getNotes';
import { getOrCreateVideoProgressAction, updateVideoProgressAction } from '@/actions/getVideoProgress';
import { CourseLearningStructure } from '@/types/course';
import { SubjectLearningStructure } from '@/types/subjects';
import { ModuleLearningStructure } from '@/types/modules';
import { LessonLearningStructure } from '@/types/lessons';
import { UserLessonNote, NoteCreatePayload } from '@/types/progresses';
import { LessonStatus } from '@/types/statuses';
import { VideoProgress } from '@/types/video';

type TabKey = 'lecture' | 'resources' | 'notes' | 'quiz';

const SUBJECT_ACCENTS = ['#5B5FEF', '#12B886', '#F2A93B', '#E5484D', '#0EA5E9'];

// Kiểu dữ liệu Lesson bổ sung progress_id và status
type LessonWithStatus = LessonLearningStructure & {
  status?: LessonStatus;
  progress_id?: string;
  video_url?: string | null;
  content_body?: string | null;
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

        // Khởi tạo bài học mặc định
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

  // Chọn bài học từ sidebar
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

  // Hàm xử lý hoàn thành bài đọc & Tự động chuyển bài tiếp theo
  const handleCompleteAndNext = async () => {
    if (!currentLesson || !course) return;

    const targetLessonId = currentLesson.lesson_id;

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
                  if (nextItem && les.lesson_id === nextItem.lesson.lesson_id) {
                    return {
                      ...les,
                      status:
                        les.status === LessonStatus.LOCKED
                          ? LessonStatus.UNLOCKED
                          : les.status,
                    };
                  }
                  return les;
                }),
              })),
            })),
          };
        });

        if (nextItem) {
          const nextLessonUpdated: LessonWithStatus = {
            ...nextItem.lesson,
            status:
              nextItem.lesson.status === LessonStatus.LOCKED
                ? LessonStatus.UNLOCKED
                : nextItem.lesson.status,
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
        } else {
          alert('Chúc mừng! Bạn đã hoàn thành bài học cuối cùng trong khóa học.');
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

  // Toggle mở/tắt cho Subject
  const toggleSubject = (subjectId: string) =>
    setExpandedSubjects((prev) => ({ ...prev, [subjectId]: !prev[subjectId] }));

  // Toggle mở/tắt cho Module
  const toggleModule = (moduleId: string) =>
    setExpandedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));

  // Mở/Thu gọn toàn bộ cây thư mục
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#E7E9F0] border-t-[#5B5FEF] animate-spin" />
          <span className="text-xs text-[#8A8FA3] font-medium">Đang tải không gian học tập...</span>
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
            <h3 className="font-display text-base font-bold text-[#161826]">Không thể truy cập</h3>
            <p className="text-xs text-[#565A70] mt-1.5 leading-relaxed">{errorMessage || 'Khóa học không tồn tại.'}</p>
          </div>
          <button onClick={() => router.push('/home')} className="w-full py-2.5 bg-[#5B5FEF] text-white rounded-full text-xs font-bold transition-transform hover:scale-[1.02]">
            Quay về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FB] flex flex-col text-[#161826]" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <Navbar />

      {/* Header thanh công cụ lớp học */}
      <div className="bg-[#12141C] text-white px-6 py-3 flex justify-between items-center border-b border-white/5">
        <div className="flex items-center gap-2 text-[11px] font-medium text-white/40">
          <span className="text-white/70 line-clamp-1">{course.title}</span>
        </div>

        <div className="flex items-center gap-5">
          <div className="hidden sm:flex items-center gap-2.5">
            <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, #5B5FEF 0%, #12B886 100%)',
                }}
              />
            </div>
            <span className="text-[10px] font-bold text-white/60 tabular-nums w-8">{progressPercent}%</span>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard-student')}
            className="text-[11px] font-bold px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer"
            style={{ backgroundColor: 'rgba(229,72,77,0.12)', color: '#F17075', border: '1px solid rgba(229,72,77,0.25)' }}
          >
            Rời khỏi lớp học
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden h-[calc(100vh-104px)]">
        {/* Sidebar Cây Thư Mục Khóa Học */}
        <div className="w-[21rem] border-r border-[#ECEAF0] bg-white flex flex-col overflow-y-auto">
          <div className="p-5 border-b border-[#ECEAF0]">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display text-sm font-bold text-[#161826] line-clamp-2 leading-snug">{course.title}</h2>
              {/* Nút Toggle Tất Cả */}
              <button
                type="button"
                onClick={toggleAll}
                className="shrink-0 text-[10px] font-bold text-[#5B5FEF] hover:bg-[#EEF0FE] px-2 py-1 rounded-md transition-colors"
                title={isAllExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
              >
                {isAllExpanded ? 'Thu gọn' : 'Mở rộng'}
              </button>
            </div>
            <p className="text-[10px] text-[#9195A8] font-semibold mt-1.5 tabular-nums">
              {completedCount}/{flatLessons.length} bài học đã hoàn thành
            </p>
          </div>

          <div className="flex-1 py-2 px-2 space-y-1.5">
            {course.subjects.map((subject, subIdx) => {
              const subjectExpanded = !!expandedSubjects[subject.subject_id];
              const accent = subjectAccent(subject.subject_id);

              return (
                <div key={subject.subject_id} className="rounded-2xl overflow-hidden bg-[#FBFBFD] border border-[#EFEFF5]">
                  {/* TIÊU ĐỀ SUBJECT (BẤM ĐỂ THU GỌN / MỞ RỘNG) */}
                  <button
                    type="button"
                    onClick={() => toggleSubject(subject.subject_id)}
                    className="w-full text-left pl-4 pr-3 py-3 flex justify-between items-center gap-2 hover:bg-white transition-colors duration-200 relative group cursor-pointer"
                  >
                    <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: accent }} />
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: accent }}>
                        Môn học {subIdx + 1}
                      </span>
                      <span className="text-xs font-bold text-[#2B2D3D] flex items-center gap-1.5 line-clamp-1">
                        {subject.title}
                      </span>
                    </div>

                    {/* Mũi tên chỉ báo thu gọn / mở rộng Subject */}
                    <div className="shrink-0 text-[#9195A8] group-hover:text-[#161826] transition-transform duration-200">
                      <svg
                        className={`w-3.5 h-3.5 transform transition-transform duration-200 ${subjectExpanded ? 'rotate-180' : 'rotate-0'
                          }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* NỘI DUNG MÔN HỌC (CHỨA CÁC MODULE) */}
                  <div
                    className="transition-all duration-300 ease-in-out overflow-hidden"
                    style={{
                      maxHeight: subjectExpanded ? '2000px' : '0px',
                      opacity: subjectExpanded ? 1 : 0,
                    }}
                  >
                    <div className="pb-2 px-2 space-y-1 pt-1">
                      {subject.modules.map((mod, modIdx) => {
                        const isExpanded = !!expandedModules[mod.module_id];
                        return (
                          <div key={mod.module_id} className="bg-white rounded-xl border border-[#F0F0F5] overflow-hidden">
                            {/* TIÊU ĐỀ MODULE (BẤM ĐỂ THU GỌN / MỞ RỘNG) */}
                            <button
                              type="button"
                              onClick={() => toggleModule(mod.module_id)}
                              className="w-full text-left px-3.5 py-2.5 flex justify-between items-center transition-colors duration-200 hover:bg-[#FAFAFD] rounded-xl cursor-pointer"
                            >
                              <span className="text-[11px] font-bold text-[#565A70] line-clamp-1">
                                Module {modIdx + 1}. {mod.title}
                              </span>

                              {/* Mũi tên chỉ báo thu gọn / mở rộng Module */}
                              <div className="shrink-0 text-[#B0B3C4]">
                                <svg
                                  className={`w-3 h-3 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'
                                    }`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </button>

                            {/* NỘI DUNG MODULE (CHỨA CÁC BÀI HỌC) */}
                            <div
                              className="transition-all duration-300 ease-in-out overflow-hidden"
                              style={{
                                maxHeight: isExpanded ? '1000px' : '0px',
                                opacity: isExpanded ? 1 : 0,
                              }}
                            >
                              <div className="pb-1.5 px-2 space-y-1">
                                {mod.lessons.map((lessonItem) => {
                                  const lesson = lessonItem as LessonWithStatus;
                                  const isSelected = currentLesson?.lesson_id === lesson.lesson_id;
                                  const isLocked = lesson.status === LessonStatus.LOCKED;
                                  const isCompleted = lesson.status === LessonStatus.COMPLETED;

                                  return (
                                    <button
                                      key={lesson.lesson_id}
                                      type="button"
                                      disabled={isLocked}
                                      onClick={() => selectLesson(subject, lesson)}
                                      className={`w-full text-left px-2.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-2.5 cursor-pointer ${isSelected
                                          ? 'bg-[#EEF0FE]'
                                          : isLocked
                                            ? 'opacity-40 cursor-not-allowed'
                                            : 'hover:bg-[#FAFAFD] hover:translate-x-0.5'
                                        }`}
                                    >
                                      <span className="shrink-0 relative w-3.5 h-3.5 flex items-center justify-center">
                                        {isCompleted ? (
                                          <span className="w-3 h-3 rounded-full flex items-center justify-center text-[8px] text-white font-bold" style={{ backgroundColor: '#12B886' }}>✓</span>
                                        ) : isSelected ? (
                                          <span className="w-3 h-3 rounded-full anim-pulse-ring" style={{ backgroundColor: '#5B5FEF' }} />
                                        ) : (
                                          <span className="w-3 h-3 rounded-full border-2" style={{ borderColor: accent }} />
                                        )}
                                      </span>

                                      <span className={`flex-1 line-clamp-2 ${isSelected ? 'text-[#3F3FC9] font-bold' : 'text-[#4B4E60]'}`}>
                                        {lesson.title}
                                      </span>

                                      {lesson.is_quiz && (
                                        <span className="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FDF3DA', color: '#9A6B00' }}>
                                          KT
                                        </span>
                                      )}
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
          <div className="px-8 pt-8 space-y-6 flex-1 max-w-4xl">
            <div className="space-y-1.5 pb-2">
              <span
                className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                style={{
                  color: currentSubject ? subjectAccent(currentSubject.subject_id) : '#5B5FEF',
                  backgroundColor: currentSubject ? `${subjectAccent(currentSubject.subject_id)}14` : '#EEF0FE',
                }}
              >
                {currentSubject?.title ?? 'Bài học'}
              </span>
              <h1 className="font-display text-2xl font-bold text-[#161826] leading-tight">
                {currentLesson ? currentLesson.title : 'Vui lòng chọn một bài học bên danh sách'}
              </h1>
            </div>

            {/* THANH MỤC / TAB */}
            {!currentLesson?.is_quiz && (
              <div className="flex gap-1 relative">
                {(
                  [
                    ['lecture', 'Bài giảng'],
                    ['resources', 'Tài liệu'],
                    ['notes', `Ghi chú${notes.length ? ` · ${notes.length}` : ''}`],
                  ] as [TabKey, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`relative px-4 py-2.5 text-xs font-bold transition-colors duration-200 ${activeTab === key ? 'text-[#161826]' : 'text-[#B0B3C4] hover:text-[#565A70]'}`}
                  >
                    {label}
                    <span
                      className="absolute left-4 right-4 -bottom-px h-[2px] rounded-full transition-all duration-300"
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

            {/* TAB BÀI GIẢNG */}
            {activeTab === 'lecture' && !currentLesson?.is_quiz && (
              <div key="lecture" className="anim-fade-up space-y-6 pb-10">
                {currentLesson ? (
                  <>
                    {/* 1. HIỂN THỊ VIDEO */}
                    {hasVideo ? (
                      videoProgressLoading || !videoProgress ? (
                        <div className="w-full aspect-video rounded-2xl bg-[#12141C] flex items-center justify-center">
                          <div className="flex items-center gap-2 text-xs text-white/60">
                            <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
                            Đang tải tiến độ video...
                          </div>
                        </div>
                      ) : (
                        <>
                          <LessonVideoPlayer
                            key={currentLesson.lesson_id}
                            lessonId={currentLesson.lesson_id}
                            videoProgressId={videoProgress.video_progress_id}
                            url={currentLesson.video_url as string}
                            title={currentLesson.title}
                            initialProgress={videoProgress}
                            onProgressUpdate={handleProgressUpdate}
                            onTimeUpdate={setVideoCurrentTime}
                            seekToSeconds={seekTarget}
                            onSeeked={() => setSeekTarget(null)}
                          />

                          {/* Nút tạo ghi chú nhanh ngay dưới video */}
                          <div className="bg-white border border-[#ECEAF0] rounded-2xl p-3">
                            {!quickNoteOpen ? (
                              <button
                                onClick={() => setQuickNoteOpen(true)}
                                className="text-xs font-bold text-[#5B5FEF] flex items-center gap-1.5"
                              >
                                📝 Thêm ghi chú tại {formatSeconds(videoCurrentTime)}
                              </button>
                            ) : (
                              <div className="flex gap-2">
                                <input
                                  autoFocus
                                  value={quickNoteContent}
                                  onChange={(e) => setQuickNoteContent(e.target.value)}
                                  placeholder="Nhập ghi chú..."
                                  className="flex-1 text-xs bg-[#F7F8FB] border border-[#E7E9F0] rounded-full px-4 py-2.5 focus:outline-none focus:border-[#5B5FEF]"
                                  onKeyDown={(e) => e.key === 'Enter' && handleQuickCreateNote()}
                                />
                                <button
                                  onClick={handleQuickCreateNote}
                                  disabled={quickNoteSaving || !quickNoteContent.trim()}
                                  className="text-white text-xs font-bold px-4 rounded-full bg-[#5B5FEF] disabled:opacity-50"
                                >
                                  {quickNoteSaving ? '...' : 'Lưu'}
                                </button>
                                <button
                                  onClick={() => { setQuickNoteOpen(false); setQuickNoteContent(''); }}
                                  className="text-xs font-bold px-3 text-[#565A70]"
                                >
                                  Hủy
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )
                    ) : null}

                    {/* 2. HIỂN THỊ NỘI DUNG VĂN BẢN (content_body) */}
                    {currentLesson.content_body && currentLesson.content_body.trim() !== '' ? (
                      <div className="bg-white border border-[#ECEAF0] rounded-2xl p-6 space-y-4 shadow-sm">
                        <div className="flex items-center gap-2 text-[#5B5FEF] font-bold text-xs uppercase tracking-wider">
                          <span>📖 Nội dung bài học</span>
                        </div>
                        <div
                          className="prose prose-sm max-w-none text-[#3E4054] leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: currentLesson.content_body }}
                        />
                      </div>
                    ) : (
                      !hasVideo && (
                        <div className="bg-white border border-[#ECEAF0] rounded-2xl p-6 text-center text-xs text-[#8A8FA3]">
                          Bài học này hiện chưa có nội dung chi tiết.
                        </div>
                      )
                    )}

                    {/* 3. NÚT HOÀN THÀNH VÀ SANG BÀI TIẾP THEO */}
                    {!hasVideo && (
                      <div className="flex justify-end pt-4 border-t border-[#ECEAF0]">
                        <button
                          type="button"
                          onClick={handleCompleteAndNext}
                          disabled={completing}
                          className="flex items-center gap-2 bg-[#5B5FEF] hover:bg-[#4B4FEF] text-white text-xs font-bold px-6 py-3 rounded-full shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                        >
                          {completing ? (
                            <span>Đang lưu...</span>
                          ) : (
                            <>
                              <span>
                                {currentLesson.status === LessonStatus.COMPLETED
                                  ? 'Bài tiếp theo'
                                  : 'Xác nhận hoàn thành & Bài tiếp theo'}
                              </span>
                              <span className="text-sm">→</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full aspect-video rounded-[28px] flex flex-col items-center justify-center bg-[#12141C] text-white">
                    <p className="text-xs font-bold text-white/85">Vui lòng chọn một bài học</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB TÀI LIỆU */}
            {activeTab === 'resources' && !currentLesson?.is_quiz && (
              <div key="resources" className="anim-fade-up space-y-2 pb-10">
                <p className="text-xs text-[#B0B3C4] font-medium py-8 text-center">Bài học này chưa có tài liệu đính kèm.</p>
              </div>
            )}

            {/* TAB GHI CHÚ */}
            {activeTab === 'notes' && !currentLesson?.is_quiz && currentLesson && (
              <div key="notes" className="anim-fade-up pb-10">
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

            {/* BÀI KIỂM TRA */}
            {(activeTab === 'quiz' || currentLesson?.is_quiz) && (
              <div key="quiz" className="anim-fade-up space-y-7 pb-10">
                <div className="bg-white border border-[#ECEAF0] rounded-2xl p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDF3DA] text-[#9A6B00] mb-2 inline-block">
                        Bài kiểm tra đánh giá
                      </span>
                      <h3 className="font-display text-lg font-bold text-[#161826]">{currentLesson?.title}</h3>
                      <p className="text-[11px] text-[#565A70] mt-1">Hoàn thành bài kiểm tra để đánh giá kiến thức đã học.</p>
                    </div>
                  </div>

                  <button className="mt-6 text-white text-xs font-bold py-3 px-6 rounded-full w-full bg-[#5B5FEF] transition-transform hover:scale-[1.01]">
                    Bắt đầu làm bài
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}