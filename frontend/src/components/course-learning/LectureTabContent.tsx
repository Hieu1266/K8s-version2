import { InVideoQuizWrapper } from "@/components/InVideoQuizWrapper";
import { VideoProgress } from "@/types/video";
import { LessonWithStatus } from "./types";
import QuickNoteBox from "./QuickNoteBox";
import CompleteLessonButton from "./CompleteLessonButton";
import LessonSlideViewer from "@/components/LessonSlideViewer";

type LectureTabContentProps = {
  currentLesson?: LessonWithStatus;
  hasVideo: boolean;
  videoProgress: VideoProgress | null;
  videoProgressLoading: boolean;
  onProgressUpdate: (progress: VideoProgress) => void;
  onTimeUpdate: (seconds: number) => void;
  onVideoEnded: () => void;

  quickNoteOpen: boolean;
  quickNoteContent: string;
  quickNoteSaving: boolean;
  videoCurrentTime: number;
  onQuickNoteOpen: () => void;
  onQuickNoteContentChange: (value: string) => void;
  onQuickNoteSave: () => void;
  onQuickNoteCancel: () => void;

  completing: boolean;
  onCompleteAndNext: () => void;

  hasPreviousLesson: boolean;
  hasNextLesson: boolean;
  onPreviousLesson: () => void;
  onNextLesson: () => void;
};

/** Nội dung tab "Bài giảng": video (hoặc nội dung bài đọc) + ghi chú nhanh + nút hoàn thành */
export default function LectureTabContent({
  currentLesson,
  hasVideo,
  videoProgress,
  videoProgressLoading,
  onProgressUpdate,
  onTimeUpdate,
  onVideoEnded,
  quickNoteOpen,
  quickNoteContent,
  quickNoteSaving,
  videoCurrentTime,
  onQuickNoteOpen,
  onQuickNoteContentChange,
  onQuickNoteSave,
  onQuickNoteCancel,
  completing,
  onCompleteAndNext,
  hasPreviousLesson,
  hasNextLesson,
  onPreviousLesson,
  onNextLesson,
}: LectureTabContentProps) {
  if (!currentLesson) {
    return (
      <div className="w-full aspect-video rounded-3xl flex flex-col items-center justify-center bg-[#12141C] text-white">
        <p className="text-sm font-bold text-white/85">
          Vui lòng chọn một bài học ở danh sách bên trái
        </p>
      </div>
    );
  }

  const hasContentBody =
    !!currentLesson.content_body && currentLesson.content_body.trim() !== "";

  return (
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
            <InVideoQuizWrapper
              key={currentLesson.lesson_id}
              lessonId={currentLesson.lesson_id}
              videoData={{
                url: currentLesson.video_url as string,
                progressId: videoProgress.video_progress_id,
                initialProgress: videoProgress,
              }}
              onProgressUpdate={onProgressUpdate}
              onTimeUpdate={onTimeUpdate}
              onVideoEnded={onVideoEnded}
              // Lưu ý: Nếu bạn có tính năng Seek (tua video khi bấm vào ghi chú cũ),
              // bạn cần truyền thêm 2 props này và khai báo chúng bên trong InVideoQuizWrapperProps
              // seekToSeconds={seekTarget}
              // onSeeked={() => setSeekTarget(null)}
            />

            <QuickNoteBox
              open={quickNoteOpen}
              content={quickNoteContent}
              saving={quickNoteSaving}
              currentTimeSeconds={videoCurrentTime}
              onOpen={onQuickNoteOpen}
              onContentChange={onQuickNoteContentChange}
              onSave={onQuickNoteSave}
              onCancel={onQuickNoteCancel}
            />
          </>
        )
      ) : null}

      {hasContentBody ? (
        currentLesson.is_slide_presentation ? (
          <LessonSlideViewer
            lessonId={currentLesson.lesson_id}
            lessonTitle={currentLesson.title}
            content={currentLesson.content_body as string}
            hasPreviousLesson={hasPreviousLesson}
            hasNextLesson={hasNextLesson}
            onPreviousLesson={onPreviousLesson}
            onNextLesson={onNextLesson}
          />
        ) : (
          <div className="bg-white border border-[#ECEAF0] rounded-3xl p-8 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-[#5B5FEF] font-bold text-sm uppercase tracking-wider">
              <span>📖 Nội dung bài học</span>
            </div>

            <div
              className="prose prose-base max-w-none text-[#2B2D3D] leading-relaxed font-normal"
              dangerouslySetInnerHTML={{
                __html: currentLesson.content_body as string,
              }}
            />
          </div>
        )
      ) : (
        !hasVideo && (
          <div className="bg-white border border-[#ECEAF0] rounded-3xl p-8 text-center text-sm text-[#8A8FA3]">
            Bài học này hiện chưa có nội dung chi tiết.
          </div>
        )
      )}

      {/* NÚT HOÀN THÀNH BÀI ĐỌC: Chỉ hiển thị khi KHÔNG có video VÀ had_quiz == false */}
      {!hasVideo &&
        !currentLesson.had_quiz &&
        (!currentLesson.is_slide_presentation || !hasNextLesson) && (
          <CompleteLessonButton
            completing={completing}
            isOptional={currentLesson.is_optional}
            status={currentLesson.status}
            onClick={onCompleteAndNext}
          />
        )}
    </>
  );
}
