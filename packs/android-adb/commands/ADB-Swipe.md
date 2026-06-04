---
description: ADB: Swipe between validated Android screen coordinates
argument-hint: <x1> <y1> <x2> <y2> [duration-ms]
allowed-tools: [Bash(adb shell input swipe*)]
---

# ADB: Swipe

Use this command when the user wants to swipe between validated Android screen coordinates.

## Steps

1. Validate all coordinates and duration as integers.
2. If dimensions are unknown, run `adb shell wm size` through `ADB: Shell`.
3. Run `adb shell input swipe <x1> <y1> <x2> <y2> <duration_ms>`.
4. Use `ADB: Screenshot` to verify the resulting UI state.

## Safety

- Do not guess gesture coordinates for destructive UI flows.
- Keep duration reasonable; avoid accidental long presses unless requested.
