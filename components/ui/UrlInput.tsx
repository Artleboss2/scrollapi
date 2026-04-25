"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { extractVideoId } from "@/lib/videoUtils";

export default function UrlInput() {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const id = extractVideoId(trimmed);
    if (!id) {
      setError(true);
      setTimeout(() => setError(false), 2000);
      return;
    }

    const encoded = encodeURIComponent(trimmed);
    router.push(`/viewer/${encoded}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="w-full max-w-xl">
      <div
        className={`relative flex items-center rounded-2xl border transition-all duration-300 ${
          error
            ? "border-signal/60 bg-signal/5"
            : focused
            ? "border-accent/40 bg-graphite/80"
            : "border-white/8 bg-graphite/60"
        }`}
        style={{
          boxShadow: focused
            ? "0 0 0 1px rgba(200,169,110,0.15), 0 8px 32px rgba(0,0,0,0.5)"
            : "0 4px 20px rgba(0,0,0,0.4)",
        }}
      >
        <div className="absolute left-5 flex items-center gap-2 pointer-events-none">
          <div
            className={`w-1 h-1 rounded-full transition-colors ${
              value ? "bg-accent" : "bg-mist/40"
            }`}
          />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="youtube.com/watch?v=..."
          className="flex-1 bg-transparent pl-10 pr-4 py-4 font-mono text-sm text-paper placeholder:text-mist/30 outline-none tracking-wide"
        />

        <button
          onClick={handleSubmit}
          className="mr-2 flex items-center gap-2 px-4 py-2 bg-accent/90 hover:bg-accent text-ink rounded-xl font-display text-xs tracking-wider font-600 transition-all duration-200 hover:shadow-deep"
        >
          <span>Open</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6h8M7 3l3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 font-mono text-xs text-signal/80 tracking-wide pl-1"
          >
            Invalid YouTube URL. Try youtube.com/watch?v=... or youtu.be/...
          </motion.p>
        )}
      </AnimatePresence>

      <div className="mt-4 flex items-center gap-4 pl-1">
        {[
          "youtube.com/watch?v=dQw4w9WgXcQ",
          "youtu.be/xxxxxxxxxxx",
          "youtube.com/shorts/...",
        ].map((example, i) => (
          <span
            key={i}
            onClick={() => setValue(`https://${example}`)}
            className="font-mono text-[9px] tracking-wider text-mist/30 hover:text-mist/60 cursor-pointer transition-colors truncate"
          >
            {example}
          </span>
        ))}
      </div>
    </div>
  );
}
