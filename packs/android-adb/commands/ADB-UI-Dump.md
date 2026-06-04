---
description: ADB: Dump Android UI hierarchy and pull it into adb-artifacts
argument-hint: [output-name.xml]
allowed-tools: [Bash(mkdir -p ./adb-artifacts*), Bash(adb shell uiautomator dump*), Bash(adb pull /sdcard/view.xml ./adb-artifacts/view.xml*), Read, Grep]
---

# ADB: UI Dump

Use this command when the user wants to dump Android UI hierarchy and pull it into adb-artifacts.

## Steps

1. Run `mkdir -p ./adb-artifacts && adb shell uiautomator dump /sdcard/view.xml && adb pull /sdcard/view.xml ./adb-artifacts/view.xml`.
2. Read `./adb-artifacts/view.xml`.
3. Search text, content descriptions, or resource IDs.
4. Extract `bounds="[x1,y1][x2,y2]"` and calculate center coordinates.

## Safety

- Pull only into `./adb-artifacts/`.
- UI dumps can contain sensitive visible text; summarize only what is needed.
