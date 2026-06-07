---
description: Generate videos with Agnes Video V2.0 through the Agnes AI asynchronous video API
argument-hint: <video prompt or image-to-video request>
allowed-tools: [Bash(python *), Read, Glob]
---

Use this command when the user explicitly asks to generate a video with Agnes.

Steps:

1. Read the installed `agnes-video` skill instructions if they are not already active.
2. Decide whether the workflow is text-to-video, image-to-video, multi-image video, or keyframe animation.
3. Check for `AGNES_API_KEY` or an `agnes.env` file in the current project or host home directory.
4. Use the bundled script from the installed skill directory:

```powershell
python scripts/agnes_video.py --prompt "<prompt>" --width 1152 --height 768 --num-frames 121 --frame-rate 24 --wait --output .generated-videos/agnes
```

For image-to-video, add `--image <url>`. For multi-image or keyframes, add repeated `--extra-image <url>` and choose `--mode keyframes` when needed.

Return the final video path or current task status. If configuration is missing or the async task fails, report the actual error.
