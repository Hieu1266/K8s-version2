"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize2,
  Minimize2,
  Presentation as PresentationIcon,
} from "lucide-react";

import { getPresentationByLessonAction } from "@/actions/getPresentation";

interface ViewerSlide {
  slide_id: string;
  title?: string | null;
  content_body: string;
  slide_order: number;
}

interface ViewerPresentation {
  slides: ViewerSlide[];
}

interface PresentationViewerProps {
  lessonId: string;
  lessonTitle?: string;
  onSlideProgressChange?: (hasViewedAllSlides: boolean) => void;
}

export default function PresentationViewer({
  lessonId,
  lessonTitle,
  onSlideProgressChange,
}: PresentationViewerProps) {
  const [presentation, setPresentation] = useState<ViewerPresentation | null>(
    null,
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const viewerRef = useRef<HTMLElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Đánh dấu đã báo lên component cha là học viên xem hết slide chưa,
  // tránh gọi callback lặp lại nhiều lần không cần thiết.
  const notifiedAllRef = useRef(false);

  useEffect(() => {
    let active = true;

    const loadPresentation = async () => {
      setLoading(true);
      setError(null);
      setCurrentIndex(0);
      notifiedAllRef.current = false;

      const result = await getPresentationByLessonAction(lessonId);

      if (!active) {
        return;
      }

      if (!result.success || !result.data) {
        setPresentation(null);
        setError(result.error || "Không thể tải nội dung trình chiếu.");
        setLoading(false);

        // Lỗi tải dữ liệu không nên khóa học viên lại, coi như đã "xem xong".
        notifiedAllRef.current = true;
        onSlideProgressChange?.(true);
        return;
      }

      const sortedSlides = [...result.data.slides].sort(
        (first, second) => first.slide_order - second.slide_order,
      );

      setPresentation({
        ...result.data,
        slides: sortedSlides,
      });

      if (sortedSlides.length === 0) {
        // Không có slide nào thì không có gì để chặn cả.
        notifiedAllRef.current = true;
        onSlideProgressChange?.(true);
      } else {
        notifiedAllRef.current = false;
        onSlideProgressChange?.(false);
      }

      setLoading(false);
    };

    void loadPresentation();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const slides = presentation?.slides ?? [];
  const currentSlide = slides[currentIndex];

  const goToPreviousSlide = useCallback(() => {
    setCurrentIndex((previous) => Math.max(previous - 1, 0));
  }, []);

  const goToNextSlide = useCallback(() => {
    setCurrentIndex((previous) => Math.min(previous + 1, slides.length - 1));
  }, [slides.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        goToPreviousSlide();
      }

      if (event.key === "ArrowRight") {
        goToNextSlide();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [goToNextSlide, goToPreviousSlide]);

  /**
   * Báo lên component cha khi học viên đã lật tới slide cuối cùng.
   * Chỉ báo một lần "true" duy nhất, không cần báo lại "false" khi họ lùi về slide trước.
   */
  useEffect(() => {
    if (slides.length === 0 || notifiedAllRef.current) {
      return;
    }

    if (currentIndex >= slides.length - 1) {
      notifiedAllRef.current = true;
      onSlideProgressChange?.(true);
    }
  }, [currentIndex, slides.length, onSlideProgressChange]);

  /**
   * Đồng bộ trạng thái khi người dùng vào hoặc thoát toàn màn hình,
   * kể cả khi thoát bằng phím Esc.
   */
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === viewerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  /**
   * Bật hoặc tắt chế độ trình chiếu toàn màn hình.
   */
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await viewerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setError("Trình duyệt không thể mở chế độ toàn màn hình.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-blue-100 bg-white">
        <div className="text-center">
          <Loader2 size={30} className="mx-auto animate-spin text-blue-600" />

          <p className="mt-3 text-sm font-medium text-slate-500">
            Đang tải bài trình chiếu...
          </p>
        </div>
      </div>
    );
  }

  if (error || !presentation) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
        <div className="max-w-sm px-5 text-center">
          <PresentationIcon size={34} className="mx-auto text-slate-300" />

          <p className="mt-3 text-sm font-semibold text-slate-700">
            Chưa có nội dung trình chiếu
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {error || "Giảng viên chưa thêm slide cho bài học này."}
          </p>
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-blue-50/40">
        <div className="text-center">
          <PresentationIcon size={34} className="mx-auto text-blue-300" />

          <p className="mt-3 text-sm font-semibold text-slate-700">
            Bài học chưa có slide
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Nội dung sẽ xuất hiện khi giảng viên cập nhật.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section
      ref={viewerRef}
      className={`overflow-hidden border border-blue-100 bg-white shadow-sm ${
        isFullscreen
          ? "flex h-screen flex-col rounded-none border-0"
          : "rounded-2xl"
      }`}
    >
      {/* Thanh tiêu đề */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-blue-50/60 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
            Nội dung trình chiếu
          </p>

          <h3 className="mt-1 truncate text-sm font-bold text-slate-900">
            {lessonTitle || "Bài giảng"}
          </h3>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-sm">
            Slide {currentIndex + 1}/{slides.length}
          </span>

          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            title={
              isFullscreen ? "Thoát toàn màn hình" : "Trình chiếu toàn màn hình"
            }
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-white text-blue-600 shadow-sm transition hover:bg-blue-600 hover:text-white"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Nội dung slide */}
      <div
        className={`flex min-h-0 flex-col bg-white ${
          isFullscreen ? "flex-1" : "h-[500px]"
        }`}
      >
        {currentSlide.title && (
          <div className="shrink-0 border-b border-slate-100 px-6 py-5 sm:px-8">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              {currentSlide.title}
            </h2>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-6 sm:px-8">
          <div
            className="prose prose-slate max-w-none break-words
              [&_img]:h-auto [&_img]:max-w-full
              [&_table]:block [&_table]:max-w-full
              [&_table]:overflow-x-auto"
            dangerouslySetInnerHTML={{
              __html: currentSlide.content_body,
            }}
          />
        </div>
      </div>

      {/* Điều khiển */}
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
        <button
          type="button"
          onClick={goToPreviousSlide}
          disabled={currentIndex === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          Slide trước
        </button>

        {/* Chấm chọn slide */}
        <div className="hidden max-w-[45%] items-center justify-center gap-1.5 overflow-x-auto px-2 sm:flex">
          {slides.map((slide, index) => (
            <button
              key={slide.slide_id}
              type="button"
              onClick={() => setCurrentIndex(index)}
              title={`Slide ${index + 1}`}
              className={`h-2.5 shrink-0 rounded-full transition-all ${
                currentIndex === index
                  ? "w-7 bg-blue-600"
                  : "w-2.5 bg-slate-300 hover:bg-blue-300"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={goToNextSlide}
          disabled={currentIndex === slides.length - 1}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0066FF] px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Slide sau
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}