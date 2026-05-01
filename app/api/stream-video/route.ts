import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const streamUrl = searchParams.get("url");

  if (!streamUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(streamUrl);
    new URL(decoded);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  const rangeHeader = request.headers.get("range");

  const fetchHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.youtube.com/",
    "Origin": "https://www.youtube.com",
  };

  if (rangeHeader) {
    fetchHeaders["Range"] = rangeHeader;
  }

  try {
    const upstream = await fetch(decoded, { headers: fetchHeaders });

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", upstream.headers.get("Content-Type") ?? "video/mp4");
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Cache-Control", "public, max-age=3600");

    const contentLength = upstream.headers.get("Content-Length");
    if (contentLength) responseHeaders.set("Content-Length", contentLength);

    const contentRange = upstream.headers.get("Content-Range");
    if (contentRange) responseHeaders.set("Content-Range", contentRange);

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Proxy error";
    return new NextResponse(msg, { status: 502 });
  }
}
