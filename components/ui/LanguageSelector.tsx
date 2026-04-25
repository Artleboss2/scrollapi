"use client";

import { motion } from "framer-motion";
import type { CaptionTrack } from "@/types";

interface LanguageSelectorProps {
  tracks: CaptionTrack[];
  selected: string;
  onSelect: (lang: string) => void;
}

export default function LanguageSelector({
  tracks,
  selected,
  onSelect,
}: LanguageSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-full right-0 mt-2 min-w-48 bg-graphite border border-white/8 rounded-xl overflow-hidden deeper-shadow"
    >
      <div className="px-3 py-2 border-b border-white/6">
        <span className="font-mono text-[9px] tracking-[0.35em] text-mist/60 uppercase">
          Subtitles
        </span>
      </div>
      <div className="py-1 max-h-64 overflow-y-auto">
        {tracks.map((track) => (
          <button
            key={track.lang}
            onClick={() => onSelect(track.lang)}
            className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
              selected === track.lang
                ? "bg-accent/12 text-accent"
                : "text-mist hover:bg-white/4 hover:text-paper"
            }`}
          >
            <span className="font-body text-sm">{track.langName}</span>
            <span className="font-mono text-[10px] tracking-wider opacity-60">
              {track.lang.toUpperCase()}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
