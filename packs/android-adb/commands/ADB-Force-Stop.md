---
description: ADB: Force-stop a validated Android package after confirmation
argument-hint: <package.name>
allowed-tools: [Bash(adb shell am force-stop*), Bash(adb shell pm list packages*), Bash(adb devices*)]
---

# ADB: Force Stop

Use this command when the user wants to stop a running Android app by package name.

## Steps

1. Validate package names with `^[A-Za-z0-9_.]+$`.
2. If the package is unknown, run `adb shell pm list packages` first.
3. Explain that `adb shell am force-stop <package_name>` stops the app process and may interrupt active work.
4. Ask for confirmation if the app may be doing important work.
5. Run `adb shell am force-stop <package_name>`.

## Safety

- Do not force-stop apps without a validated package name.
- Confirm before stopping apps that may be recording, syncing, navigating, or processing payments.
- If multiple devices are connected, ask which serial to target first.
