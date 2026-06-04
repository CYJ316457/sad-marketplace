---
description: ADB: Pull a known device artifact into the local adb-artifacts directory
argument-hint: <device-path> [local-name]
allowed-tools: [Bash(mkdir -p ./adb-artifacts*), Bash(adb pull*)]
---

# ADB: Pull

Use this command when the user wants to pull a known device artifact into the local adb-artifacts directory.

## Steps

1. Confirm the exact device path to pull.
2. Create the artifact directory with `mkdir -p ./adb-artifacts`.
3. Pull to a destination under `./adb-artifacts/`, for example `adb pull <device_path> ./adb-artifacts/<local_name>`.
4. Report the local path and file size if available.

## Safety

- Destination must stay under `./adb-artifacts/`.
- Do not pull broad directories such as `/sdcard/` without explicit confirmation.
- Pulled files may contain private data; read or summarize only what is necessary.
