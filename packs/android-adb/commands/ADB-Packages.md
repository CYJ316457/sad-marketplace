---
description: ADB: List, filter, and inspect installed Android packages
argument-hint: [filter-or-package]
allowed-tools: [Bash(adb shell pm list packages*), Bash(adb shell pm path*), Bash(adb devices*)]
---

# ADB: Packages

Use this command when the user wants to list, filter, and inspect installed Android packages.

## Steps

1. Run `adb shell pm list packages`, `adb shell pm list packages -3`, or `adb shell pm list packages -s`.
2. For a specific package, validate it with `^[A-Za-z0-9_.]+$` and run `adb shell pm path <package_name>`.
3. Summarize matching package names clearly.

## Safety

- Validate package names before `pm path`.
- Do not uninstall, clear data, or force-stop apps from this command.
