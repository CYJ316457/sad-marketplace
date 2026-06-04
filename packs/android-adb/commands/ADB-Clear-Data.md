---
description: ADB: Clear app data for a validated Android package after confirmation
argument-hint: <package.name>
allowed-tools: [Bash(adb shell pm clear*), Bash(adb shell pm list packages*), Bash(adb devices*)]
---

# ADB: Clear Data

Use this command when the user wants to clear all local data for an Android app package.

## Steps

1. Validate package names with `^[A-Za-z0-9_.]+$`.
2. If the package is unknown, run `adb shell pm list packages` first.
3. Explain that `adb shell pm clear <package_name>` removes app data, cache, login state, and local settings.
4. Ask for explicit confirmation before running.
5. Run `adb shell pm clear <package_name>` only after confirmation.

## Safety

- This is destructive: it can delete app-local data and sign the user out.
- Never run without explicit confirmation.
- Never interpolate an unvalidated package name into a shell command.
