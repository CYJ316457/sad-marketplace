---
description: ADB: Send a validated Android keyevent such as Back, Home, Enter, or Search
argument-hint: <keycode-or-name>
allowed-tools: [Bash(adb shell input keyevent*)]
---

# ADB: Keyevent

Use this command when the user wants to send a validated Android keyevent such as Back, Home, Enter, or Search.

## Steps

1. Map common names: Home `3`, Back `4`, Power `26`, Enter `66`, Search `84`, Recent apps `187`.
2. Validate the final keycode as an integer.
3. Run `adb shell input keyevent <keycode>`.
4. Explain the expected effect before Power or other disruptive events.

## Safety

- Validate keycodes as integers only.
- Confirm before Power, volume, lock, or other disruptive actions.
