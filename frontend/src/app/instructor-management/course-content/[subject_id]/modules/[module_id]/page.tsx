"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import RichTextEditor from "@/components/editors/RichTextEditor";
import {
  ArrowLeft,
  Plus,
  Video,
  FileText,
  Trash2,
  Edit3,
  Layers,
  Clock,
  X,
  FileUp,
  Lock,
  Loader2,
  Download,
  Paperclip,
  GripVertical,
} from "lucide-react";
import {
  getLessonListAction,
  createLessonAction,
  updateLessonAction,
  deleteLessonAction,
  uploadLessonResourceAction,
  deleteLessonResourceAction,
} from "@/actions/getLesson";
import {
  LessonManagement,
  LessonCreatePayload,
  LessonUpdatePayload,
} from "@/types/lessons";
import { extractYoutubeId, probeYoutubeDuration } from "@/lib/youtube";

// NEXT_PUBLIC_* được inline sẵn vào client bundle -> có thể build URL trực tiếp,
// KHÔNG cần qua Server Action (Server Action là async, không gọi đồng bộ được trong href JSX)
function buildLessonResourceDownloadUrl(resourceId: string): string {
  const base = process.env.NEXT_PUBLIC_COURSE_BACKEND_URL || "";
  return `${base}/lesson-resources/download/${resourceId}`;
}

// Tự động lấy thời lượng (giây) từ link video, hỗ trợ cả 2 trường hợp:
// 1. Link YouTube -> dùng YT.Player ẩn (xem lib/youtube.ts), không cần API key.
// 2. Link file video trực tiếp (mp4/webm...) -> đo qua thẻ <video> tạm.
async function probeVideoDuration(url: string): Promise<number | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const youtubeId = extractYoutubeId(trimmed);
  if (youtubeId) {
    return probeYoutubeDuration(youtubeId);
  }

  return new Promise((resolve) => {
    const videoEl = document.createElement("video");
    videoEl.preload = "metadata";
    videoEl.crossOrigin = "anonymous";

    let settled = false;
    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      videoEl.src = "";
      videoEl.remove();
      resolve(value);
    };

    videoEl.onloadedmetadata = () => {
      const duration = videoEl.duration;
      finish(Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null);
    };
    videoEl.onerror = () => finish(null);

    // An toàn: tránh treo mãi nếu URL không phải file video trực tiếp
    setTimeout(() => finish(null), 8000);

    videoEl.src = trimmed;
  });
}

function formatSecondsToLabel(seconds: number): string {
  if (!seconds || seconds <= 0) return "Chưa có thời lượng";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m} phút ${s > 0 ? `${s} giây` : ""}`.trim();
}

export default function ModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params.subject_id as string) || "";
  const moduleId = (params.module_id as string) || "";

  const [lessons, setLessons] = useState<LessonManagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonManagement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [content, setContent] = useState("");
  const [isOptional, setIsOptional] = useState(false);
  const [isQuiz, setIsQuiz] = useState(false);
  const [detectingDuration, setDetectingDuration] = useState(false);
  const [durationAutoDetected, setDurationAutoDetected] = useState<boolean | null>(null);

  // Resource upload states (chỉ dùng khi đang sửa 1 lesson đã tồn tại)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingResource, setUploadingResource] = useState(false);
  const [deletingResourceId, setDeletingResourceId] = useState<string | null>(null);
  // --- DRAG & DROP STATES & HANDLERS ---
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Cần thiết để cho phép Drop
  };

  const handleDrop = async (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    // 1. Sao chép mảng lessons hiện tại
    const updatedLessons = [...lessons];
    const [movedLesson] = updatedLessons.splice(draggedIndex, 1);
    updatedLessons.splice(dropIndex, 0, movedLesson);

    // 2. Tính order_index mới (index bắt đầu từ 1)
    const newOrderIndex = dropIndex + 1;

    // 3. Cập nhật UI ngay lập tức (Optimistic Update)
    const reindexedLessons = updatedLessons.map((item, idx) => ({
      ...item,
      order_index: idx + 1,
    }));
    setLessons(reindexedLessons);
    setDraggedIndex(null);

    // 4. Gọi API cập nhật duy nhất bài học được kéo
    setIsReordering(true);
    const result = await updateLessonAction(movedLesson.lesson_id, {
      order_index: newOrderIndex,
    });

    setIsReordering(false);

    if (!result.success) {
      alert(result.error || "Không thể cập nhật thứ tự bài học.");
      // Tải lại dữ liệu chuẩn từ server nếu có lỗi
      fetchLessons();
    }
  };
  const fetchLessons = useCallback(async () => {
    if (!moduleId) return;
    setLoading(true);
    setErrorMessage(null);
    const data = await getLessonListAction(moduleId);
    setLessons(data);
    setLoading(false);
  }, [moduleId]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const resetForm = () => {
    setTitle("");
    setVideoUrl("");
    setDurationSeconds(0);
    setContent("");
    setIsOptional(false);
    setIsQuiz(false);
    setDurationAutoDetected(null);
    setFormError(null);
  };

  const handleOpenCreateModal = () => {
    setEditingLesson(null);
    resetForm();
    setShowModal(true);
  };

  const handleOpenEditModal = (lesson: LessonManagement) => {
    if (lesson.is_quiz) return; // Bài thi: không cho mở form sửa
    setEditingLesson(lesson);
    setTitle(lesson.title);
    setVideoUrl(lesson.video_url || "");
    setDurationSeconds(lesson.duration_seconds || 0);
    setContent(lesson.content_body || "");
    setIsOptional(lesson.is_optional);
    setIsQuiz(lesson.is_quiz);
    // Nếu bài học đã có sẵn video + duration hợp lệ từ trước, hiển thị luôn thay vì bắt dò lại ngay khi vừa mở form
    setDurationAutoDetected(lesson.video_url && lesson.duration_seconds > 0 ? true : null);
    setFormError(null);
    setShowModal(true);
  };

  // Khi rời khỏi ô nhập link video -> thử tự động lấy thời lượng
  const handleVideoUrlBlur = async () => {
    if (!videoUrl.trim()) return;
    setDetectingDuration(true);
    setDurationAutoDetected(null);
    const detected = await probeVideoDuration(videoUrl.trim());
    setDetectingDuration(false);
    if (detected) {
      setDurationSeconds(detected);
      setDurationAutoDetected(true);
    } else {
      setDurationAutoDetected(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setFormError(null);

    if (editingLesson) {
      const payload: LessonUpdatePayload = {
        title: title.trim(),
        video_url: videoUrl.trim() || null,
        duration_seconds: durationSeconds || 0,
        content_body: content || null,
        is_optional: isOptional,
      };
      const result = await updateLessonAction(editingLesson.lesson_id, payload);
      setSubmitting(false);
      if (!result.success || !result.data) {
        setFormError(result.error || "Cập nhật bài học thất bại.");
        return;
      }
      setLessons((prev) =>
        prev.map((l) => (l.lesson_id === editingLesson.lesson_id ? { ...l, ...result.data, resources: l.resources } : l))
      );
    } else {
      const payload: LessonCreatePayload = {
        module_id: moduleId,
        title: title.trim(),
        video_url: videoUrl.trim() || null,
        duration_seconds: isQuiz ? 0 : durationSeconds || 0,
        content_body: isQuiz ? null : content || null,
        order_index: lessons.length + 1, // Thêm vào cuối danh sách; sắp xếp lại thứ tự có thể bổ sung sau
        is_optional: isQuiz ? false : isOptional, // Backend cũng tự ép is_optional=false nếu is_quiz
        is_quiz: isQuiz,
      };
      const result = await createLessonAction(payload);
      setSubmitting(false);
      if (!result.success || !result.data) {
        setFormError(result.error || "Tạo bài học thất bại.");
        return;
      }
      setLessons((prev) => [...prev, { ...result.data!, resources: [] }]);
    }

    setShowModal(false);
    resetForm();
  };

  const handleDeleteLesson = async (lesson: LessonManagement) => {
    if (lesson.is_quiz) return; // Bài thi: không cho xóa qua giao diện này
    if (!confirm(`Bạn có chắc chắn muốn xóa bài học "${lesson.title}"? Toàn bộ tài nguyên đính kèm cũng sẽ bị xóa.`)) return;

    const result = await deleteLessonAction(lesson.lesson_id);
    if (!result.success) {
      alert(result.error || "Xóa bài học thất bại.");
      return;
    }
    setLessons((prev) => prev.filter((l) => l.lesson_id !== lesson.lesson_id));
  };

  const handleUploadResource = async (file: File) => {
    if (!editingLesson) return;
    setUploadingResource(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("lesson_id", editingLesson.lesson_id);

    const result = await uploadLessonResourceAction(editingLesson.lesson_id, formData);
    setUploadingResource(false);

    if (!result.success || !result.data) {
      alert(result.error || "Tải file lên thất bại.");
      return;
    }

    const newResource = result.data;
    setEditingLesson((prev) => (prev ? { ...prev, resources: [...prev.resources, newResource] } : prev));
    setLessons((prev) =>
      prev.map((l) =>
        l.lesson_id === editingLesson.lesson_id ? { ...l, resources: [...l.resources, newResource] } : l
      )
    );
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!editingLesson) return;
    if (!confirm("Xóa tài nguyên này?")) return;

    setDeletingResourceId(resourceId);
    const result = await deleteLessonResourceAction(resourceId);
    setDeletingResourceId(null);

    if (!result.success) {
      alert(result.error || "Xóa tài nguyên thất bại.");
      return;
    }

    setEditingLesson((prev) =>
      prev ? { ...prev, resources: prev.resources.filter((r) => r.resource_id !== resourceId) } : prev
    );
    setLessons((prev) =>
      prev.map((l) =>
        l.lesson_id === editingLesson.lesson_id
          ? { ...l, resources: l.resources.filter((r) => r.resource_id !== resourceId) }
          : l
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Loader2 size={18} className="animate-spin" />
          Đang tải danh sách bài học...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Navigation Header */}
        <div className="space-y-4">
          <button
            onClick={() =>
              router.push(`/instructor-management/course-content/${subjectId}`)
            }
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition"
          >
            <ArrowLeft size={18} />
            Quay lại danh sách Module
          </button>

          <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Subject: {subjectId}</span>
                <span>•</span>
                <span className="text-blue-600">Module ID: {moduleId}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                Chi Tiết Module & Nội Dung Bài Học
              </h1>
            </div>

            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
            >
              <Plus size={18} />
              Tạo Lesson Mới
            </button>
          </div>

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Danh sách Lesson */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers size={20} className="text-indigo-600" />
              Danh Sách Bài Học ({lessons.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {lessons.map((lesson, index) => (
              <div
                key={lesson.lesson_id}
                draggable={!isReordering}
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                className={`py-4 space-y-3 transition ${draggedIndex === index ? "opacity-30 bg-blue-50 border-2 border-dashed border-blue-400 rounded-xl" : ""
                  }`}
              >
                <div className="flex items-center justify-between gap-4 hover:bg-slate-50/80 p-2 rounded-xl transition">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Nút nắm kéo thả */}
                    <div
                      className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-1 rounded transition"
                      title="Kéo để sắp xếp lại vị trí"
                    >
                      <GripVertical size={20} />
                    </div>

                    <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg shrink-0">
                      {lesson.is_quiz ? (
                        <Lock size={18} className="text-amber-600" />
                      ) : lesson.video_url ? (
                        <Video size={18} className="text-blue-600" />
                      ) : (
                        <FileText size={18} className="text-emerald-600" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <span className="truncate">{lesson.title}</span>
                        {lesson.is_quiz && (
                          <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            Bài thi
                          </span>
                        )}
                        {lesson.is_optional && !lesson.is_quiz && (
                          <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            Tự chọn
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                        <span>Thứ tự: {lesson.order_index}</span>
                        {!lesson.is_quiz && lesson.video_url && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock size={13} /> {formatSecondsToLabel(lesson.duration_seconds)}
                            </span>
                          </>
                        )}
                        {!lesson.is_quiz && lesson.resources.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Paperclip size={13} /> {lesson.resources.length} tài nguyên
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(lesson)}
                      disabled={lesson.is_quiz}
                      title={lesson.is_quiz ? "Bài thi không thể chỉnh sửa qua giao diện này" : "Sửa bài học"}
                      className={`p-2 rounded-lg transition ${lesson.is_quiz
                        ? "text-slate-300 cursor-not-allowed"
                        : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        }`}
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteLesson(lesson)}
                      disabled={lesson.is_quiz}
                      title={lesson.is_quiz ? "Bài thi không thể xóa qua giao diện này" : "Xóa bài học"}
                      className={`p-2 rounded-lg transition ${lesson.is_quiz
                        ? "text-slate-300 cursor-not-allowed"
                        : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        }`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Preview nội dung */}
                {!lesson.is_quiz && lesson.content_body && (
                  <div className="ml-12 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700 block mb-1">
                      Nội dung bài học:
                    </span>
                    <div
                      className="prose prose-xs max-w-none"
                      dangerouslySetInnerHTML={{ __html: lesson.content_body }}
                    />
                  </div>
                )}

                {/* Danh sách tài nguyên */}
                {!lesson.is_quiz && lesson.resources.length > 0 && (
                  <div className="ml-12 flex flex-wrap gap-2">
                    {lesson.resources.map((res) => (
                      <a
                        key={res.resource_id}
                        href={buildLessonResourceDownloadUrl(res.resource_id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg transition"
                      >
                        <Download size={12} />
                        {res.file_name}
                      </a>
                    ))}
                  </div>
                )}

                {lesson.is_quiz && (
                  <div className="ml-12 text-[11px] text-slate-400 italic flex items-center gap-1.5">
                    <Lock size={12} />
                    Bài thi chỉ hiển thị thông tin cơ bản, chưa hỗ trợ chỉnh sửa qua giao diện này.
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </main>

      {/* Modal Tạo/Chỉnh sửa Lesson */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          {/* Giới hạn max-h và dùng flex-col để chia khung cố định */}
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] shadow-xl flex flex-col overflow-hidden my-auto">

            {/* Header: Cố định ở trên cùng */}
            <div className="flex justify-between items-center border-b border-slate-100 p-4 shrink-0 bg-white">
              <h3 className="text-base font-bold text-slate-900">
                {editingLesson ? "Chỉnh Sửa Lesson" : "Tạo Lesson Mới"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form: Thêm overflow-y-auto để chỉ cuộn phần nội dung bên trong */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên bài học *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Bài 1.1: Giới thiệu..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                {/* Checkbox is_optional / is_quiz */}
                <div className="flex flex-wrap gap-5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isOptional}
                      disabled={isQuiz}
                      onChange={(e) => setIsOptional(e.target.checked)}
                    />
                    Bài học tự chọn (không bắt buộc)
                  </label>

                  <label
                    className={`flex items-center gap-2 text-xs font-semibold cursor-pointer ${editingLesson ? "text-slate-300 cursor-not-allowed" : "text-slate-700"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={isQuiz}
                      disabled={!!editingLesson}
                      onChange={(e) => setIsQuiz(e.target.checked)}
                    />
                    Là bài thi (Quiz)
                  </label>
                </div>
                {isQuiz && (
                  <p className="text-[11px] text-amber-600 -mt-2">
                    Sau khi tạo, bài thi sẽ chỉ hiển thị thông tin cơ bản và không thể chỉnh sửa/xóa qua giao diện này
                    (video, nội dung, tài nguyên không áp dụng cho bài thi).
                  </p>
                )}

                {/* Video + Nội dung + Tài nguyên */}
                {!isQuiz && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Link Video (không bắt buộc)
                      </label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={videoUrl}
                        onChange={(e) => {
                          setVideoUrl(e.target.value);
                          setDurationAutoDetected(null);
                        }}
                        onBlur={handleVideoUrlBlur}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    {videoUrl.trim() && (
                      <div className="flex items-center gap-2 text-[11px] -mt-2">
                        {detectingDuration ? (
                          <span className="text-slate-400 flex items-center gap-1">
                            <Loader2 size={11} className="animate-spin" /> Đang tự động lấy thời lượng video...
                          </span>
                        ) : durationAutoDetected === true ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <Clock size={11} /> Thời lượng: {formatSecondsToLabel(durationSeconds)}
                          </span>
                        ) : durationAutoDetected === false ? (
                          <span className="text-amber-600 flex items-center gap-1">
                            Không thể tự động lấy thời lượng (video riêng tư, đã tắt tính năng nhúng, hoặc link không hợp lệ).
                            <button
                              type="button"
                              onClick={handleVideoUrlBlur}
                              className="underline font-semibold hover:text-amber-700 ml-1"
                            >
                              Thử lại
                            </button>
                          </span>
                        ) : (
                          <span className="text-slate-400">Rời khỏi ô nhập để tự động lấy thời lượng.</span>
                        )}
                      </div>
                    )}

                    {/* RichTextEditor: Giới hạn max height cho phần soạn thảo văn bản */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Nội dung chi tiết bài học (không bắt buộc)
                      </label>
                      <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                        <RichTextEditor value={content} onChange={(val: string) => setContent(val)} />
                      </div>
                    </div>

                    {/* Quản lý tài nguyên */}
                    {editingLesson && (
                      <div className="space-y-2 pt-2">
                        <label className="block text-xs font-semibold text-slate-700">
                          Tài nguyên đính kèm
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {editingLesson.resources.map((res) => (
                            <div
                              key={res.resource_id}
                              className="inline-flex items-center gap-2 text-[11px] font-semibold bg-slate-100 px-2.5 py-1.5 rounded-lg"
                            >
                              <a
                                href={buildLessonResourceDownloadUrl(res.resource_id)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 text-slate-700 hover:text-blue-600"
                              >
                                <Download size={12} />
                                {res.file_name}
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteResource(res.resource_id)}
                                disabled={deletingResourceId === res.resource_id}
                                className="text-rose-500 hover:text-rose-700 disabled:opacity-40"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                          {editingLesson.resources.length === 0 && (
                            <span className="text-[11px] text-slate-400">Chưa có tài nguyên nào.</span>
                          )}
                        </div>

                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadResource(file);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingResource}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
                          >
                            {uploadingResource ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <FileUp size={14} />
                            )}
                            {uploadingResource ? "Đang tải lên..." : "Tải lên tài nguyên (pdf, docx, zip...)"}
                          </button>
                        </div>
                      </div>
                    )}

                    {!editingLesson && (
                      <p className="text-[11px] text-slate-400 italic">
                        Bạn cần tạo bài học trước, sau đó mở lại để tải lên tài nguyên đính kèm.
                      </p>
                    )}
                  </>
                )}

                {formError && <p className="text-xs text-rose-600">{formError}</p>}
              </div>

              {/* Footer: Cố định dưới đáy modal */}
              <div className="flex justify-end gap-2 p-4 border-t border-slate-100 shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Đang lưu..." : editingLesson ? "Lưu thay đổi" : "Tạo Lesson"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}