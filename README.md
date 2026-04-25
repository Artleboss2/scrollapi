# ScrollAPI

**Time is Space.** ScrollAPI transforms YouTube videos into scrollable experiences where your scroll position maps directly to video time.

## Stack

- **Next.js 14** App Router + TypeScript
- **Three.js / React Three Fiber** — 3D film strip hero scene
- **Framer Motion** — UI animations and subtitle transitions
- **Lenis** — 60fps smooth scroll engine
- **Tailwind CSS** — utility styling with custom shadow system

## Architecture

```
app/
  page.tsx                    # Landing page with Three.js film scene
  layout.tsx                  # Root layout with Lenis smooth scroll
  not-found.tsx               # 404 page
  api/
    fetch-video-data/
      route.ts                # InnerTube API proxy — fetches streams + captions
  viewer/
    [encodedUrl]/
      page.tsx                # Server component — fetches video data, renders player

components/
  three/
    FilmScene.tsx             # R3F scene: film strip + reel + animated camera rig
  player/
    ScrollVideoPlayer.tsx     # Core scroll-to-time engine with RAF scrubbing
  ui/
    ProgressIndicator.tsx     # Film-strip progress bar
    SubtitleDisplay.tsx       # Animated caption overlay
    LanguageSelector.tsx      # Floating language picker
    UrlInput.tsx              # YouTube URL input with validation
    SmoothScrollProvider.tsx  # Lenis initialization wrapper

lib/
  videoUtils.ts               # URL parsing, XML caption parser, time formatting

types/
  index.ts                    # TypeScript interfaces
```

## How Scroll-to-Time Works

1. The viewer page renders a `500vh` container with the video element `sticky` inside.
2. On every `scroll` event, `window.scrollY / maxScroll` gives a 0–1 fraction.
3. That fraction multiplies `video.duration` to get `targetTime`.
4. A `requestAnimationFrame` loop lerps `currentTime → targetTime` at 12% per frame for smooth scrubbing.
5. Touch events are handled separately with `deltaY` mapped to time steps.

## Deployment

```bash
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_BASE_URL to your Vercel URL
vercel deploy
```

## Local Development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Notes

- The YouTube InnerTube API is used server-side for video stream URLs and caption tracks.
- Stream URLs from YouTube are time-limited (~6h) and region-locked.
- For production use, consider adding a caching layer (Redis/KV) for video metadata.
- Mobile touch scrubbing maps touch drag distance to video time advancement.
