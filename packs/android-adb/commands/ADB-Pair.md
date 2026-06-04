---
description: ADB: Pair an Android 11+ wireless debugging device
argument-hint: <ip>:<pairing-port> <pairing-code>
allowed-tools: [Bash(adb pair*), Bash(adb devices*)]
---

# ADB: Pair

Use this command when the user wants to pair an Android 11+ wireless debugging device.

## Steps

1. Ask for the IP, pairing port, and pairing code shown in Android's pairing dialog if missing.
2. Validate the target shape as `<ip>:<pairing_port>`.
3. Run `adb pair <ip>:<pairing_port> <pairing_code>`.
4. After pairing, use `ADB: Connect` with the connection port and verify with `adb devices -l`.

## Safety

- Treat pairing codes as sensitive one-time data.
- Do not confuse pairing ports with connection ports.
- Do not guess pairing codes or ports.
