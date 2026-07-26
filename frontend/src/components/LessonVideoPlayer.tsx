"use client";

import { useEffect, useRef, useState, useCallback } from "react";

declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

interface LessonVideoPlayerProps {
    url: string;
    title?: string;
    onTimeUpdate?: (seconds: number) => void;
    seekToSeconds?: number | null; // set giá trị này để tua video (vd: bấm vào 1 note)
    onSeeked?: () => void;
}

function extractYoutubeId(url: string): string | null {
    const match = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
}

let youtubeApiPromise: Promise<void> | null = null;
function loadYoutubeApi(): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve();
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (youtubeApiPromise) return youtubeApiPromise;

    youtubeApiPromise = new Promise((resolve) => {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScript = document.getElementsByTagName("script")[0];
        firstScript.parentNode?.insertBefore(tag, firstScript);
        window.onYouTubeIframeAPIReady = () => resolve();
    });
    return youtubeApiPromise;
}

export default function LessonVideoPlayer({
    url,
    title,
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

    // Khởi tạo YT.Player khi là video YouTube
    useEffect(() => {
        if (!youtubeId) return;
        let cancelled = false;

        loadYoutubeApi().then(() => {
            if (cancelled || !containerRef.current) return;
            ytPlayerRef.current = new window.YT.Player(containerRef.current, {
                videoId: youtubeId,
                playerVars: { rel: 0 },
                events: { onReady: () => setYtReady(true) },
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

    // YouTube không có sự kiện timeupdate -> poll mỗi giây
    useEffect(() => {
        if (!youtubeId || !ytReady || !onTimeUpdate) return;
        pollRef.current = setInterval(() => {
            const player = ytPlayerRef.current;
            if (player?.getCurrentTime) onTimeUpdate(player.getCurrentTime());
        }, 1000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [youtubeId, ytReady, onTimeUpdate]);

    // Xử lý tua video khi seekToSeconds đổi (bấm vào 1 note trong danh sách)
    useEffect(() => {
        if (seekToSeconds === null || seekToSeconds === undefined) return;

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

    const handleNativeTimeUpdate = useCallback(() => {
        if (nativeVideoRef.current && onTimeUpdate) {
            onTimeUpdate(nativeVideoRef.current.currentTime);
        }
    }, [onTimeUpdate]);

    if (youtubeId) {
        return (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-sm">
                <div ref={containerRef} className="w-full h-full" />
            </div>
        );
    }

    return (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-sm">
            <video
                ref={nativeVideoRef}
                controls
                className="w-full h-full object-contain"
                onTimeUpdate={handleNativeTimeUpdate}
            >
                <source src={url} type="video/mp4" />
                Trình duyệt của bạn không hỗ trợ xem video trực tiếp.
            </video>
        </div>
    );
}