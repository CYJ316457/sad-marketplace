#!/usr/bin/env python3
import argparse
import base64
import json
import os
from datetime import datetime
from pathlib import Path
from urllib import error, request


OUTPUT_DIR = Path(".generated-images") / "gpt-image-2"
ENV_FILE = ".gpt-image-2.env"
ENV_TEMPLATE = """OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_IMAGE_MODEL=gpt-image-2
"""


def parse_args():
    parser = argparse.ArgumentParser(description="Generate images with gpt-image-2 into a project-local folder.")
    parser.add_argument("--project", required=True, help="Project root directory.")
    parser.add_argument("--prompt", required=True, help="Image generation prompt.")
    parser.add_argument("--size", default="1024x1024", help="Image size. Default: 1024x1024")
    return parser.parse_args()


def load_env_file(path: Path):
    values = {}
    if not path.exists():
        path.write_text(ENV_TEMPLATE, encoding="utf-8")
        print(f"Created config template: {path}")
        print("Edit the file with your base URL and API key, then rerun the command.")
        return None

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def require_config(config: dict, key: str) -> str:
    value = config.get(key) or os.environ.get(key)
    if not value:
        raise SystemExit(f"Missing required config: {key}")
    return value


def output_path(project: Path, override: str | None) -> Path:
    return (project / OUTPUT_DIR).resolve()


def stream_image_response(base_url: str, api_key: str, model: str, prompt: str, size: str):
    endpoint = f"{base_url.rstrip('/')}/images/generations"
    payload = {
        "model": model,
        "prompt": prompt,
        "size": size,
        "stream": True,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
    }

    req = request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=300) as resp:
            final_b64 = None
            for raw in resp:
                line = raw.decode("utf-8", errors="ignore").strip()
                if not line or not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    event = json.loads(data)
                except json.JSONDecodeError:
                    continue

                if isinstance(event, dict):
                    image_b64 = extract_image_b64(event)
                    if image_b64:
                        final_b64 = image_b64

            if not final_b64:
                raise SystemExit("No image data received from streaming response.")
            return base64.b64decode(final_b64)
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        raise SystemExit(f"HTTP {exc.code}: {body}") from exc
    except error.URLError as exc:
        raise SystemExit(f"Request failed: {exc}") from exc


def extract_image_b64(event: dict):
    if isinstance(event.get("data"), list):
        for item in event["data"]:
            if isinstance(item, dict):
                if item.get("b64_json"):
                    return item["b64_json"]
                if item.get("image_base64"):
                    return item["image_base64"]
    if event.get("b64_json"):
        return event["b64_json"]
    if event.get("image_base64"):
        return event["image_base64"]
    if event.get("type") == "image_generation.completed":
        payload = event.get("result") or {}
        if isinstance(payload, dict):
            if payload.get("b64_json"):
                return payload["b64_json"]
            if isinstance(payload.get("data"), list):
                for item in payload["data"]:
                    if isinstance(item, dict) and item.get("b64_json"):
                        return item["b64_json"]
    return None


def main():
    args = parse_args()
    project = Path(args.project).expanduser().resolve()
    if not project.exists():
        raise SystemExit(f"Project path does not exist: {project}")

    config = load_env_file(project / ENV_FILE)
    if config is None:
        return
    base_url = require_config(config, "OPENAI_BASE_URL")
    api_key = require_config(config, "OPENAI_API_KEY")
    model = config.get("OPENAI_IMAGE_MODEL", "gpt-image-2")

    image_bytes = stream_image_response(base_url, api_key, model, args.prompt, args.size)

    out_dir = output_path(project, None)
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"gpt-image-2-{datetime.now().strftime('%Y%m%d-%H%M%S')}.png"
    target = out_dir / filename
    target.write_bytes(image_bytes)
    print(target)


if __name__ == "__main__":
    main()
