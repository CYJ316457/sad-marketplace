---
description: ADB: Capture Android logcat output into adb-artifacts
argument-hint: [filter-or-duration]
allowed-tools: [Bash(mkdir -p ./adb-artifacts*), Bash(adb logcat*), Bash(adb devices*)]
---

# ADB: Logcat

Use this command when the user wants to capture Android logs with adb logcat for debugging an app or device behavior.

## Steps

1. Run `adb devices -l` if the target device is unclear.
2. Create the artifact directory with `mkdir -p ./adb-artifacts`.
3. Prefer bounded captures, for example `adb logcat -d > ./adb-artifacts/logcat.txt` for current buffered logs.
4. If live streaming is requested, explain how long it will run and stop once enough evidence is collected.
5. Summarize relevant errors, package names, and stack traces without dumping huge logs verbatim.

## Safety

- Logs can contain tokens, account identifiers, URLs, and private text.
- Store logs only under `./adb-artifacts/`.
- Do not run unbounded live log collection without a clear stop condition.
