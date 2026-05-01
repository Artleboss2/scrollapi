"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { VideoData, CaptionCue } from "@/types";
import { getActiveCue } from "@/lib/videoUtils";
import LanguageSelector from "@/components/ui/LanguageSelector";
import ProgressIndicator from "@/components/ui/ProgressIndicator";
import SubtitleDisplay from "@/components/ui/SubtitleDisplay";
import { motion, AnimatePresence } from "framer-motion";

interface ScrollVideoPlayerProps {
  videoData: VideoData;
}

const NORMAL_SCROLL_SPEED = 8;
const MIN_PLAYBACK = 0.1;
const MAX_PLAYBACK = 3.0;
const STOP_THRESHOLD = 0.5;
const IDLE_MS = 80;

export default function ScrollVideoPlayer({ videoData }: ScrollVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);
  const isReadyRef = useRef(false);
  const lastScrollTimeRef = useRef(performance.now());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);

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
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    isPlayingRef.current = false;
    setIsScrolling(false);
    setPlaybackRate(0);
  }, []);

  const scheduleStop = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(stopVideo, IDLE_MS);
  }, [stopVideo]);

  const rafLoop = useCallback(() => {
    const video = videoRef.current;
    if (video && isReadyRef.current) {
      const t = video.currentTime;
      const dur = video.duration || 1;
      setCurrentTime(t);
      setProgress(t / dur);
      const cue = getActiveCue(activeCaptions, t);
      setActiveCaption(cue);
    }
    rafRef.current = requestAnimationFrame(rafLoop);
  }, [activeCaptions]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(rafLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [rafLoop]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const video = videoRef.current;
      if (!video || !isReadyRef.current) return;

      const now = performance.now();
      const dt = Math.max(now - lastScrollTimeRef.current, 1);
      const dy = e.deltaY;
      lastScrollTimeRef.current = now;

      if (Math.abs(dy) < STOP_THRESHOLD) {
        scheduleStop();
        return;
      }

      const pixelsPerMs = dy / dt;
      const rate = Math.abs(pixelsPerMs) / NORMAL_SCROLL_SPEED;
      const clampedRate = Math.max(MIN_PLAYBACK, Math.min(MAX_PLAYBACK, rate));
      const direction = dy > 0 ? 1 : -1;

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      setIsScrolling(true);

      if (direction === -1) {
        video.pause();
        isPlayingRef.current = false;
        const newTime = Math.max(0, video.currentTime - clampedRate * (dt / 1000) * 2);
        video.currentTime = newTime;
        setPlaybackRate(-clampedRate);
      } else {
        video.playbackRate = clampedRate;
        setPlaybackRate(clampedRate);
        if (video.paused) {
          video.play().catch(() => {});
          isPlayingRef.current = true;
        }
      }

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
      const video = videoRef.current;
      if (!video || !isReadyRef.current) return;

      const now = performance.now();
      const dy = lastTouchY - e.touches[0].clientY;
      const dt = Math.max(now - lastTouchTime, 1);
      lastTouchY = e.touches[0].clientY;
      lastTouchTime = now;

      if (Math.abs(dy) < 1) { scheduleStop(); return; }

      const rate = Math.abs(dy / dt) / (NORMAL_SCROLL_SPEED * 0.5);
      const clampedRate = Math.max(MIN_PLAYBACK, Math.min(MAX_PLAYBACK, rate));
      const direction = dy > 0 ? 1 : -1;

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      setIsScrolling(true);

      if (direction === -1) {
        video.pause();
        isPlayingRef.current = false;
        const newTime = Math.max(0, video.currentTime - clampedRate * (dt / 1000) * 2);
        video.currentTime = newTime;
        setPlaybackRate(-clampedRate);
      } else {
        video.playbackRate = clampedRate;
        setPlaybackRate(clampedRate);
        if (video.paused) {
          video.play().catch(() => {});
          isPlayingRef.current = true;
        }
      }

      scheduleStop();
    };

    const handleTouchEnd = () => scheduleStop();

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [scheduleStop]);

  const handleVideoReady = useCallback(() => {
    isReadyRef.current = true;
    setIsReady(true);
  }, []);

  const rateLabel = (() => {
    if (playbackRate === 0) return null;
    const abs = Math.abs(playbackRate);
    const dir = playbackRate < 0 ? "◀ " : "";
    if (abs >= 1.9) return `${dir}${abs.toFixed(1)}×`;
    if (abs <= 0.35) return `${dir}${abs.toFixed(2)}×`;
    return `${dir}${abs.toFixed(1)}×`;
  })();

  return (
    <div className="relative w-full h-screen overflow-hidden bg-ink">
      <video
        ref={videoRef}
        src={videoData.videoUrl}
        className="absolute inset-0 w-full h-full object-contain"
        playsInline
        preload="auto"
        onCanPlay={handleVideoReady}
        onLoadedMetadata={handleVideoReady}
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

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-ink/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/20 via-transparent to-ink/20" />
      </div>

      <SubtitleDisplay caption={activeCaption} />

      <ProgressIndicator
        progress={progress}
        duration={videoData.metadata.duration}
        currentTime={currentTime}
      />

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
              <span className={`font-mono text-2xl tabular-nums ${Math.abs(playbackRate) < 0.4 ? "text-signal" : Math.abs(playbackRate) > 1.8 ? "text-accent" : "text-paper"}`}>
                {rateLabel}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {videoData.captions.length > 0 && (
        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={() => setShowLangSelector(!showLangSelector)}
            className="flex items-center gap-2 px-3 py-2 bg-graphite/90 border border-white/8 rounded-lg font-mono text-xs tracking-wider text-mist hover:text-paper transition-colors deep-shadow"
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

      <div className="absolute top-6 left-6 z-20">
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
            transition={{ duration: 0.6, delay: 0.5 }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-3"
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
