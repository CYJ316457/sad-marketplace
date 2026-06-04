---
description: ADB: Tap validated Android screen coordinates
argument-hint: <x> <y>
allowed-tools: [Bash(adb shell input tap*)]
---

# ADB: Tap

Use this command when the user wants to tap validated Android screen coordinates.

## Steps

1. Validate `x` and `y` as integers.
2. If coordinates are missing, run or suggest `ADB: UI Dump` / `ADB: Screenshot` first.
3. Run `adb shell input tap <x> <y>` only after validation.
4. Recommend `ADB: Screenshot` to verify the result.

## Safety

- Do not guess coordinates for destructive actions.
- Prefer coordinates derived from UI bounds or screenshot analysis.
