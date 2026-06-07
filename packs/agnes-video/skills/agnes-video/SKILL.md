---
name: agnes-video
description: Generate videos with Agnes Video V2.0 through the Agnes AI asynchronous video API. Use when the user asks to create text-to-video, image-to-video, multi-image video, keyframe animation, poll Agnes video task status, download Agnes generated videos, or configure/reuse an Agnes API key.
---

# Agnes Video

Use Agnes Video V2.0 for text-to-video, image-to-video, multi-image video, and keyframe animation through the Agnes AI API. This marketplace copy supports Codex, Claude Code, CodeBuddy, and OpenCode.

## Source

Primary docs: https://agnes-ai.com/doc/agnes-video-v20

When exact request details matter, read [API reference](references/api.md). This skill reuses the same key configuration as `agnes-image`; when the user asks about keys, read [key configuration](references/key-config.md).

## Quick Workflow

1. Decide the workflow: text-to-video, image-to-video, multi-image video, or keyframe animation.
2. Load the key from `AGNES_API_KEY`, or from an `agnes.env` file in the current project or host home directory if present.
3. Create an async task with model `agnes-video-v2.0` at `https://apihub.agnes-ai.com/v1/videos`.
4. Poll the returned `video_id` at `https://apihub.agnes-ai.com/agnesapi?video_id=<VIDEO_ID>` every 5 seconds unless the user asks otherwise.
5. Download the final video URL when status is `completed`, defaulting to the current workspace or the user videos directory when no project path is obvious.

## Script

Prefer the bundled script for real generation:

```powershell
python scripts/agnes_video.py --prompt "A cinematic shot of autumn leaves drifting across a quiet forest path" --width 1152 --height 768 --num-frames 121 --frame-rate 24 --wait --output .generated-videos/agnes
```

Image-to-video:

```powershell
python scripts/agnes_video.py --prompt "Animate the leaves moving gently in the wind while preserving the original composition" --image "https://example.com/image.png" --wait
```

Multi-image or keyframes:

```powershell
python scripts/agnes_video.py --prompt "Create a smooth cinematic transition between the keyframes" --extra-image "https://example.com/keyframe1.png" --extra-image "https://example.com/keyframe2.png" --mode keyframes --wait
```

Poll an existing task:

```powershell
python scripts/agnes_video.py --video-id video_xxxxxx --wait
```

## Platform notes
- Run script commands from the installed `agnes-video` skill directory, or pass the absolute path to `scripts/agnes_video.py`.
- Codex, Claude Code, CodeBuddy, and OpenCode all use the same bundled script and references.
- Prefer `AGNES_API_KEY` for portable configuration; avoid hard-coded machine-specific key files in marketplace docs.

## Prompting

Text-to-video prompts should include: subject + action + scene + camera movement + lighting + visual style.

Image-to-video prompts should describe what moves and what remains stable.

Multi-image and keyframe prompts should describe the relationship between inputs and the transition style.

## Pitfalls

- Video generation is asynchronous.
- Create task responses include both `task_id` and `video_id`; prefer `video_id` for polling.
- Text-to-video only requires `model` and `prompt`, but size and timing parameters are usually useful.
- Image-to-video uses top-level `image` with one public image URL.
- Multi-image video uses `extra_body.image` with multiple public image URLs.
- Keyframe animation uses `extra_body.image` plus `extra_body.mode: "keyframes"`.
- `num_frames` must be `<= 441` and match `8n + 1`, for example `81`, `121`, `161`, `241`, or `441`.
- `frame_rate` supports `1` to `60`.
- Video URLs are only available when status is `completed`.
- Do not expose real API keys in generated docs, logs, or final answers.
