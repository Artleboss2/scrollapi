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
      Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setPlaybackRate: (rate: number) => void;
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
const SPEED_PRESETS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

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
  const [autoSpeed, setAutoSpeed] = useState(1.0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const activeCaptions = videoData.captions.find((c) => c.lang === selectedLang)?.data ?? [];

  const stopVideo = useCallback(() => {
    if (!playerRef.current || !isReadyRef.current) return;
    try { playerRef.current.pauseVideo(); } catch {}
    setIsScrolling(false);
    setPlaybackRate(0);
  }, []);

  const scheduleStop = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(stopVideo, IDLE_MS);
  }, [stopVideo]);

  const startAutoPlay = useCallback((speed: number) => {
    const player = playerRef.current;
    if (!player || !isReadyRef.current) return;
    try {
      player.setPlaybackRate(speed);
      player.playVideo();
      setPlaybackRate(speed);
      setIsScrolling(true);
      setIsAutoPlaying(true);
    } catch {}
  }, []);

  const stopAutoPlay = useCallback(() => {
    setIsAutoPlaying(false);
    stopVideo();
  }, [stopVideo]);

  const rafLoop = useCallback(() => {
    const player = playerRef.current;
    if (player && isReadyRef.current) {
      try {
        const t = player.getCurrentTime();
        const dur = player.getDuration() || 1;
        setCurrentTime(t);
        setProgress(t / dur);
        setActiveCaption(getActiveCue(activeCaptions, t));
      } catch {}
    }
    rafRef.current = requestAnimationFrame(rafLoop);
  }, [activeCaptions]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(rafLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [rafLoop]);

  useEffect(() => {
    const init = () => {
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
          cc_load_policy: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            isReadyRef.current = true;
            setIsReady(true);
          },
        },
      });
    };

    if (window.YT?.Player) {
      init();
    } else {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = init;
    }

    return () => {
      try { playerRef.current?.destroy(); } catch {}
      cancelAnimationFrame(rafRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [videoData.videoId]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isAutoPlaying) stopAutoPlay();
      const player = playerRef.current;
      if (!player || !isReadyRef.current) return;

      const now = performance.now();
      const dt = Math.max(now - lastScrollTimeRef.current, 1);
      const dy = e.deltaY;
      lastScrollTimeRef.current = now;

      if (Math.abs(dy) < 0.5) { scheduleStop(); return; }

      const rate = Math.max(MIN_PLAYBACK, Math.min(MAX_PLAYBACK, (Math.abs(dy) / dt) / NORMAL_SCROLL_SPEED));

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      setIsScrolling(true);

      try {
        if (dy < 0) {
          player.pauseVideo();
          player.seekTo(Math.max(0, player.getCurrentTime() - rate * (dt / 1000) * 4), true);
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

    const onTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0].clientY;
      lastTouchTime = performance.now();
      if (isAutoPlaying) stopAutoPlay();
    };

    const onTouchMove = (e: TouchEvent) => {
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

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      setIsScrolling(true);

      try {
        if (dy < 0) {
          player.pauseVideo();
          player.seekTo(Math.max(0, player.getCurrentTime() - rate * (dt / 1000) * 4), true);
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
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", scheduleStop, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", scheduleStop);
    };
  }, [scheduleStop, isAutoPlaying, stopAutoPlay]);

  const rateLabel = playbackRate === 0 ? null
    : `${playbackRate < 0 ? "◀ " : ""}${Math.abs(playbackRate).toFixed(2)}×`;

  return (
    <div className="relative w-full h-screen bg-ink overflow-hidden">

      <div
        className="absolute pointer-events-none"
        style={{
          top: "-15%",
          left: "-15%",
          width: "130%",
          height: "130%",
          overflow: "hidden",
        }}
      >
        <div
          ref={containerRef}
          className="w-full h-full [&>*]:w-full [&>*]:h-full [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:border-0"
        />
      </div>

      <AnimatePresence>
        {!isReady && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center bg-ink z-20"
          >
            <div className="flex flex-col items-center gap-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border border-accent/30 rounded-full animate-ping" />
                <div className="absolute inset-2 border border-accent/60 rounded-full" />
                <div className="absolute inset-4 bg-accent/20 rounded-full" />
              </div>
              <span className="font-mono text-xs tracking-[0.3em] text-mist uppercase">Loading</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
      </div>

      <div className="absolute inset-0 z-20 pointer-events-none">
        <SubtitleDisplay caption={activeCaption} />
        <ProgressIndicator progress={progress} duration={videoData.metadata.duration} currentTime={currentTime} />
      </div>

      <AnimatePresence>
        {rateLabel && !isAutoPlaying && (
          <motion.div
            key="rate"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.12 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
          >
            <div className="px-5 py-2 rounded-xl bg-ink/80 border border-white/10" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.7)" }}>
              <span className={`font-mono text-2xl tabular-nums ${Math.abs(playbackRate) <= MIN_PLAYBACK + 0.01 ? "text-signal" : Math.abs(playbackRate) >= 1.8 ? "text-accent" : "text-paper"}`}>
                {rateLabel}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isAutoPlaying && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-ink/80 border border-accent/20">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="font-mono text-sm text-accent tabular-nums">{autoSpeed.toFixed(2)}×</span>
            <span className="font-mono text-[9px] tracking-[0.3em] text-mist/60 uppercase">auto</span>
          </div>
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 h-14 z-30 flex items-center justify-between px-6">
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-xs tracking-[0.25em] text-accent uppercase">ScrollAPI</span>
          <span className="font-mono text-[10px] text-mist/70 tracking-wider max-w-xs truncate">
            {videoData.metadata.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {videoData.captions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => { setShowLangSelector(!showLangSelector); setShowControls(false); }}
                className="flex items-center gap-2 px-3 py-1.5 bg-graphite/90 border border-white/8 rounded-lg font-mono text-xs tracking-wider text-mist hover:text-paper transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                CC · {selectedLang.toUpperCase()}
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

          <button
            onClick={() => { setShowControls(!showControls); setShowLangSelector(false); }}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg font-mono text-xs tracking-wider transition-colors ${showControls ? "bg-accent/20 border-accent/40 text-accent" : "bg-graphite/90 border-white/8 text-mist hover:text-paper"}`}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M6 1v1.5M6 9.5V11M1 6h1.5M9.5 6H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Auto
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-14 right-6 z-40 w-64 bg-graphite border border-white/8 rounded-xl overflow-hidden"
            style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.7)" }}
          >
            <div className="px-4 py-3 border-b border-white/6 flex items-center justify-between">
              <span className="font-mono text-[9px] tracking-[0.35em] text-mist/60 uppercase">Auto-scroll speed</span>
              <span className="font-mono text-xs text-accent tabular-nums">{autoSpeed.toFixed(2)}×</span>
            </div>

            <div className="px-4 py-4 flex flex-col gap-4">
              <input
                type="range"
                min={0.25}
                max={2.0}
                step={0.05}
                value={autoSpeed}
                onChange={(e) => setAutoSpeed(parseFloat(e.target.value))}
                className="w-full cursor-pointer"
                style={{ accentColor: "#C8A96E" }}
              />

              <div className="grid grid-cols-4 gap-1">
                {SPEED_PRESETS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setAutoSpeed(s)}
                    className={`py-1.5 rounded-lg font-mono text-[10px] tracking-wide transition-colors ${autoSpeed === s ? "bg-accent/20 text-accent border border-accent/30" : "bg-lead/60 text-mist hover:text-paper border border-white/5"}`}
                  >
                    {s}×
                  </button>
                ))}
              </div>

              <button
                onClick={() => { isAutoPlaying ? stopAutoPlay() : startAutoPlay(autoSpeed); }}
                className={`w-full py-2.5 rounded-xl font-mono text-xs tracking-[0.2em] uppercase transition-all duration-200 ${isAutoPlaying ? "bg-signal/20 border border-signal/30 text-signal hover:bg-signal/30" : "bg-accent/90 hover:bg-accent text-ink"}`}
              >
                {isAutoPlaying ? "■  Stop" : `▶  Play at ${autoSpeed}×`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isScrolling && !isAutoPlaying && isReady && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
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
