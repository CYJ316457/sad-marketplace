---
description: ADB: Install a local APK onto an authorized Android device
argument-hint: <path-to.apk> [--replace] [--grant] [--downgrade]
allowed-tools: [Bash(adb install*), Bash(adb devices*), Read, Glob]
---

# ADB: Install

Use this command when the user wants to install a local APK onto an authorized Android device.

## Steps

1. Locate the APK path with `Glob` or the provided argument.
2. Confirm the file is local and ends with `.apk`.
3. Run `adb devices -l` if the target device is unclear.
4. Run `adb install <apk_path>`; add `-r`, `-g`, or `-d` only when explicitly requested.
5. Report the exact install result and package manager error, if any.

## Safety

- Do not download APKs or install from untrusted remote URLs.
- Confirm before reinstalling, downgrading, or granting permissions.
