"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { VideoProgress } from "@/types/video";
import { extractYoutubeId, loadYoutubeApi } from "@/lib/youtube";

interface LessonVideoPlayerProps {
    lessonId: string; // Dùng làm khóa lưu trữ sessionStorage (không phải ID thật để gọi API)
    videoProgressId: string; // video_progress_id THẬT lấy từ getOrCreateVideoProgressAction, dùng để PATCH Backend
    url: string;
    title?: string;
    initialProgress?: VideoProgress; // Tiến độ đã đồng bộ từ Backend (nếu có)
    onProgressUpdate?: (updatedProgress: VideoProgress) => void; // Đồng bộ tiến độ về DB
    onTimeUpdate?: (seconds: number) => void; // Dùng để lấy timestamp hiện tại khi tạo note
    seekToSeconds?: number | null; // Set giá trị để tua video (vd: bấm vào 1 note)
    onSeeked?: () => void;
}

const SESSION_KEY_PREFIX = "lesson_video_progress:";
const MAX_FORWARD_JUMP = 2; // giây - chênh lệch tối đa được coi là phát tự nhiên, không phải hành vi tua
const YOUTUBE_POLL_MS = 1000;

function readSessionProgress(lessonId: string): VideoProgress | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.sessionStorage.getItem(SESSION_KEY_PREFIX + lessonId);
        return raw ? (JSON.parse(raw) as VideoProgress) : null;
    } catch {
        return null;
    }
}

function writeSessionProgress(lessonId: string, progress: VideoProgress) {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.setItem(SESSION_KEY_PREFIX + lessonId, JSON.stringify(progress));
    } catch {
        // sessionStorage có thể bị chặn (chế độ ẩn danh, quota đầy...) -> bỏ qua, không chặn luồng chính
    }
}

export default function LessonVideoPlayer({
    lessonId,
    videoProgressId,
    url,
    title,
    initialProgress,
    onProgressUpdate,
    onTimeUpdate,
    seekToSeconds,
    onSeeked,
}: LessonVideoPlayerProps) {
    const youtubeId = extractYoutubeId(url);
    const nativeVideoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const ytPlayerRef = useRef<any>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [ytReady, setYtReady] = useState(false);

    // Nguồn tiến độ ban đầu: ưu tiên sessionStorage (mới nhất trong phiên hiện tại của trình duyệt),
    // fallback về dữ liệu Backend truyền từ component cha.
    // Dùng lazy init (chỉ chạy 1 lần khi mount) để tránh đọc sessionStorage lặp lại mỗi lần render.
    const startingProgressRef = useRef<VideoProgress>(
        readSessionProgress(lessonId) ||
        initialProgress || {
            video_progress_id: videoProgressId,
            last_watched_second: 0,
            max_watched_second: 0,
            completion_percentage: 0,
            is_finished: false,
        }
    );
    const startingProgress = startingProgressRef.current;

    const maxTimeRef = useRef<number>(startingProgress.max_watched_second || 0);
    const isFinishedRef = useRef<boolean>(startingProgress.is_finished || false);
    const hasRestoredPositionRef = useRef(false);
    const isPausedBySystemRef = useRef(false);

    const [displayMaxTime, setDisplayMaxTime] = useState(maxTimeRef.current);
    const [displayFinished, setDisplayFinished] = useState(isFinishedRef.current);

    // Đẩy tiến độ mới ra ngoài: lưu sessionStorage + gọi callback đồng bộ Backend
    const emitProgress = useCallback(
        (currentTime: number, duration: number) => {
            if (isFinishedRef.current) return;
            if (currentTime <= maxTimeRef.current) return;

            // LƯU Ý: KHÔNG chặn "bước nhảy lớn" ở đây nữa.
            // Với <video> gốc, việc chặn tua vượt đã được xử lý riêng ở `handleSeeking` (snap-back tức thì).
            // Nếu vẫn chặn ở đây, một lần `timeupdate` bị trình duyệt trì hoãn (>2s) do máy chậm/buffer
            // sẽ khiến maxTimeRef không bao giờ tăng được nữa -> tiến độ bị khóa cứng vĩnh viễn.
            // Với YouTube, việc phát hiện tua vượt được xử lý riêng ở vòng poll bên dưới (có seekTo tự sửa lại).

            maxTimeRef.current = currentTime;
            const percentage = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
            // Chỉ coi là "đã hoàn thành" khi thực sự xem gần hết video (khớp đúng điều kiện Backend:
            // max_watched_second >= duration_seconds). Trước đây dùng ngưỡng tùy tiện 95% khiến FE tự khóa
            // (isFinishedRef=true) quá sớm và ngừng gửi cập nhật, nên Backend không bao giờ nhận đủ dữ liệu
            // để tự đạt điều kiện is_finished=true của chính nó -> tiến độ bị kẹt ở ~95%, không bao giờ lên 100%.
            const finished = duration > 0 && currentTime >= duration - 0.5;
            isFinishedRef.current = finished;

            setDisplayMaxTime(currentTime);
            setDisplayFinished(finished);

            // Backend khai báo last_watched_second/max_watched_second là kiểu int (Optional[int]),
            // trong khi video.currentTime luôn là số thập phân (vd 12.345s) -> phải làm tròn trước khi
            // gửi đi, nếu không Pydantic sẽ trả lỗi 422 Unprocessable Content ở MỌI lần gọi.
            // Khi đã thực sự hoàn thành, chốt đúng bằng duration để Backend tính completion_percentage = 100%
            // chính xác (tránh lệch 1 giây do Math.floor làm tròn xuống ở những giây cuối).
            const roundedTime = finished ? Math.round(duration) : Math.floor(currentTime);

            const updated: VideoProgress = {
                video_progress_id: videoProgressId,
                last_watched_second: roundedTime,
                max_watched_second: roundedTime,
                completion_percentage: finished ? 100 : parseFloat(percentage.toFixed(2)),
                is_finished: finished,
                // Gửi kèm duration THẬT (đo từ chính video) để Backend tự sửa lại nếu duration_seconds
                // lúc khởi tạo video_progress bị sai/bằng 0 (tránh bug tự set is_finished=true quá sớm).
                duration_seconds: duration > 0 ? Math.round(duration) : undefined,
            };

            writeSessionProgress(lessonId, updated);
            onProgressUpdate?.(updated);
        },
        [lessonId, videoProgressId, onProgressUpdate]
    );

    // ============================================
    // 1. VIDEO MP4 (thẻ <video> gốc)
    // ============================================
    useEffect(() => {
        if (youtubeId) return;
        const video = nativeVideoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            // Khôi phục mốc thời gian xem gần nhất nếu chưa hoàn thành video
            if (!hasRestoredPositionRef.current && startingProgress.last_watched_second > 0 && !isFinishedRef.current) {
                video.currentTime = startingProgress.last_watched_second;
            }
            hasRestoredPositionRef.current = true;
        };

        const handleTimeUpdate = () => {
            onTimeUpdate?.(video.currentTime);
            if (isFinishedRef.current || video.seeking) return;
            emitProgress(video.currentTime, video.duration || 0);
        };

        // Lớp bảo hiểm: đảm bảo luôn ghi nhận đủ 100% khi video phát xong thật sự,
        // phòng trường hợp lần `timeupdate` cuối cùng không kịp chạm đúng ngưỡng (duration - 0.5)
        const handleEnded = () => {
            if (isFinishedRef.current) return;
            const finalDuration = video.duration || maxTimeRef.current;
            maxTimeRef.current = finalDuration;
            isFinishedRef.current = true;
            setDisplayMaxTime(finalDuration);
            setDisplayFinished(true);

            const updated: VideoProgress = {
                video_progress_id: videoProgressId,
                last_watched_second: Math.round(finalDuration),
                max_watched_second: Math.round(finalDuration),
                completion_percentage: 100,
                is_finished: true,
                duration_seconds: video.duration ? Math.round(video.duration) : undefined,
            };

            writeSessionProgress(lessonId, updated);
            onProgressUpdate?.(updated);
        };

        const handleSeeking = () => {
            if (isFinishedRef.current) return;
            // Nếu người dùng cố tình tua vọt qua phân đoạn chưa từng xem qua -> giật thanh điều hướng về mốc cũ
            if (video.currentTime > maxTimeRef.current + 0.5) {
                video.currentTime = maxTimeRef.current;
            }
        };

        const handleLoseFocus = () => {
            if (video && !video.paused && !video.seeking) {
                video.pause();
                isPausedBySystemRef.current = true;
            }
        };
        const handleGainFocus = () => {
            if (video && video.paused && isPausedBySystemRef.current) {
                video.play().catch(() => { });
                isPausedBySystemRef.current = false;
            }
        };
        const handleVisibilityChange = () => {
            if (document.hidden) handleLoseFocus();
            else handleGainFocus();
        };

        video.addEventListener("loadedmetadata", handleLoadedMetadata);
        video.addEventListener("timeupdate", handleTimeUpdate);
        video.addEventListener("seeking", handleSeeking);
        video.addEventListener("ended", handleEnded);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleLoseFocus);
        window.addEventListener("focus", handleGainFocus);

        return () => {
            video.removeEventListener("loadedmetadata", handleLoadedMetadata);
            video.removeEventListener("timeupdate", handleTimeUpdate);
            video.removeEventListener("seeking", handleSeeking);
            video.removeEventListener("ended", handleEnded);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleLoseFocus);
            window.removeEventListener("focus", handleGainFocus);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [youtubeId, emitProgress, onTimeUpdate]);

    // ============================================
    // 2. YOUTUBE - khởi tạo YT.Player
    // ============================================
    useEffect(() => {
        if (!youtubeId) return;
        let cancelled = false;

        loadYoutubeApi().then(() => {
            if (cancelled || !containerRef.current) return;
            ytPlayerRef.current = new window.YT.Player(containerRef.current, {
                videoId: youtubeId,
                playerVars: { rel: 0 },
                events: {
                    onReady: () => {
                        setYtReady(true);
                        // Khôi phục mốc thời gian xem gần nhất nếu chưa hoàn thành video
                        if (startingProgress.last_watched_second > 0 && !isFinishedRef.current) {
                            ytPlayerRef.current.seekTo(startingProgress.last_watched_second, true);
                        }
                    },
                    onStateChange: (event: any) => {
                        // 0 = YT.PlayerState.ENDED
                        // Lớp bảo hiểm: đảm bảo luôn ghi nhận đủ 100% khi video phát xong thật sự,
                        // phòng trường hợp lần poll cuối cùng không kịp chạm đúng ngưỡng (duration - 0.5)
                        if (event.data === 0 && !isFinishedRef.current) {
                            const player = ytPlayerRef.current;
                            const finalDuration = player?.getDuration?.() || maxTimeRef.current;
                            maxTimeRef.current = finalDuration;
                            isFinishedRef.current = true;
                            setDisplayMaxTime(finalDuration);
                            setDisplayFinished(true);

                            const updated: VideoProgress = {
                                video_progress_id: videoProgressId,
                                last_watched_second: Math.round(finalDuration),
                                max_watched_second: Math.round(finalDuration),
                                completion_percentage: 100,
                                is_finished: true,
                                duration_seconds: finalDuration ? Math.round(finalDuration) : undefined,
                            };

                            writeSessionProgress(lessonId, updated);
                            onProgressUpdate?.(updated);
                        }
                    },
                },
            });
        });

        return () => {
            cancelled = true;
            if (pollRef.current) clearInterval(pollRef.current);
            ytPlayerRef.current?.destroy?.();
            ytPlayerRef.current = null;
            setYtReady(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [youtubeId]);

    // YouTube không có sự kiện timeupdate/seeking như <video> gốc
    // -> poll mỗi giây để vừa lấy currentTime (cho note), vừa phát hiện & chặn hành vi tua vượt
    useEffect(() => {
        if (!youtubeId || !ytReady) return;

        pollRef.current = setInterval(() => {
            const player = ytPlayerRef.current;
            if (!player?.getCurrentTime) return;

            const currentTime: number = player.getCurrentTime();
            const duration: number = player.getDuration?.() || 0;

            onTimeUpdate?.(currentTime);

            if (isFinishedRef.current) return;

            if (currentTime > maxTimeRef.current + MAX_FORWARD_JUMP) {
                // Bước nhảy giữa 2 lần poll lớn hơn ngưỡng cho phép -> coi là tua vượt, giật về mốc cũ
                player.seekTo(maxTimeRef.current, true);
                return;
            }

            emitProgress(currentTime, duration);
        }, YOUTUBE_POLL_MS);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [youtubeId, ytReady, emitProgress, onTimeUpdate]);

    // Tạm dừng/tiếp tục YouTube khi người dùng chuyển tab hoặc ẩn trình duyệt
    useEffect(() => {
        if (!youtubeId) return;

        const handleVisibilityOrFocusChange = () => {
            const player = ytPlayerRef.current;
            if (!player) return;
            const isHidden = document.hidden;
            if (isHidden) {
                if (player.getPlayerState?.() === 1 /* PLAYING */) {
                    player.pauseVideo?.();
                    isPausedBySystemRef.current = true;
                }
            } else if (isPausedBySystemRef.current) {
                player.playVideo?.();
                isPausedBySystemRef.current = false;
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityOrFocusChange);
        window.addEventListener("blur", handleVisibilityOrFocusChange);
        window.addEventListener("focus", handleVisibilityOrFocusChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityOrFocusChange);
            window.removeEventListener("blur", handleVisibilityOrFocusChange);
            window.removeEventListener("focus", handleVisibilityOrFocusChange);
        };
    }, [youtubeId]);

    // ============================================
    // 3. TUA VIDEO THEO YÊU CẦU NGOÀI (vd: bấm vào 1 note trong danh sách)
    // ============================================
    useEffect(() => {
        if (seekToSeconds === null || seekToSeconds === undefined) return;

        // Note là mốc do chính người dùng tạo trong quá khứ -> luôn nằm trong phạm vi đã xem.
        // Vẫn cập nhật maxTime phòng trường hợp lệch nhẹ, tránh bị anti-cheat giật ngược lại ngay sau khi tua.
        maxTimeRef.current = Math.max(maxTimeRef.current, seekToSeconds);

        if (youtubeId) {
            if (ytReady && ytPlayerRef.current?.seekTo) {
                ytPlayerRef.current.seekTo(seekToSeconds, true);
                ytPlayerRef.current.playVideo?.();
                onSeeked?.();
            }
        } else if (nativeVideoRef.current) {
            nativeVideoRef.current.currentTime = seekToSeconds;
            nativeVideoRef.current.play().catch(() => { });
            onSeeked?.();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seekToSeconds, ytReady]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    return (
        <div className="w-full space-y-2">
            {/* Thanh trạng thái tiến độ - dùng chung cho cả MP4 và YouTube */}
            <div className="flex items-center justify-between text-[11px] font-medium text-[#8A8FA3] px-0.5">
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${displayFinished ? "bg-[#12B886]" : "bg-[#F2A93B] animate-pulse"}`} />
                    <span>
                        {displayFinished ? (
                            <span className="text-[#12B886] font-semibold">Đã hoàn thành (được tự do tua video)</span>
                        ) : (
                            <span className="text-[#9A6B00]">Đang học (không thể tua vượt phần chưa xem)</span>
                        )}
                    </span>
                </div>
                {!displayFinished && (
                    <span>
                        Mốc học lớn nhất: <span className="font-mono text-[#4B4E60]">{formatTime(displayMaxTime)}</span>
                    </span>
                )}
            </div>

            {youtubeId ? (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-sm">
                    <div ref={containerRef} className="w-full h-full" data-lesson-id={lessonId} />
                </div>
            ) : (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-sm">
                    <video
                        ref={nativeVideoRef}
                        controls
                        controlsList="nodownload"
                        className="w-full h-full object-contain"
                        data-lesson-id={lessonId}
                    >
                        <source src={url} type="video/mp4" />
                        Trình duyệt của bạn không hỗ trợ xem video trực tiếp.
                    </video>
                </div>
            )}
        </div>
    );
}