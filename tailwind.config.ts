import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        ink: "#0A0A0B",
        paper: "#F2EFE8",
        bone: "#E8E4DA",
        graphite: "#1C1C1E",
        lead: "#2A2A2E",
        mist: "#8A8A96",
        accent: "#C8A96E",
        signal: "#E85D3A",
      },
      boxShadow: {
        "deep-sm": "0 2px 8px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.6)",
        deep: "0 4px 20px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.65), 0 1px 2px rgba(0,0,0,0.8)",
        "deep-lg": "0 8px 40px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.65), 0 2px 4px rgba(0,0,0,0.8)",
        "deep-xl": "0 16px 64px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.85)",
        "inset-deep": "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.4)",
      },
      backgroundImage: {
        "noise": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E\")",
      },
      animation: {
        "film-roll": "filmRoll 20s linear infinite",
        "grain": "grain 0.5s steps(2) infinite",
        "fade-up": "fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        filmRoll: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        grain: {
          "0%, 100%": { backgroundPosition: "0 0" },
          "10%": { backgroundPosition: "-5% -10%" },
          "20%": { backgroundPosition: "-15% 5%" },
          "30%": { backgroundPosition: "7% -25%" },
          "40%": { backgroundPosition: "20% 25%" },
          "50%": { backgroundPosition: "-25% 10%" },
          "60%": { backgroundPosition: "15% 5%" },
          "70%": { backgroundPosition: "0% 15%" },
          "80%": { backgroundPosition: "25% 35%" },
          "90%": { backgroundPosition: "-10% 10%" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
