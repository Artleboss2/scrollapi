import sys
import json
import os
import subprocess
import tempfile
import hashlib

def get_cache_dir():
    cache = os.path.join(tempfile.gettempdir(), "scrollapi_cache")
    os.makedirs(cache, exist_ok=True)
    return cache

def get_video_path(video_id):
    cache_dir = get_cache_dir()
    return os.path.join(cache_dir, f"{video_id}.mp4")

def get_info_path(video_id):
    cache_dir = get_cache_dir()
    return os.path.join(cache_dir, f"{video_id}.info.json")

def get_captions_path(video_id, lang):
    cache_dir = get_cache_dir()
    return os.path.join(cache_dir, f"{video_id}.{lang}.vtt")

def fetch_info(video_id):
    info_path = get_info_path(video_id)
    if os.path.exists(info_path):
        with open(info_path, "r", encoding="utf-8") as f:
            return json.load(f)

    url = f"https://www.youtube.com/watch?v={video_id}"
    result = subprocess.run(
        [
            "yt-dlp",
            "--no-check-certificates",
            "--dump-json",
            "--no-playlist",
            url,
        ],
        capture_output=True,
        text=True,
        timeout=60,
    )

    if result.returncode != 0:
        raise RuntimeError(f"yt-dlp info failed: {result.stderr[:300]}")

    info = json.loads(result.stdout)
    with open(info_path, "w", encoding="utf-8") as f:
        json.dump(info, f)

    return info

def download_video(video_id):
    video_path = get_video_path(video_id)
    if os.path.exists(video_path) and os.path.getsize(video_path) > 100_000:
        return video_path

    url = f"https://www.youtube.com/watch?v={video_id}"
    cache_dir = get_cache_dir()

    result = subprocess.run(
        [
            "yt-dlp",
            "--no-check-certificates",
            "--no-playlist",
            "-f", "bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4][height<=720]/best[height<=720]",
            "--merge-output-format", "mp4",
            "-o", video_path,
            "--write-subs",
            "--write-auto-subs",
            "--sub-format", "vtt",
            "--sub-langs", "all,-live_chat",
            "--paths", cache_dir,
            url,
        ],
        capture_output=True,
        text=True,
        timeout=300,
    )

    if result.returncode != 0 or not os.path.exists(video_path):
        raise RuntimeError(f"yt-dlp download failed: {result.stderr[:400]}")

    return video_path

def parse_vtt(vtt_content):
    cues = []
    lines = vtt_content.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if "-->" in line:
            try:
                parts = line.split("-->")
                start = vtt_time_to_seconds(parts[0].strip().split()[0])
                end = vtt_time_to_seconds(parts[1].strip().split()[0])
                text_lines = []
                i += 1
                while i < len(lines) and lines[i].strip() != "":
                    clean = lines[i].strip()
                    import re
                    clean = re.sub(r"<[^>]+>", "", clean)
                    clean = re.sub(r"&amp;", "&", clean)
                    clean = re.sub(r"&lt;", "<", clean)
                    clean = re.sub(r"&gt;", ">", clean)
                    clean = re.sub(r"&nbsp;", " ", clean)
                    if clean:
                        text_lines.append(clean)
                    i += 1
                text = " ".join(text_lines)
                if text:
                    cues.append({
                        "start": start,
                        "dur": end - start,
                        "text": text,
                    })
            except Exception:
                pass
        i += 1
    return cues

def vtt_time_to_seconds(t):
    parts = t.split(":")
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
    elif len(parts) == 2:
        return int(parts[0]) * 60 + float(parts[1])
    return float(parts[0])

def collect_captions(video_id):
    cache_dir = get_cache_dir()
    tracks = []
    seen_langs = set()

    for fname in os.listdir(cache_dir):
        if not fname.startswith(video_id):
            continue
        if not fname.endswith(".vtt"):
            continue

        base = fname[len(video_id) + 1:]
        lang = base.replace(".vtt", "")

        if lang in seen_langs:
            continue
        seen_langs.add(lang)

        fpath = os.path.join(cache_dir, fname)
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
            cues = parse_vtt(content)
            if cues:
                tracks.append({
                    "lang": lang,
                    "langName": lang,
                    "data": cues,
                })
        except Exception:
            continue

    return tracks

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: fetch_video.py <action> <video_id>"}))
        sys.exit(1)

    action = sys.argv[1]
    video_id = sys.argv[2]

    try:
        if action == "info":
            info = fetch_info(video_id)
            thumbnail = f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"
            result = {
                "videoId": video_id,
                "metadata": {
                    "id": video_id,
                    "title": info.get("title", "Unknown"),
                    "author": info.get("uploader", info.get("channel", "Unknown")),
                    "duration": int(info.get("duration", 0)),
                    "thumbnail": thumbnail,
                    "description": (info.get("description", "") or "")[:300],
                },
            }
            print(json.dumps(result))

        elif action == "download":
            video_path = download_video(video_id)
            captions = collect_captions(video_id)
            info = fetch_info(video_id)
            thumbnail = f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"
            result = {
                "videoId": video_id,
                "videoPath": video_path,
                "metadata": {
                    "id": video_id,
                    "title": info.get("title", "Unknown"),
                    "author": info.get("uploader", info.get("channel", "Unknown")),
                    "duration": int(info.get("duration", 0)),
                    "thumbnail": thumbnail,
                    "description": (info.get("description", "") or "")[:300],
                },
                "captions": captions,
            }
            print(json.dumps(result))

        elif action == "cached_path":
            video_path = get_video_path(video_id)
            exists = os.path.exists(video_path) and os.path.getsize(video_path) > 100_000
            print(json.dumps({"path": video_path, "exists": exists}))

        else:
            print(json.dumps({"error": f"Unknown action: {action}"}))
            sys.exit(1)

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
