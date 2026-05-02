"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { VideoData, CaptionCue } from "@/types";
import { getActiveCue } from "@/lib/videoUtils";
import LanguageSelector from "@/components/ui/LanguageSelector";
import ProgressIndicator from "@/components/ui/ProgressIndicator";
import SubtitleDisplay from "@/components/ui/SubtitleDisplay";
import { motion, AnimatePresence } from "framer-motion";

declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement,
        opts: Record<string, unknown>
      ) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  getPlaybackRate: () => number;
  playVideo: () => void;
  pauseVideo: () => void;
  getDuration: () => number;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

interface ScrollVideoPlayerProps {
  videoData: VideoData;
}

const NORMAL_SCROLL_SPEED = 8;
const MIN_PLAYBACK = 0.25;
const MAX_PLAYBACK = 2.0;
const IDLE_MS = 100;

export default function ScrollVideoPlayer({ videoData }: ScrollVideoPlayerProps) {
  const playerRef = useRef<YTPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const isReadyRef = useRef(false);
  const lastScrollTimeRef = useRef(performance.now());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [selectedLang, setSelectedLang] = useState(videoData.captions[0]?.lang ?? "");
  const [activeCaption, setActiveCaption] = useState<CaptionCue | null>(null);
  const [showLangSelector, setShowLangSelector] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  const activeCaptions = videoData.captions.find((c) => c.lang === selectedLang)?.data ?? [];

  const stopVideo = useCallback(() => {
    if (!playerRef.current || !isReadyRef.current) return;
    try {
      playerRef.current.pauseVideo();
    } catch {}
    setIsScrolling(false);
    setPlaybackRate(0);
  }, []);

  const scheduleStop = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(stopVideo, IDLE_MS);
  }, [stopVideo]);

  const rafLoop = useCallback(() => {
    const player = playerRef.current;
    if (player && isReadyRef.current) {
      try {
        const t = player.getCurrentTime();
        const dur = player.getDuration() || 1;
        setCurrentTime(t);
        setProgress(t / dur);
        const cue = getActiveCue(activeCaptions, t);
        setActiveCaption(cue);
      } catch {}
    }
    rafRef.current = requestAnimationFrame(rafLoop);
  }, [activeCaptions]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(rafLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [rafLoop]);

  useEffect(() => {
    const loadApi = () => {
      if (window.YT?.Player) {
        initPlayer();
        return;
      }
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = initPlayer;
    };

    const initPlayer = () => {
      if (!containerRef.current) return;
      const div = document.createElement("div");
      containerRef.current.appendChild(div);

      playerRef.current = new window.YT.Player(div, {
        videoId: videoData.videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            isReadyRef.current = true;
            setIsReady(true);
          },
        },
      });
    };

    loadApi();

    return () => {
      try { playerRef.current?.destroy(); } catch {}
      cancelAnimationFrame(rafRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [videoData.videoId]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const player = playerRef.current;
      if (!player || !isReadyRef.current) return;

      const now = performance.now();
      const dt = Math.max(now - lastScrollTimeRef.current, 1);
      const dy = e.deltaY;
      lastScrollTimeRef.current = now;

      if (Math.abs(dy) < 0.5) { scheduleStop(); return; }

      const pixelsPerMs = Math.abs(dy) / dt;
      const rate = Math.max(MIN_PLAYBACK, Math.min(MAX_PLAYBACK, pixelsPerMs / NORMAL_SCROLL_SPEED));
      const direction = dy > 0 ? 1 : -1;

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      setIsScrolling(true);

      try {
        if (direction === -1) {
          player.pauseVideo();
          const newTime = Math.max(0, player.getCurrentTime() - rate * (dt / 1000) * 4);
          player.seekTo(newTime, true);
          setPlaybackRate(-rate);
        } else {
          player.setPlaybackRate(rate);
          player.playVideo();
          setPlaybackRate(rate);
        }
      } catch {}

      scheduleStop();
    };

    let lastTouchY = 0;
    let lastTouchTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0].clientY;
      lastTouchTime = performance.now();
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const player = playerRef.current;
      if (!player || !isReadyRef.current) return;

      const now = performance.now();
      const dy = lastTouchY - e.touches[0].clientY;
      const dt = Math.max(now - lastTouchTime, 1);
      lastTouchY = e.touches[0].clientY;
      lastTouchTime = now;

      if (Math.abs(dy) < 1) { scheduleStop(); return; }

      const rate = Math.max(MIN_PLAYBACK, Math.min(MAX_PLAYBACK, Math.abs(dy / dt) / (NORMAL_SCROLL_SPEED * 0.5)));
      const direction = dy > 0 ? 1 : -1;

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      setIsScrolling(true);

      try {
        if (direction === -1) {
          player.pauseVideo();
          const newTime = Math.max(0, player.getCurrentTime() - rate * (dt / 1000) * 4);
          player.seekTo(newTime, true);
          setPlaybackRate(-rate);
        } else {
          player.setPlaybackRate(rate);
          player.playVideo();
          setPlaybackRate(rate);
        }
      } catch {}

      scheduleStop();
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", scheduleStop, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", scheduleStop);
    };
  }, [scheduleStop]);

  const rateLabel = (() => {
    if (playbackRate === 0) return null;
    const abs = Math.abs(playbackRate);
    const dir = playbackRate < 0 ? "◀ " : "";
    return `${dir}${abs.toFixed(2)}×`;
  })();

  return (
    <div className="relative w-full h-screen overflow-hidden bg-ink">
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full [&>*]:w-full [&>*]:h-full [&_iframe]:w-full [&_iframe]:h-full"
        style={{ pointerEvents: "none" }}
      />

      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink z-10">
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border border-accent/30 rounded-full animate-ping" />
              <div className="absolute inset-2 border border-accent/60 rounded-full" />
              <div className="absolute inset-4 bg-accent/20 rounded-full" />
            </div>
            <span className="font-mono text-xs tracking-[0.3em] text-mist uppercase">Loading</span>
          </div>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-ink/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/20 via-transparent to-ink/20" />
      </div>

      <div className="relative z-20">
        <SubtitleDisplay caption={activeCaption} />
        <ProgressIndicator
          progress={progress}
          duration={videoData.metadata.duration}
          currentTime={currentTime}
        />
      </div>

      <AnimatePresence>
        {rateLabel && (
          <motion.div
            key="rate"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.12 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
          >
            <div className="px-5 py-2 rounded-xl bg-ink/70 border border-white/10" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
              <span className={`font-mono text-2xl tabular-nums ${Math.abs(playbackRate) <= MIN_PLAYBACK + 0.01 ? "text-signal" : Math.abs(playbackRate) >= 1.8 ? "text-accent" : "text-paper"}`}>
                {rateLabel}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {videoData.captions.length > 0 && (
        <div className="absolute top-6 right-6 z-30">
          <button
            onClick={() => setShowLangSelector(!showLangSelector)}
            className="flex items-center gap-2 px-3 py-2 bg-graphite/90 border border-white/8 rounded-lg font-mono text-xs tracking-wider text-mist hover:text-paper transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            {selectedLang.toUpperCase()}
          </button>
          {showLangSelector && (
            <LanguageSelector
              tracks={videoData.captions}
              selected={selectedLang}
              onSelect={(lang) => { setSelectedLang(lang); setShowLangSelector(false); }}
            />
          )}
        </div>
      )}

      <div className="absolute top-6 left-6 z-30">
        <div className="flex flex-col gap-1">
          <span className="font-display text-xs tracking-[0.25em] text-accent uppercase">ScrollAPI</span>
          <span className="font-mono text-[10px] text-mist/70 tracking-wider max-w-48 truncate">{videoData.metadata.title}</span>
        </div>
      </div>

      <AnimatePresence>
        {!isScrolling && isReady && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-3"
          >
            <span className="font-mono text-[9px] tracking-[0.4em] text-mist/50 uppercase">Scroll to play</span>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-0.5 bg-mist/40 rounded-full animate-pulse" style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
