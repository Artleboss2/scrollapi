"use client";

import { formatDuration } from "@/lib/videoUtils";

interface ProgressIndicatorProps {
  progress: number;
  duration: number;
  currentTime: number;
}

export default function ProgressIndicator({
  progress,
  duration,
  currentTime,
}: ProgressIndicatorProps) {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-full max-w-xl px-8">
      <div className="flex items-center gap-4">
        <span className="font-mono text-[10px] text-mist/70 tracking-wider tabular-nums w-10">
          {formatDuration(currentTime)}
        </span>

        <div className="flex-1 relative h-px bg-white/10">
          <div
            className="absolute inset-y-0 left-0 bg-accent transition-none"
            style={{ width: `${progress * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent deeper-shadow"
            style={{
              left: `${progress * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>

        <span className="font-mono text-[10px] text-mist/70 tracking-wider tabular-nums w-10 text-right">
          {formatDuration(duration)}
        </span>
      </div>

      <div className="flex items-center justify-center mt-3">
        <div className="flex gap-px">
          {Array.from({ length: 60 }, (_, i) => (
            <div
              key={i}
              className="w-px transition-none"
              style={{
                height: i % 5 === 0 ? "8px" : "4px",
                background:
                  i / 60 <= progress
                    ? `rgba(200, 169, 110, ${i % 5 === 0 ? 0.8 : 0.4})`
                    : `rgba(255, 255, 255, ${i % 5 === 0 ? 0.15 : 0.06})`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
