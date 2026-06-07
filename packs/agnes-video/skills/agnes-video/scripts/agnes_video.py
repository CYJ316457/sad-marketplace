#!/usr/bin/env python3
import argparse
import http.client
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


CREATE_ENDPOINT = "https://apihub.agnes-ai.com/v1/videos"
QUERY_ENDPOINT = "https://apihub.agnes-ai.com/agnesapi"
MODEL = "agnes-video-v2.0"
ENV_FILE = Path.home() / ".codex" / "agnes.env"
TERMINAL_STATUSES = {"completed", "failed", "cancelled", "canceled", "error"}


def load_api_key() -> str:
    key = os.environ.get("AGNES_API_KEY", "").strip()
    if key:
        return key
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8-sig").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            name, value = stripped.split("=", 1)
            if name.strip() == "AGNES_API_KEY" and value.strip():
                return value.strip().strip('"').strip("'")
    raise SystemExit("Missing AGNES_API_KEY. Set it in the environment or C:\\Users\\C\\.codex\\agnes.env")


def validate_num_frames(num_frames: int) -> None:
    if num_frames > 441:
        raise SystemExit("num_frames must be <= 441")
    if (num_frames - 1) % 8 != 0:
        raise SystemExit("num_frames must match 8n + 1, for example 81, 121, 161, 241, or 441")


def request_json(method: str, url: str, api_key: str, payload: dict[str, Any] | None = None, timeout: int = 180) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Agnes API HTTP {error.code}: {detail}") from error
    except (urllib.error.URLError, TimeoutError, http.client.RemoteDisconnected) as error:
        raise SystemExit(f"Agnes API request failed: {error}") from error


def create_payload(args: argparse.Namespace) -> dict[str, Any]:
    validate_num_frames(args.num_frames)
    payload: dict[str, Any] = {
        "model": MODEL,
        "prompt": args.prompt,
        "num_frames": args.num_frames,
        "frame_rate": args.frame_rate,
    }
    if args.width:
        payload["width"] = args.width
    if args.height:
        payload["height"] = args.height
    if args.image:
        payload["image"] = args.image
    if args.extra_image:
        extra_body: dict[str, Any] = {"image": args.extra_image}
        if args.mode:
            extra_body["mode"] = args.mode
        payload["extra_body"] = extra_body
    return payload


def create_task(api_key: str, args: argparse.Namespace) -> dict[str, Any]:
    if not args.prompt:
        raise SystemExit("--prompt is required when creating a video task")
    payload = create_payload(args)
    return request_json("POST", CREATE_ENDPOINT, api_key, payload, args.timeout)


def query_video(api_key: str, video_id: str | None, task_id: str | None, timeout: int) -> dict[str, Any]:
    if video_id:
        query = urllib.parse.urlencode({"video_id": video_id, "model_name": MODEL})
        return request_json("GET", f"{QUERY_ENDPOINT}?{query}", api_key, timeout=timeout)
    if task_id:
        return request_json("GET", f"{CREATE_ENDPOINT}/{urllib.parse.quote(task_id)}", api_key, timeout=timeout)
    raise SystemExit("Provide --video-id or --task-id for query mode")


def poll_video(api_key: str, video_id: str | None, task_id: str | None, interval: int, timeout: int, max_wait: int) -> dict[str, Any]:
    deadline = time.time() + max_wait
    while True:
        result = query_video(api_key, video_id, task_id, timeout)
        status = str(result.get("status", "")).lower()
        progress = result.get("progress")
        print(f"status={status or 'unknown'} progress={progress}", flush=True)
        if status in TERMINAL_STATUSES:
            return result
        if time.time() >= deadline:
            print(json.dumps(result, ensure_ascii=False, indent=2))
            raise SystemExit("Timed out waiting for video task")
        time.sleep(interval)


def find_video_url(value: Any) -> str | None:
    if isinstance(value, dict):
        for key in ("video_url", "url", "remixed_from_video_id", "output_url", "download_url"):
            item = value.get(key)
            if isinstance(item, str) and item.startswith("http") and ".mp4" in item:
                return item
        for item in value.values():
            found = find_video_url(item)
            if found:
                return found
    elif isinstance(value, list):
        for item in value:
            found = find_video_url(item)
            if found:
                return found
    return None


def download_video(url: str, output_dir: Path, timeout: int) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(url.split("?", 1)[0]).suffix.lower() or ".mp4"
    if suffix != ".mp4":
        suffix = ".mp4"
    path = output_dir / f"agnes-video-{int(time.time())}{suffix}"
    with urllib.request.urlopen(url, timeout=timeout) as response:
        path.write_bytes(response.read())
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="Create, poll, and download Agnes Video V2.0 tasks.")
    parser.add_argument("--prompt", help="Video prompt for task creation.")
    parser.add_argument("--image", help="Single public image URL for image-to-video.")
    parser.add_argument("--extra-image", action="append", help="Reference image URL for multi-image or keyframe video.")
    parser.add_argument("--mode", choices=["keyframes"], help="extra_body.mode, usually keyframes.")
    parser.add_argument("--width", type=int, default=1152, help="Video width.")
    parser.add_argument("--height", type=int, default=768, help="Video height.")
    parser.add_argument("--num-frames", type=int, default=121, help="Frame count, must match 8n + 1 and be <= 441.")
    parser.add_argument("--frame-rate", type=int, default=24, help="Frame rate from 1 to 60.")
    parser.add_argument("--video-id", help="Existing video_id to query or poll.")
    parser.add_argument("--task-id", help="Existing task_id to query or poll.")
    parser.add_argument("--wait", action="store_true", help="Poll until the task reaches a terminal status.")
    parser.add_argument("--interval", type=int, default=5, help="Polling interval in seconds.")
    parser.add_argument("--max-wait", type=int, default=1800, help="Maximum wait time in seconds.")
    parser.add_argument("--timeout", type=int, default=180, help="HTTP timeout in seconds.")
    parser.add_argument("--output", default=str(Path.home() / "Videos" / "Agnes"), help="Output directory.")
    parser.add_argument("--raw", action="store_true", help="Print raw JSON and skip download.")
    args = parser.parse_args()

    api_key = load_api_key()
    if args.video_id or args.task_id:
        result = poll_video(api_key, args.video_id, args.task_id, args.interval, args.timeout, args.max_wait) if args.wait else query_video(api_key, args.video_id, args.task_id, args.timeout)
    else:
        created = create_task(api_key, args)
        print(json.dumps(created, ensure_ascii=False, indent=2), flush=True)
        video_id = created.get("video_id")
        task_id = created.get("task_id") or created.get("id")
        if not args.wait:
            return 0
        result = poll_video(api_key, video_id, task_id, args.interval, args.timeout, args.max_wait)

    if args.raw:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0

    video_url = find_video_url(result)
    if video_url:
        path = download_video(video_url, Path(args.output), args.timeout)
        print(str(path))
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        status = str(result.get("status", "")).lower()
        if status == "completed":
            raise SystemExit("Completed response did not include a downloadable video URL.")
    return 0


if __name__ == "__main__":
    sys.exit(main())



