---
description: ADB: Disconnect one wireless Android device or all TCP/IP devices after confirmation
argument-hint: [ip:port]
allowed-tools: [Bash(adb disconnect*), Bash(adb devices*)]
---

# ADB: Disconnect

Use this command when the user wants to disconnect one wireless Android device or all TCP/IP devices after confirmation.

## Steps

1. If a target `<ip>:<port>` is provided, run `adb disconnect <ip>:<port>`.
2. If no target is provided, ask before running bare `adb disconnect`, because it disconnects all TCP/IP devices.
3. Run `adb devices -l` to show the final state.

## Safety

- Never run bare `adb disconnect` without explicit confirmation.
- Prefer targeted disconnects when multiple devices are connected.
