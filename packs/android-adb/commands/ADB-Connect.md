---
description: ADB: Connect to a wireless Android device over TCP/IP
argument-hint: <ip>:<connection-port>
allowed-tools: [Bash(adb connect*), Bash(adb devices*)]
---

# ADB: Connect

Use this command when the user wants to connect to a wireless Android device over TCP/IP.

## Steps

1. Ask for `<ip>:<connection_port>` if not provided.
2. Validate the address shape before running.
3. Run `adb connect <ip>:<connection_port>`.
4. Run `adb devices -l` and confirm the device appears as `device`.

## Safety

- Only connect to devices the user owns or is authorized to test.
- Do not scan local networks for devices.
