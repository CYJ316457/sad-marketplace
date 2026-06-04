---
description: ADB: Push a local file to an explicit Android device path
argument-hint: <local-path> <device-path>
allowed-tools: [Bash(adb push*), Bash(adb devices*), Read, Glob]
---

# ADB: Push

Use this command when the user wants to copy a local file to a specific path on an Android device with adb push.

## Steps

1. Locate and verify the local file with `Glob` or the provided path.
2. Ask for the exact device destination path if missing.
3. Run `adb devices -l` if the target device is unclear.
4. Run `adb push <local_path> <device_path>` only after both paths are explicit.
5. Report the pushed file path and command result.

## Safety

- Do not push to system partitions or app-private directories unless the user confirms authorization and device state.
- Do not overwrite device files without confirmation.
- Never push secrets, credentials, or private keys unless explicitly requested and justified.
