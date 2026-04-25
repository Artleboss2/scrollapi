export function extractVideoId(input: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export function reconstructUrlFromSegments(segments: string[]): string {
  return segments.join("/");
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function parseXmlCaptions(xml: string): Array<{ start: number; dur: number; text: string }> {
  const cues: Array<{ start: number; dur: number; text: string }> = [];
  const regex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;

  let match;
  while ((match = regex.exec(xml)) !== null) {
    const text = match[3]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]+>/g, "")
      .trim();

    if (text) {
      cues.push({
        start: parseFloat(match[1]),
        dur: parseFloat(match[2]),
        text,
      });
    }
  }

  return cues;
}

export function getActiveCue(
  cues: Array<{ start: number; dur: number; text: string }>,
  currentTime: number
): { start: number; dur: number; text: string } | null {
  return (
    cues.find(
      (cue) => currentTime >= cue.start && currentTime <= cue.start + cue.dur
    ) ?? null
  );
}
