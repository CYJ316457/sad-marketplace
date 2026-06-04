---
description: ADB: Run safe read-only Android shell diagnostics
argument-hint: [diagnostic]
allowed-tools: [Bash(adb shell wm*), Bash(adb shell getprop*), Bash(adb shell dumpsys window*), Bash(adb shell dumpsys battery*), Bash(adb devices*)]
---

# ADB: Shell

Use this command when the user wants to run safe read-only Android shell diagnostics.

## Steps

1. Use a narrow read-only diagnostic such as `adb shell wm size`, `adb shell wm density`, `adb shell getprop ro.build.version.release`, `adb shell dumpsys window`, or `adb shell dumpsys battery`.
2. Run `adb devices -l` first if the target device is unclear.
3. Summarize relevant values instead of dumping long output unfiltered.

## Safety

- Keep this workflow read-only.
- Do not pass arbitrary user text to `adb shell` from this command.
