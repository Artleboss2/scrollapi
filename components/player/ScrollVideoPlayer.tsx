"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { VideoData, CaptionCue } from "@/types";
import { getActiveCue } from "@/lib/videoUtils";
import LanguageSelector from "@/components/ui/LanguageSelector";
import ProgressIndicator from "@/components/ui/ProgressIndicator";
import SubtitleDisplay from "@/components/ui/SubtitleDisplay";

interface ScrollVideoPlayerProps {
  videoData: VideoData;
}

export default function ScrollVideoPlayer({ videoData }: ScrollVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const targetTimeRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const isReadyRef = useRef<boolean>(false);

  const [progress, setProgress] = useState(0);
  const [selectedLang, setSelectedLang] = useState<string>(
    videoData.captions[0]?.lang ?? ""
  );
  const [activeCaption, setActiveCaption] = useState<CaptionCue | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showLangSelector, setShowLangSelector] = useState(false);

  const activeCaptions =
    videoData.captions.find((c) => c.lang === selectedLang)?.data ?? [];

  const smoothUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isReadyRef.current) return;

    const diff = targetTimeRef.current - currentTimeRef.current;
    if (Math.abs(diff) > 0.01) {
      currentTimeRef.current += diff * 0.12;
      video.currentTime = currentTimeRef.current;

      const dur = video.duration || 1;
      const prog = currentTimeRef.current / dur;
      setProgress(prog);

      const cue = getActiveCue(activeCaptions, currentTimeRef.current);
      setActiveCaption(cue);
    }

    rafRef.current = requestAnimationFrame(smoothUpdate);
  }, [activeCaptions]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(smoothUpdate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [smoothUpdate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollFraction = Math.max(0, Math.min(1, scrollTop / maxScroll));

      const video = videoRef.current;
      if (!video || !video.duration) return;

      targetTimeRef.current = scrollFraction * video.duration;
    };

    let lastTouchY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const deltaY = lastTouchY - e.touches[0].clientY;
      lastTouchY = e.touches[0].clientY;

      const video = videoRef.current;
      if (!video || !video.duration) return;

      const timeStep = (deltaY / window.innerHeight) * video.duration * 0.5;
      targetTimeRef.current = Math.max(
        0,
        Math.min(video.duration, targetTimeRef.current + timeStep)
      );
      window.scrollTo(0, (targetTimeRef.current / video.duration) * (document.documentElement.scrollHeight - window.innerHeight));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  const handleVideoReady = useCallback(() => {
    isReadyRef.current = true;
    setIsReady(true);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height: "500vh" }}
    >
      <div className="sticky top-0 w-full h-screen overflow-hidden bg-ink">
        <video
          ref={videoRef}
          src={videoData.videoUrl}
          className="absolute inset-0 w-full h-full object-contain"
          playsInline
          muted
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
              <span className="font-mono text-xs tracking-[0.3em] text-mist uppercase">
                Loading
              </span>
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
          currentTime={currentTimeRef.current}
        />

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
                onSelect={(lang) => {
                  setSelectedLang(lang);
                  setShowLangSelector(false);
                }}
              />
            )}
          </div>
        )}

        <div className="absolute top-6 left-6 z-20">
          <div className="flex flex-col gap-1">
            <span className="font-display text-xs tracking-[0.25em] text-accent uppercase">
              ScrollAPI
            </span>
            <span className="font-mono text-[10px] text-mist/70 tracking-wider max-w-48 truncate">
              {videoData.metadata.title}
            </span>
          </div>
        </div>

        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="flex flex-col items-center gap-3 opacity-40">
            <span className="font-mono text-[9px] tracking-[0.4em] text-mist uppercase">
              Scroll to navigate
            </span>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-0.5 bg-mist rounded-full animate-pulse"
                  style={{
                    height: `${8 + i * 4}px`,
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
