---
description: ADB: Record the Android screen and pull the video into adb-artifacts
argument-hint: [duration-seconds]
allowed-tools: [Bash(mkdir -p ./adb-artifacts*), Bash(adb shell screenrecord*), Bash(adb pull /sdcard/screenrecord.mp4 ./adb-artifacts/screenrecord.mp4*), Bash(adb shell rm /sdcard/screenrecord.mp4*)]
---

# ADB: Screenrecord

Use this command when the user wants to record Android screen activity for debugging or demonstration.

## Steps

1. Ask for duration if not specified, and keep it short.
2. Run `mkdir -p ./adb-artifacts`.
3. Run `adb shell screenrecord --time-limit <seconds> /sdcard/screenrecord.mp4`.
4. Pull the result with `adb pull /sdcard/screenrecord.mp4 ./adb-artifacts/screenrecord.mp4`.
5. Optionally remove the device copy with `adb shell rm /sdcard/screenrecord.mp4` after confirming the pull succeeded.

## Safety

- Screen recordings may contain private notifications, accounts, or credentials.
- Use a bounded `--time-limit`; do not record indefinitely.
- Store recordings only under `./adb-artifacts/`.
