---
description: ADB: Capture an Android screenshot and pull it into adb-artifacts
argument-hint: [output-name.png]
allowed-tools: [Bash(mkdir -p ./adb-artifacts*), Bash(adb shell screencap -p /sdcard/screen.png*), Bash(adb pull /sdcard/screen.png ./adb-artifacts/screen.png*), Read]
---

# ADB: Screenshot

Use this command when the user wants to capture an Android screenshot and pull it into adb-artifacts.

## Steps

1. Run `mkdir -p ./adb-artifacts && adb shell screencap -p /sdcard/screen.png && adb pull /sdcard/screen.png ./adb-artifacts/screen.png`.
2. Read or attach `./adb-artifacts/screen.png` if the current host supports image inspection.
3. Describe visible UI state and suggest next safe actions.

## Safety

- Screenshots may contain private data, notifications, tokens, or account details.
- Do not upload or share screenshots outside the local session unless the user asks.
