"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import UrlInput from "@/components/ui/UrlInput";

const FilmScene = dynamic(() => import("@/components/three/FilmScene"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-ink" />,
});

const stagger = {
  container: {
    hidden: {},
    show: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } },
  },
  item: {
    hidden: { opacity: 0, y: 32 },
    show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
  },
};

const FEATURES = [
  {
    number: "01",
    title: "Scroll-Driven Time",
    body: "Your scroll position maps 1:1 to video time. Drag forward, drag backward — every frame is under your control.",
  },
  {
    number: "02",
    title: "Multilingual Subtitles",
    body: "All available caption tracks are loaded and synchronized frame-accurately with your scroll position.",
  },
  {
    number: "03",
    title: "No Interface Noise",
    body: "No play button. No seek bar clutter. Pure content, pure motion. The UI disappears into the experience.",
  },
];

export default function HomePage() {
  const scrollRef = useRef<number>(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      scrollRef.current = window.scrollY / maxScroll;
      setScrollProgress(scrollRef.current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="grain-overlay">
      <section className="relative min-h-screen flex flex-col overflow-hidden">
        <div className="absolute inset-0 z-0">
          <FilmScene scrollProgress={scrollProgress} />
        </div>

        <div className="absolute inset-0 z-0 bg-gradient-to-b from-ink/30 via-transparent to-ink" />

        <div className="absolute inset-0 z-0">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-[0.03] bg-paper"
              style={{
                width: `${300 + i * 80}px`,
                height: `${300 + i * 80}px`,
                left: `${10 + i * 15}%`,
                top: `${20 + Math.sin(i) * 30}%`,
                filter: "blur(80px)",
              }}
            />
          ))}
        </div>

        <header className="relative z-10 flex items-center justify-between px-8 pt-8">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 flex items-center justify-center">
              <div className="w-3 h-3 border border-accent rounded-sm rotate-45" />
            </div>
            <span className="font-display text-sm tracking-[0.25em] font-600 uppercase">
              ScrollAPI
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
            <span className="font-mono text-[9px] tracking-[0.4em] text-mist/60 uppercase">
              Beta
            </span>
          </div>
        </header>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 pt-16 pb-32">
          <motion.div
            variants={stagger.container}
            initial="hidden"
            animate="show"
            className="flex flex-col items-center text-center max-w-4xl gap-8"
          >
            <motion.div variants={stagger.item} className="flex items-center gap-3">
              <div className="h-px w-12 bg-accent/50" />
              <span className="font-mono text-[9px] tracking-[0.5em] text-accent/80 uppercase">
                Redefining Video Consumption
              </span>
              <div className="h-px w-12 bg-accent/50" />
            </motion.div>

            <motion.h1
              variants={stagger.item}
              className="font-display text-[clamp(3rem,8vw,7rem)] leading-[0.9] tracking-[-0.03em] font-800"
            >
              <span className="block text-paper">Time is</span>
              <span
                className="block"
                style={{
                  WebkitTextStroke: "1px rgba(200,169,110,0.6)",
                  color: "transparent",
                }}
              >
                Space.
              </span>
            </motion.h1>

            <motion.p
              variants={stagger.item}
              className="font-body text-base text-mist leading-relaxed max-w-lg tracking-wide"
            >
              ScrollAPI transforms YouTube videos into scrollable experiences. By mapping
              time to space, we return control to the viewer. Each frame becomes a step
              in your navigation — because attention is not linear, it is explorative.
            </motion.p>

            <motion.div variants={stagger.item} className="w-full max-w-xl">
              <UrlInput />
            </motion.div>
          </motion.div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 animate-bounce opacity-40">
          <span className="font-mono text-[8px] tracking-[0.5em] text-mist uppercase">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-mist/60 to-transparent" />
        </div>
      </section>

      <section className="relative bg-ink py-40 px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="mb-24 flex flex-col gap-4"
          >
            <span className="font-mono text-[9px] tracking-[0.5em] text-accent/70 uppercase">
              The Concept
            </span>
            <p className="font-display text-[clamp(1.5rem,3.5vw,2.5rem)] leading-tight tracking-tight max-w-3xl text-paper/90">
              A deconstruction of cinematic editing: every frame becomes a step
              in your navigation. Scroll forward — time advances. Scroll back — time rewinds.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden deeper-shadow">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
                className="flex flex-col gap-5 p-8 bg-graphite hover:bg-lead transition-colors duration-500"
              >
                <span className="font-mono text-[9px] tracking-[0.5em] text-accent/60 uppercase">
                  {feature.number}
                </span>
                <h3 className="font-display text-xl tracking-tight font-600 text-paper">
                  {feature.title}
                </h3>
                <p className="font-body text-sm text-mist leading-relaxed">
                  {feature.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-graphite py-32 px-8 border-t border-white/5">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center gap-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-6"
          >
            <div className="flex items-center gap-3">
              <div className="h-px w-8 bg-accent/30" />
              <span className="font-mono text-[9px] tracking-[0.5em] text-accent/60 uppercase">
                Try it now
              </span>
              <div className="h-px w-8 bg-accent/30" />
            </div>
            <h2 className="font-display text-[clamp(2rem,5vw,4rem)] leading-tight tracking-tight">
              Paste any YouTube URL.
            </h2>
            <p className="font-body text-mist text-base max-w-sm leading-relaxed">
              No login. No extension. No setup. Just paste and scroll.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-xl"
          >
            <UrlInput />
          </motion.div>
        </div>
      </section>

      <footer className="bg-ink border-t border-white/5 px-8 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 flex items-center justify-center">
              <div className="w-2 h-2 border border-accent/50 rounded-sm rotate-45" />
            </div>
            <span className="font-mono text-[9px] tracking-[0.4em] text-mist/40 uppercase">
              ScrollAPI
            </span>
          </div>
          <span className="font-mono text-[9px] tracking-wider text-mist/30">
            Time is Space
          </span>
        </div>
      </footer>
    </div>
  );
}
