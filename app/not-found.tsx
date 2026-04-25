"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-8 text-center max-w-md"
      >
        <div className="relative">
          <span
            className="font-display text-[8rem] leading-none tracking-tighter font-800"
            style={{
              WebkitTextStroke: "1px rgba(200,169,110,0.3)",
              color: "transparent",
            }}
          >
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="font-display text-2xl tracking-tight text-paper">
            Frame not found
          </h1>
          <p className="font-body text-sm text-mist leading-relaxed">
            This timestamp doesn't exist in the timeline.
          </p>
        </div>

        <Link
          href="/"
          className="flex items-center gap-2 px-6 py-3 bg-graphite border border-white/8 rounded-xl font-mono text-xs tracking-[0.3em] text-mist hover:text-paper hover:border-white/20 transition-all duration-300 deep-shadow"
        >
          ← Rewind to start
        </Link>
      </motion.div>
    </div>
  );
}
