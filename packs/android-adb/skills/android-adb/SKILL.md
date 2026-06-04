---
name: android-adb
description: Control Android devices via ADB with support for UI layout analysis (uiautomator) and visual feedback (screencap). Use when you need to interact with Android apps, perform UI automation, take screenshots, or run complex ADB command sequences.
---

# Android Automation

Control and automate Android devices using ADB, uiautomator, and screencap.

## Connecting Devices

### USB Connection
1. Enable **Developer Options** and **USB Debugging** on the device.
2. Connect via USB and verify with `adb devices`.

### Wireless Connection (Android 11+)
1. Enable **Wireless Debugging** in Developer Options.
2. **Pairing**: Find the IP, port, and pairing code in the "Pair device with pairing code" popup.
   `adb pair <ip>:<pairing_port> <pairing_code>`
3. **Connecting**: Use the IP and port shown on the main Wireless Debugging screen.
   `adb connect <ip>:<connection_port>`
4. Verify with `adb devices`.

## Command Safety

Treat all package names, text, coordinates, and file paths as untrusted input before inserting them into shell commands.

- Validate package names with a strict pattern such as `^[A-Za-z0-9_.]+$` before using them in `adb shell monkey`.
- Validate tap/swipe coordinates, durations, and keycodes as integers only.
- Do not paste arbitrary user text into `adb shell input text` without shell-safe escaping. Double quotes do not prevent host-shell expansion of `$()`, backticks, quotes, or other metacharacters.
- Prefer argument-array APIs such as `execFile` when scripting ADB commands. If a shell is required, apply platform-appropriate escaping.
- Write pulled artifacts to a dedicated directory such as `./adb-artifacts/` to avoid overwriting project files.

## Explicit Commands

Windows does not allow `:` in command filenames, so ADB command files use Windows-safe names while preserving user-facing titles:

- `ADB-Devices` — ADB: Devices
- `ADB-Pair` — ADB: Pair
- `ADB-Connect` — ADB: Connect
- `ADB-Disconnect` — ADB: Disconnect
- `ADB-Shell` — ADB: Shell
- `ADB-Install` — ADB: Install
- `ADB-Launch` — ADB: Launch
- `ADB-Packages` — ADB: Packages
- `ADB-UI-Dump` — ADB: UI Dump
- `ADB-Screenshot` — ADB: Screenshot
- `ADB-Tap` — ADB: Tap
- `ADB-Text` — ADB: Text
- `ADB-Keyevent` — ADB: Keyevent
- `ADB-Swipe` — ADB: Swipe
- `ADB-Pull` — ADB: Pull
- `ADB-Logcat` — ADB: Logcat
- `ADB-Screenrecord` — ADB: Screenrecord
- `ADB-Push` — ADB: Push
- `ADB-Clear-Data` — ADB: Clear Data
- `ADB-Force-Stop` — ADB: Force Stop

## Common Workflows

### Launching an App
Use the monkey tool to launch apps by package name:
`adb shell monkey -p <package_name> -c android.intent.category.LAUNCHER 1`

### Analyzing the UI
Dump and pull the UI hierarchy to find coordinates:
`mkdir -p ./adb-artifacts && adb shell uiautomator dump /sdcard/view.xml && adb pull /sdcard/view.xml ./adb-artifacts/view.xml`

Then grep for text or resource IDs to find `bounds="[x1,y1][x2,y2]"`.

### Interacting with Elements
- **Tap**: `adb shell input tap <x> <y>`
- **Text**: Do not pass raw user text through a shell. When scripting, prefer an argument-array API such as `execFile("adb", ["shell", "input", "text", sanitizedText])`. For one-off shell use, validate and shell-escape the text first, then pass the escaped value to `adb shell input text <escaped_text>` (use `%\s` for spaces where required by the target environment).
- **Keyevent**: `adb shell input keyevent <keycode>` (Home: 3, Back: 4, Power: 26, Search: 84, Enter: 66)
- **Swipe**: `adb shell input swipe <x1> <y1> <x2> <y2> <duration_ms>`

### Visual Verification
Take a screenshot to verify the state:
`mkdir -p ./adb-artifacts && adb shell screencap -p /sdcard/screen.png && adb pull /sdcard/screen.png ./adb-artifacts/screen.png`

## Tips
- **Search**: Use `input keyevent 84` to trigger search in many apps.
- **Wait**: Use `sleep <seconds>` between commands to allow the UI to update.
- **Coordinates**: Calculate the center of `[x1,y1][x2,y2]` for reliable taps.
