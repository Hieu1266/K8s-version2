'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import LessonNotesPanel from '@/components/LessonNotesPanel';
import { QuizSection } from '@/components/LessonQuizContainer';
import { getLearningCourse } from '@/actions/getCourse';
import { attachStatusToLessons, completeLessonAction } from '@/actions/getLesson';
import { getLessonNotesAction, createNoteAction } from '@/actions/getNotes';
import { getOrCreateVideoProgressAction, updateVideoProgressAction } from '@/actions/getVideoProgress';
import { getLessonResourcesAction } from '@/actions/getLessonResource';
import {
  createStructureCommentAction,
  getMyStructureCommentsAction,
  deleteStructureCommentAction,
  StructureComment,
} from '@/actions/structureComment_action';
import { LessonResourceItem } from '@/types/lessons';
import { CourseLearningStructure } from '@/types/course';
import { SubjectLearningStructure } from '@/types/subjects';
import { ModuleLearningStructure } from '@/types/modules';
import { UserLessonNote, NoteCreatePayload } from '@/types/progresses';
import { LessonStatus } from '@/types/statuses';
import { VideoProgress } from '@/types/video';

import { TabKey, LessonWithStatus } from '@/components/course-learning/types';
import {
  getSubjectAccent,
  getLastLessonId,
  setLastLessonId,
  getSidebarCollapsed,
  setSidebarCollapsed,
} from '@/components/course-learning/helpers';
import CourseHeaderBar from '@/components/course-learning/CourseHeaderBar';
import CourseSidebar from '@/components/course-learning/CourseSidebar';
import CourseLoadingScreen from '@/components/course-learning/CourseLoadingScreen';
import CourseErrorScreen from '@/components/course-learning/CourseErrorScreen';
import LessonTitleHeader from '@/components/course-learning/LessonTitleHeader';
import LessonTabsNav from '@/components/course-learning/LessonTabsNav';
import LectureTabContent from '@/components/course-learning/LectureTabContent';
import ResourcesTabContent from '@/components/course-learning/ResourcesTabContent';

const COURSE_URL = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL;

export default function CourseLearningPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const isTesterMode = searchParams?.get('tester') === '1';

  const [course, setCourse] = useState<CourseLearningStructure | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [currentLesson, setCurrentLesson] = useState<LessonWithStatus | undefined>(undefined);
  const [currentSubject, setCurrentSubject] = useState<SubjectLearningStructure | undefined>(undefined);

  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<TabKey>('lecture');

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

  const [notes, setNotes] = useState<UserLessonNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);

  const [videoProgress, setVideoProgress] = useState<VideoProgress | null>(null);
  const [videoProgressLoading, setVideoProgressLoading] = useState(false);

  const [resources, setResources] = useState<LessonResourceItem[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [quickNoteContent, setQuickNoteContent] = useState('');
  const [quickNoteSaving, setQuickNoteSaving] = useState(false);

  const [completing, setCompleting] = useState(false);

  // Cuộn khung nội dung bài học về đầu mỗi khi đổi bài
  const lessonContentScrollRef = useRef<HTMLDivElement>(null);

  // ===== Nhận xét tester theo subject/module/lesson (chế độ Tester) =====
  const [structureComments, setStructureComments] = useState<StructureComment[]>([]);
  const [structureCommentsLoading, setStructureCommentsLoading] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackSaving, setFeedbackSaving] = useState(false);

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
                return { ...mod, lessons: lessonsWithStatus };
              })
            );
            return { ...subject, modules: updatedModules };
          })
        );

        const courseWithStatus: CourseLearningStructure = { ...rawCourse, subjects: updatedSubjects };
        setCourse(courseWithStatus);

        const firstSubject = courseWithStatus.subjects[0];
        const firstModule = firstSubject?.modules[0];
        const firstLesson = firstModule?.lessons[0] as LessonWithStatus | undefined;

        // Nếu người dùng đã từng mở một bài học trong khóa này, ưu tiên mở lại đúng bài đó
        let targetSubject = firstSubject;
        let targetModule = firstModule;
        let targetLesson = firstLesson;

        const savedLessonId = getLastLessonId(id);
        if (savedLessonId) {
          for (const subject of courseWithStatus.subjects) {
            for (const mod of subject.modules) {
              const found = mod.lessons.find((les) => les.lesson_id === savedLessonId) as
                | LessonWithStatus
                | undefined;
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
          setActiveTab(targetLesson.is_quiz ? 'quiz' : 'lecture');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Không thể lấy dữ liệu khóa học');
      } finally {
        setLoading(false);
      }
    }

    fetchLearningData();
  }, [id]);

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
    setFeedbackOpen(false);
    setFeedbackTitle('');
    setFeedbackContent('');

    return () => {
      cancelled = true;
    };
  }, [currentLesson?.lesson_id]);

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

  // Tải toàn bộ nhận xét tester đã ghi cho khóa học này (chỉ khi mở ở chế độ tester)
  useEffect(() => {
    if (!isTesterMode || !id) return;

    let cancelled = false;

    (async () => {
      setStructureCommentsLoading(true);
      const result = await getMyStructureCommentsAction(id);
      if (!cancelled && result.success) setStructureComments(result.data || []);
      setStructureCommentsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isTesterMode, id]);

  const flatLessons = useMemo(() => {
    if (!course) return [];
    const flat: { subject: SubjectLearningStructure; module: ModuleLearningStructure; lesson: LessonWithStatus }[] =
      [];
    course.subjects.forEach((subject) => {
      subject.modules.forEach((mod) => {
        mod.lessons.forEach((lesson) => flat.push({ subject, module: mod, lesson: lesson as LessonWithStatus }));
      });
    });
    return flat;
  }, [course]);

  const completedCount = flatLessons.filter((f) => f.lesson.status === LessonStatus.COMPLETED).length;
  const progressPercent = flatLessons.length ? Math.round((completedCount / flatLessons.length) * 100) : 0;

  const findNextLockedLesson = (startIndex: number) => {
    for (let i = startIndex; i < flatLessons.length; i++) {
      if (flatLessons[i].lesson.status === LessonStatus.LOCKED) return flatLessons[i];
    }
    return null;
  };

  const handleProgressUpdate = async (updatedProgress: VideoProgress) => {
    if (!updatedProgress.video_progress_id) return;

    const result = await updateVideoProgressAction(updatedProgress.video_progress_id, {
      last_watched_second: updatedProgress.last_watched_second,
      max_watched_second: updatedProgress.max_watched_second,
      completion_percentage: updatedProgress.completion_percentage,
      is_finished: updatedProgress.is_finished,
    });

    if (!result.success) console.error('Đồng bộ tiến độ video thất bại:', result.error);
  };

  const selectLesson = (subject: SubjectLearningStructure, lesson: LessonWithStatus) => {
    if (lesson.status === LessonStatus.LOCKED) return;
    setCurrentSubject(subject);
    setCurrentLesson(lesson);
    setLastLessonId(id, lesson.lesson_id);
    setActiveTab(lesson.is_quiz ? 'quiz' : 'lecture');
  };

  const handleQuizPassed = (submissionStatus?: string, isPass?: boolean) => {
    if (!currentLesson || !course) return;

    const isPendingGrading = submissionStatus === 'SUBMITTED';
    const isFailed = isPass === false;
    const shouldMarkCompleted = !isPendingGrading && !isFailed;
    const shouldUnlockNext = shouldMarkCompleted || isPendingGrading;

    const currentIndex = flatLessons.findIndex((f) => f.lesson.lesson_id === currentLesson.lesson_id);
    const nextItem = currentIndex !== -1 && currentIndex + 1 < flatLessons.length ? flatLessons[currentIndex + 1] : null;
    const nextAlreadyAccessible =
      !!nextItem && nextItem.lesson.status !== LessonStatus.LOCKED && !nextItem.lesson.is_optional;
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
                  ...(shouldMarkCompleted ? { status: LessonStatus.COMPLETED } : {}),
                };
              }
              if (unlockTarget && les.lesson_id === unlockTarget.lesson.lesson_id) return { ...les, status: LessonStatus.UNLOCKED };
              return les;
            }),
          })),
        })),
      };
    });

    setCurrentLesson((prev: LessonWithStatus | undefined): LessonWithStatus | undefined =>
      prev
        ? {
          ...prev,
          submit_status: (submissionStatus ?? prev.submit_status) as LessonWithStatus['submit_status'],
          ...(shouldMarkCompleted ? { status: LessonStatus.COMPLETED } : {}),
        }
        : prev
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
        const currentIndex = flatLessons.findIndex((f) => f.lesson.lesson_id === currentLesson.lesson_id);
        const nextItem =
          currentIndex !== -1 && currentIndex + 1 < flatLessons.length ? flatLessons[currentIndex + 1] : null;
        const unlockTarget = !isOptionalLesson && currentIndex !== -1 ? findNextLockedLesson(currentIndex + 1) : null;

        setCourse((prevCourse) => {
          if (!prevCourse) return prevCourse;
          return {
            ...prevCourse,
            subjects: prevCourse.subjects.map((sub) => ({
              ...sub,
              modules: sub.modules.map((mod) => ({
                ...mod,
                lessons: mod.lessons.map((les: any) => {
                  if (les.lesson_id === currentLesson.lesson_id) return { ...les, status: LessonStatus.COMPLETED };
                  if (unlockTarget && les.lesson_id === unlockTarget.lesson.lesson_id)
                    return { ...les, status: LessonStatus.UNLOCKED };
                  return les;
                }),
              })),
            })),
          };
        });

        setCurrentLesson((prev) => (prev ? { ...prev, status: LessonStatus.COMPLETED } : prev));

        if (!isOptionalLesson && nextItem) {
          const updatedNextStatus =
            nextItem.lesson.status === LessonStatus.LOCKED ? LessonStatus.UNLOCKED : nextItem.lesson.status;
          if (updatedNextStatus !== LessonStatus.LOCKED) {
            const nextLessonUpdated: LessonWithStatus = { ...nextItem.lesson, status: updatedNextStatus };
            selectLesson(nextItem.subject, nextLessonUpdated);
            setExpandedSubjects((prev) => ({ ...prev, [nextItem.subject.subject_id]: true }));
            setExpandedModules((prev) => ({ ...prev, [nextItem.module.module_id]: true }));
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
    const currentIndex = flatLessons.findIndex((f) => f.lesson.lesson_id === currentLesson.lesson_id);
    const nextItem = currentIndex !== -1 && currentIndex + 1 < flatLessons.length ? flatLessons[currentIndex + 1] : null;
    const unlockTarget = !isOptionalLesson && currentIndex !== -1 ? findNextLockedLesson(currentIndex + 1) : null;

    setCourse((prevCourse) => {
      if (!prevCourse) return prevCourse;
      return {
        ...prevCourse,
        subjects: prevCourse.subjects.map((sub) => ({
          ...sub,
          modules: sub.modules.map((mod) => ({
            ...mod,
            lessons: mod.lessons.map((les: any) => {
              if (les.lesson_id === targetLessonId) return { ...les, status: LessonStatus.COMPLETED };
              if (unlockTarget && les.lesson_id === unlockTarget.lesson.lesson_id) return { ...les, status: LessonStatus.UNLOCKED };
              return les;
            }),
          })),
        })),
      };
    });

    setCurrentLesson((prev) => (prev ? { ...prev, status: LessonStatus.COMPLETED } : prev));

    if (!isOptionalLesson && nextItem) {
      const updatedNextStatus =
        nextItem.lesson.status === LessonStatus.LOCKED ? LessonStatus.UNLOCKED : nextItem.lesson.status;
      if (updatedNextStatus !== LessonStatus.LOCKED) {
        const nextLessonUpdated: LessonWithStatus = { ...nextItem.lesson, status: updatedNextStatus };
        selectLesson(nextItem.subject, nextLessonUpdated);
        setExpandedSubjects((prev) => ({ ...prev, [nextItem.subject.subject_id]: true }));
        setExpandedModules((prev) => ({ ...prev, [nextItem.module.module_id]: true }));
      }
    }
  };

  const toggleSubject = (subjectId: string) => setExpandedSubjects((prev) => ({ ...prev, [subjectId]: !prev[subjectId] }));
  const toggleModule = (moduleId: string) => setExpandedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));

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

  const lessonTabs = useMemo(() => {
    const tabs: [TabKey, string][] = [
      ['lecture', 'Bài giảng'],
      ['resources', `Tài liệu${resources.length ? ` (${resources.length})` : ''}`],
      ['notes', `Ghi chú${notes.length ? ` (${notes.length})` : ''}`],
    ];
    if (currentLesson?.had_quiz && !hasVideo) tabs.push(['quiz', 'Bài thi']);
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
      const data = await getOrCreateVideoProgressAction(currentLesson.lesson_id, currentLesson.duration_seconds ?? 0);
      if (!cancelled) setVideoProgress(data);
      setVideoProgressLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentLesson?.lesson_id, hasVideo]);

  useEffect(() => {
    lessonContentScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentLesson?.lesson_id]);

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

  // Nhận xét tester đã có sẵn cho đúng bài học đang xem (nếu có)
  const existingLessonComment = useMemo(() => {
    if (!currentLesson) return undefined;
    return structureComments.find((c) => c.structure_part === 'LESSON' && c.part_id === currentLesson.lesson_id);
  }, [structureComments, currentLesson]);

  const handleCreateLessonFeedback = async () => {
    if (!feedbackContent.trim() || !currentLesson) return;

    setFeedbackSaving(true);
    const result = await createStructureCommentAction({
      courseId: id,
      structurePart: 'LESSON',
      partId: currentLesson.lesson_id,
      title: feedbackTitle.trim() || currentLesson.title,
      comment: feedbackContent.trim(),
    });
    setFeedbackSaving(false);

    if (result.success && result.data) {
      setStructureComments((prev) => [...prev, result.data as StructureComment]);
      setFeedbackOpen(false);
      setFeedbackTitle('');
      setFeedbackContent('');
    } else {
      alert(result.message || 'Không thể lưu nhận xét.');
    }
  };

  const handleDeleteLessonFeedback = async (commentId: string) => {
    if (!confirm('Xóa nhận xét này?')) return;

    const result = await deleteStructureCommentAction(commentId);
    if (result.success) {
      setStructureComments((prev) => prev.filter((c) => c.comment_id !== commentId));
    } else {
      alert(result.message || 'Không thể xóa nhận xét.');
    }
  };

  if (loading) {
    return <CourseLoadingScreen />;
  }

  if (errorMessage || !course) {
    return <CourseErrorScreen errorMessage={errorMessage} onBackHome={() => router.push('/home')} />;
  }

  return (
    <div className="h-screen overflow-hidden bg-[#F7F8FB] flex flex-col text-[#161826]" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <Navbar />

      {isTesterMode && (
        <div className="bg-amber-500/10 border-b border-amber-300/50 px-6 py-1.5 text-center">
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-700">
            Chế độ Tester đang bật
          </span>
        </div>
      )}

      <CourseHeaderBar
        courseTitle={course.title}
        progressPercent={progressPercent}
        onLeaveCourse={() => router.push('/dashboard-student')}
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

        <div ref={lessonContentScrollRef} className="flex-1 min-h-0 overflow-y-auto bg-[#F7F8FB] flex flex-col">
          <div className="px-10 pt-8 space-y-6 flex-1 max-w-7xl">
            <LessonTitleHeader
              subjectTitle={currentSubject?.title}
              subjectAccentColor={currentSubject ? getSubjectAccent(course, currentSubject.subject_id) : '#5B5FEF'}
              isOptional={currentLesson?.is_optional}
              lessonTitle={currentLesson?.title}
            />

            {isTesterMode && currentLesson && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700">
                  Khu vực Tester · Nhận xét bài học
                </span>
                {structureCommentsLoading ? (
                  <p className="text-sm text-amber-700/70">Đang tải nhận xét...</p>
                ) : existingLessonComment ? (
                  <div className="bg-white border border-amber-100 rounded-xl p-4 space-y-2">
                    <p className="text-sm font-bold text-[#161826]">{existingLessonComment.title}</p>
                    <p className="text-sm text-[#4B4E60] whitespace-pre-wrap">{existingLessonComment.comment}</p>
                    <button
                      type="button"
                      onClick={() => handleDeleteLessonFeedback(existingLessonComment.comment_id)}
                      className="text-xs font-bold text-red-500 hover:text-red-600"
                    >
                      Xóa nhận xét
                    </button>
                  </div>
                ) : !feedbackOpen ? (
                  <button type="button" onClick={() => setFeedbackOpen(true)} className="text-sm font-bold text-amber-700 hover:text-amber-800">
                    + Để lại nhận xét cho bài học này
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input
                      value={feedbackTitle}
                      onChange={(e) => setFeedbackTitle(e.target.value)}
                      placeholder={`Tiêu đề (mặc định: ${currentLesson.title})`}
                      className="w-full text-sm bg-white border border-amber-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-400"
                    />
                    <textarea
                      autoFocus
                      value={feedbackContent}
                      onChange={(e) => setFeedbackContent(e.target.value)}
                      placeholder="Nhập nhận xét về nội dung, chất lượng, lỗi phát hiện được ở bài học này..."
                      rows={3}
                      className="w-full text-sm bg-white border border-amber-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-400"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCreateLessonFeedback}
                        disabled={feedbackSaving || !feedbackContent.trim()}
                        className="text-white text-xs font-bold px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                      >
                        {feedbackSaving ? 'Đang lưu...' : 'Lưu nhận xét'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFeedbackOpen(false);
                          setFeedbackContent('');
                          setFeedbackTitle('');
                        }}
                        className="text-xs font-bold px-3 text-[#565A70]"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!currentLesson?.is_quiz && (
              <LessonTabsNav tabs={lessonTabs} activeTab={activeTab} onChange={setActiveTab} />
            )}

            {activeTab === 'lecture' && !currentLesson?.is_quiz && (
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
                    setQuickNoteContent('');
                  }}
                  completing={completing}
                  onCompleteAndNext={handleCompleteAndNext}
                />
              </div>
            )}

            {activeTab === 'resources' && !currentLesson?.is_quiz && (
              <div key="resources" className="anim-fade-up space-y-3 pb-12">
                <ResourcesTabContent loading={resourcesLoading} resources={resources} courseBackendUrl={COURSE_URL} />
              </div>
            )}

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

            {(activeTab === 'quiz' || currentLesson?.is_quiz) && currentLesson && (
              <div key="quiz" className="anim-fade-up pb-12">
                <QuizSection
                  lessonId={currentLesson.lesson_id}
                  courseId={id}
                  onQuizPassed={handleQuizPassed}
                  isPeerReview={currentLesson.is_peer_review}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}