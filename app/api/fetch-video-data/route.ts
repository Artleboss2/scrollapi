import { NextRequest, NextResponse } from "next/server";
import youtubeDl from "youtube-dl-exec";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return NextResponse.json({ error: "Invalid videoId" }, { status: 400 });
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const info = await youtubeDl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeaders: ["referer:youtube.com", "user-agent:Mozilla/5.0"],
    }) as Record<string, unknown>;

    const formats = (info.formats as Record<string, unknown>[]) ?? [];

    const videoFormat = formats
      .filter(
        (f) =>
          typeof f.url === "string" &&
          typeof f.vcodec === "string" &&
          f.vcodec !== "none" &&
          typeof f.acodec === "string" &&
          f.acodec !== "none" &&
          f.ext === "mp4"
      )
      .sort(
        (a, b) =>
          ((b.height as number) ?? 0) - ((a.height as number) ?? 0)
      )[0];

    const videoUrl = (videoFormat?.url as string) ?? "";

    if (!videoUrl) {
      return NextResponse.json({ error: "No suitable video format found" }, { status: 404 });
    }

    const rawCaptions = (info.subtitles as Record<string, unknown>) ?? {};
    const autoCaptions = (info.automatic_captions as Record<string, unknown>) ?? {};
    const allCaptions = { ...autoCaptions, ...rawCaptions };

    const captions: Array<{ lang: string; langName: string; data: unknown[] }> = [];

    for (const [lang, tracks] of Object.entries(allCaptions)) {
      if (lang === "live_chat") continue;
      const trackList = tracks as Array<Record<string, string>>;
      const vttTrack = trackList.find((t) => t.ext === "vtt" || t.ext === "json3");
      if (!vttTrack?.url) continue;

      try {
        const res = await fetch(vttTrack.url);
        const text = await res.text();
        const cues = parseVtt(text);
        if (cues.length > 0) {
          captions.push({ lang, langName: lang, data: cues });
        }
      } catch {
        continue;
      }

      if (captions.length >= 6) break;
    }

    return NextResponse.json(
      {
        videoId,
        videoUrl,
        metadata: {
          id: videoId,
          title: (info.title as string) ?? "Unknown",
          author: (info.uploader as string) ?? (info.channel as string) ?? "Unknown",
          duration: (info.duration as number) ?? 0,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
          description: ((info.description as string) ?? "").slice(0, 300),
        },
        captions,
      },
      { headers: { "Cache-Control": "public, max-age=3600" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function parseVtt(text: string): Array<{ start: number; dur: number; text: string }> {
  const cues: Array<{ start: number; dur: number; text: string }> = [];
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    if (lines[i].includes("-->")) {
      const [startStr, endStr] = lines[i].split("-->").map((s) => s.trim().split(" ")[0]);
      const start = vttToSeconds(startStr);
      const end = vttToSeconds(endStr);
      const textLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== "") {
        const clean = lines[i]
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&nbsp;/g, " ")
          .trim();
        if (clean) textLines.push(clean);
        i++;
      }
      const joined = textLines.join(" ");
      if (joined) cues.push({ start, dur: end - start, text: joined });
    } else {
      i++;
    }
  }

  return cues;
}

function vttToSeconds(t: string): number {
  const parts = t.split(":").map(parseFloat);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}
