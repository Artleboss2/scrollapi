"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { CaptionCue } from "@/types";

interface SubtitleDisplayProps {
  caption: CaptionCue | null;
}

export default function SubtitleDisplay({ caption }: SubtitleDisplayProps) {
  return (
    <div className="absolute bottom-36 left-0 right-0 flex justify-center z-20 px-8 pointer-events-none">
      <AnimatePresence mode="wait">
        {caption && (
          <motion.div
            key={caption.text}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl text-center"
          >
            <p
              className="font-display text-xl leading-tight tracking-tight text-paper"
              style={{
                textShadow:
                  "0 2px 20px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,0.95), 0 0 40px rgba(0,0,0,0.8)",
              }}
            >
              {caption.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
