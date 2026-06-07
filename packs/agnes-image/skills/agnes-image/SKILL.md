---
name: agnes-image
description: Generate or edit images with Agnes Image 2.1 Flash through the Agnes AI OpenAI-compatible image generation API. Use when the user asks to create images with Agnes, configure an Agnes API key, produce text-to-image or image-to-image requests, save URL or Base64 outputs, or troubleshoot Agnes image generation parameters.
---

# Agnes Image

Use Agnes Image 2.1 Flash for text-to-image and image-to-image generation through the Agnes AI API. This marketplace copy supports Codex, Claude Code, CodeBuddy, and OpenCode.

## Source

Primary docs: https://agnes-ai.com/doc/agnes-image-21-flash

When exact request details matter, read [API reference](references/api.md). When the user asks how to configure the API key, read [key configuration](references/key-config.md).

## Quick Workflow

1. Confirm whether the request is text-to-image or image-to-image.
2. Load the key from `AGNES_API_KEY`, or from an `agnes.env` file in the current project or host home directory if present.
3. Use model `agnes-image-2.1-flash` and endpoint `https://apihub.agnes-ai.com/v1/images/generations`.
4. Put `response_format` inside `extra_body`, never at the request body top level.
5. Save generated images to a user-visible path, defaulting to the current workspace or the user pictures directory when no project path is obvious.

## Script

Prefer the bundled script for real generation:

```powershell
python scripts/agnes_image.py --prompt "A luminous floating city above a misty canyon" --size 1024x768 --output .generated-images/agnes
```

For image-to-image, pass one or more image URLs or Data URI Base64 strings:

```powershell
python scripts/agnes_image.py --prompt "Make the object matte black while preserving composition" --image "https://example.com/input.png" --format url
```

## Platform notes
- Run script commands from the installed `agnes-image` skill directory, or pass the absolute path to `scripts/agnes_image.py`.
- Codex, Claude Code, CodeBuddy, and OpenCode all use the same bundled script and references.
- Prefer `AGNES_API_KEY` for portable configuration; avoid hard-coded machine-specific key files in marketplace docs.

## Prompting

For text-to-image prompts, prefer: subject + scene/environment + style + lighting + composition + quality requirements.

For image-to-image prompts, explicitly state what to change and what to preserve.

## Pitfalls

- Text-to-image requires `model`, `prompt`, and `size`.
- Image-to-image requires top-level `image` array.
- Image inputs can be public HTTPS URLs or Data URI Base64.
- URL output uses `extra_body.response_format: "url"`.
- Text-to-image Base64 output can use top-level `return_base64: true`.
- Image-to-image Base64 output uses `extra_body.response_format: "b64_json"`.
- Do not send `tags: ["img2img"]`.
- Do not expose real API keys in generated docs, logs, or final answers.
