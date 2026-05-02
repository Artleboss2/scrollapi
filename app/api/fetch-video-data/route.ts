import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 20;

function parseXmlCaptions(xml: string): Array<{ start: number; dur: number; text: string }> {
  const cues: Array<{ start: number; dur: number; text: string }> = [];
  const regex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const text = match[3]
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]+>/g, "").trim();
    if (text) cues.push({ start: parseFloat(match[1]), dur: parseFloat(match[2]), text });
  }
  return cues;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return NextResponse.json({ error: "Invalid videoId" }, { status: 400 });
  }

  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/player", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
        "X-YouTube-Client-Name": "3",
        "X-YouTube-Client-Version": "19.09.37",
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: "ANDROID",
            clientVersion: "19.09.37",
            androidSdkVersion: 30,
            hl: "en",
            gl: "US",
          },
        },
      }),
    });

    const data = await res.json();
    const videoDetails = data.videoDetails ?? {};
    const captionsRenderer = data.captions?.playerCaptionsTracklistRenderer ?? {};
    const captionTracks = (captionsRenderer.captionTracks ?? []) as Record<string, unknown>[];

    const captions: Array<{ lang: string; langName: string; data: unknown[] }> = [];

    for (const track of captionTracks.slice(0, 6)) {
      const baseUrl = track.baseUrl as string;
      if (!baseUrl) continue;
      try {
        const capRes = await fetch(baseUrl);
        const xml = await capRes.text();
        const cues = parseXmlCaptions(xml);
        if (cues.length > 0) {
          captions.push({
            lang: (track.languageCode as string) ?? "unknown",
            langName: ((track.name as Record<string, string>)?.simpleText) ?? (track.languageCode as string) ?? "Unknown",
            data: cues,
          });
        }
      } catch { continue; }
    }

    return NextResponse.json(
      {
        videoId,
        videoUrl: "",
        metadata: {
          id: videoId,
          title: (videoDetails.title as string) ?? "Unknown",
          author: (videoDetails.author as string) ?? "Unknown",
          duration: parseInt((videoDetails.lengthSeconds as string) ?? "0", 10),
          thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
          description: ((videoDetails.shortDescription as string) ?? "").slice(0, 300),
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
