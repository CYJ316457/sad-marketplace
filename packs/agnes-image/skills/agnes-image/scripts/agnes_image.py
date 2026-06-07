#!/usr/bin/env python3
import argparse
import base64
import json
import mimetypes
import os
import sys
import time
import urllib.request
from pathlib import Path


ENDPOINT = "https://apihub.agnes-ai.com/v1/images/generations"
MODEL = "agnes-image-2.1-flash"
ENV_FILE = Path.home() / ".codex" / "agnes.env"


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


def make_payload(args: argparse.Namespace) -> dict:
    payload = {
        "model": MODEL,
        "prompt": args.prompt,
        "size": args.size,
    }
    if args.image:
        payload["image"] = args.image
        payload["extra_body"] = {"response_format": args.format}
    elif args.format == "b64_json":
        payload["return_base64"] = True
    else:
        payload["extra_body"] = {"response_format": "url"}
    return payload


def request_image(api_key: str, payload: dict, timeout: int) -> dict:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        ENDPOINT,
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Agnes API HTTP {error.code}: {detail}") from error


def extension_from_url(url: str) -> str:
    suffix = Path(url.split("?", 1)[0]).suffix.lower()
    return suffix if suffix in {".png", ".jpg", ".jpeg", ".webp"} else ".png"


def save_url(url: str, output_dir: Path, stem: str, timeout: int) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / f"{stem}{extension_from_url(url)}"
    with urllib.request.urlopen(url, timeout=timeout) as response:
        path.write_bytes(response.read())
    return path


def save_base64(data: str, output_dir: Path, stem: str) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    media_type = "image/png"
    payload = data
    if data.startswith("data:") and ";base64," in data:
        header, payload = data.split(",", 1)
        media_type = header[5:].split(";", 1)[0] or media_type
    ext = mimetypes.guess_extension(media_type) or ".png"
    path = output_dir / f"{stem}{ext}"
    path.write_bytes(base64.b64decode(payload))
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate images with Agnes Image 2.1 Flash.")
    parser.add_argument("--prompt", required=True, help="Image prompt.")
    parser.add_argument("--size", default="1024x768", help="Image size, for example 1024x768.")
    parser.add_argument("--image", action="append", help="Input image URL or Data URI Base64 for image-to-image.")
    parser.add_argument("--format", choices=["url", "b64_json"], default="url", help="Output format.")
    parser.add_argument("--output", default=str(Path.home() / "Pictures" / "Agnes"), help="Output directory.")
    parser.add_argument("--timeout", type=int, default=180, help="HTTP timeout in seconds.")
    parser.add_argument("--raw", action="store_true", help="Print raw JSON and skip downloading URL outputs.")
    args = parser.parse_args()

    api_key = load_api_key()
    payload = make_payload(args)
    result = request_image(api_key, payload, args.timeout)
    data = result.get("data") or []
    if not data:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        raise SystemExit("Agnes API response did not include data.")

    if args.raw:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0

    output_dir = Path(args.output)
    stem = f"agnes-{int(time.time())}"
    first = data[0]
    if first.get("url"):
        path = save_url(first["url"], output_dir, stem, args.timeout)
        print(str(path))
    elif first.get("b64_json"):
        path = save_base64(first["b64_json"], output_dir, stem)
        print(str(path))
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        raise SystemExit("Agnes API response did not include url or b64_json.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

