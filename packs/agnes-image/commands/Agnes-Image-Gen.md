---
description: Generate or edit images with Agnes Image 2.1 Flash through the Agnes AI API
argument-hint: <prompt or image edit request>
allowed-tools: [Bash(python *), Read, Glob]
---

Use this command when the user explicitly asks to generate or edit an image with Agnes.

Steps:

1. Read the installed `agnes-image` skill instructions if they are not already active.
2. Decide whether the request is text-to-image or image-to-image.
3. Check for `AGNES_API_KEY` or an `agnes.env` file in the current project or host home directory.
4. Use the bundled script from the installed skill directory:

```powershell
python scripts/agnes_image.py --prompt "<prompt>" --size 1024x768 --output .generated-images/agnes
```

For image-to-image, add one or more `--image` values using public HTTPS URLs or Data URI Base64 strings.

Return the saved image path. If configuration is missing, tell the user exactly which key or env file is needed and do not pretend generation succeeded.
