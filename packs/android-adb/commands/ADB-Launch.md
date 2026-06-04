---
description: ADB: Launch an installed Android app by package name
argument-hint: <package.name>
allowed-tools: [Bash(adb shell monkey*), Bash(adb shell pm list packages*), Bash(adb devices*)]
---

# ADB: Launch

Use this command when the user wants to launch an installed Android app by package name.

## Steps

1. Validate package names with `^[A-Za-z0-9_.]+$`.
2. If the package name is unknown, run `adb shell pm list packages`.
3. Run `adb shell monkey -p <package_name> -c android.intent.category.LAUNCHER 1`.
4. If launch fails, use `ADB: Packages` to inspect installed names.

## Safety

- Never interpolate an unvalidated package name into a shell command.
- If multiple devices are connected, ask which serial to target first.
