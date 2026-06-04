---
description: ADB: Enter sanitized text into the focused Android input field
argument-hint: <text>
allowed-tools: [Bash(adb shell input text*)]
---

# ADB: Text

Use this command when the user wants to enter sanitized text into the focused Android input field.

## Steps

1. Do not paste raw user text into a shell command.
2. For scripts, prefer `execFile("adb", ["shell", "input", "text", sanitizedText])`.
3. For one-off shell use, validate and shell-escape text first, then use `adb shell input text <escaped_text>`.
4. Replace spaces with `%s` or `%\s` only after sanitization.
5. Verify focus is in the intended field before typing.

## Safety

- Treat text as untrusted input; shell metacharacters, quotes, `$()`, and backticks must not reach the host shell unescaped.
- Do not type passwords, tokens, recovery codes, or private messages unless explicitly confirmed.
