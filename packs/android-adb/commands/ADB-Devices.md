---
description: ADB: List connected Android devices and explain authorization state
argument-hint: [adb devices args]
allowed-tools: [Bash(adb devices*), Bash(adb start-server*), Bash(adb kill-server*)]
---

# ADB: Devices

Use this command when the user wants to list connected Android devices and explain authorization state.

## Steps

1. Run `adb devices -l`.
2. If the server is stale, run `adb start-server` and then `adb devices -l` again.
3. Explain `device`, `unauthorized`, `offline`, and missing permission states.
4. If multiple devices are connected, ask which serial to target before follow-up commands.

## Safety

- Only inspect device connection state.
- Do not reset, install, uninstall, wipe, or change settings from this command.
