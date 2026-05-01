"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { extractVideoId } from "@/lib/videoUtils";
import type { VideoData } from "@/types";

const ScrollVideoPlayer = dynamic(
  () => import("@/components/player/ScrollVideoPlayer"),
  { ssr: false }
);

type Phase = "init" | "downloading" | "ready" | "error";

const DOWNLOAD_MESSAGES = [
  "Extracting video stream…",
  "Fetching subtitle tracks…",
  "Optimising for scrubbing…",
  "Almost there…",
  "Finalising…",
];

export default function ViewerPage() {
  const params = useParams();
  const encodedUrl = Array.isArray(params.encodedUrl)
    ? params.encodedUrl[0]
    : (params.encodedUrl as string);

  const videoId = extractVideoId(decodeURIComponent(encodedUrl ?? ""));

  const [phase, setPhase] = useState<Phase>("init");
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [msgIndex, setMsgIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!videoId) {
      setPhase("error");
      setErrorMsg("Invalid YouTube URL.");
      return;
    }

    setPhase("downloading");

    fetch(`/api/fetch-video-data?videoId=${videoId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const proxiedUrl = `/api/stream-video?url=${encodeURIComponent(data.videoUrl as string)}`;
        setVideoData({
          ...data,
          videoUrl: proxiedUrl,
        });
        setPhase("ready");
      })
      .catch((err) => {
        setErrorMsg(err.message ?? "Download failed.");
        setPhase("error");
      });
  }, [videoId]);

  useEffect(() => {
    if (phase !== "downloading") return;
    const msgTimer = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, DOWNLOAD_MESSAGES.length - 1));
    }, 6000);
    const elapsedTimer = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
    return () => {
      clearInterval(msgTimer);
      clearInterval(elapsedTimer);
    };
  }, [phase]);

  if (phase === "ready" && videoData) {
    return (
      <main className="bg-ink min-h-screen">
        <ScrollVideoPlayer videoData={videoData} />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-8">
      <AnimatePresence mode="wait">
        {phase === "error" ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6 max-w-sm text-center"
          >
            <div className="w-12 h-12 border border-signal/30 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-signal/60 rounded-full" />
            </div>
            <h1 className="font-display text-2xl tracking-tight text-paper">
              Video unavailable
            </h1>
            <p className="font-body text-sm text-mist leading-relaxed">
              {errorMsg || "Could not download this video."}
            </p>
            <a
              href="/"
              className="font-mono text-xs tracking-[0.3em] text-accent/80 hover:text-accent uppercase transition-colors"
            >
              ← Back to ScrollAPI
            </a>
          </motion.div>
        ) : (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-10"
          >
            <div className="relative w-24 h-24">
              <svg
                className="w-24 h-24 -rotate-90"
                viewBox="0 0 96 96"
              >
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="rgba(200,169,110,0.6)"
                  strokeWidth="1"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * Math.min(elapsed / 60, 0.95))}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <span className="font-mono text-xs text-accent tabular-nums">
                  {elapsed}s
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <AnimatePresence mode="wait">
                <motion.p
                  key={msgIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                  className="font-mono text-xs tracking-[0.3em] text-mist uppercase text-center"
                >
                  {DOWNLOAD_MESSAGES[msgIndex]}
                </motion.p>
              </AnimatePresence>

              <div className="flex items-center gap-1.5 mt-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1 h-1 rounded-full bg-accent/50 animate-pulse"
                    style={{ animationDelay: `${i * 0.25}s` }}
                  />
                ))}
              </div>
            </div>

            <p className="font-mono text-[9px] tracking-wider text-mist/30 text-center max-w-48">
              yt-dlp is downloading the video to your server. This may take up to 2 minutes.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
