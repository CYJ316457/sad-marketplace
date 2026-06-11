---
name: android-build
description: Build Android project debug APK and install/run on ADB-connected device. Handles Gradle version differences (wrapper, AGP, configuration cache) and multi-module projects. Use when the user wants to compile, package, install, or launch an Android app from source.
metadata:
  short-description: Build, install, and run Android APK via Gradle + ADB
---

# Android Build & Run

Build a debug APK from an Android project and push it to a connected device.

## Quick start

```bash
python scripts/build-and-run.py --project <path>
```

The script auto-detects Gradle wrapper version, AGP version, module structure, and chooses compatible flags.

## Manual workflow (if script unavailable)

### 1. Detect Gradle environment

Check `gradle/wrapper/gradle-wrapper.properties` for `distributionUrl`:

| Distribution URL pattern | Gradle version | Key difference |
|---|---|---|
| `gradle-2.x` ~ `gradle-3.x` | 2–3 | `compile` config, no `implementation` |
| `gradle-4.x` ~ `gradle-5.x` | 4–5 | `implementation`, Build Cache optional |
| `gradle-6.x` ~ `gradle-7.x` | 6–7 | Configuration cache (`--configuration-cache`) |
| `gradle-8.x` | 8+ | Namespace in `build.gradle(.kts)`, JDK 17 required |

Check `build.gradle(.kts)` for AGP:

```groovy
// build.gradle — classpath
dependencies { classpath 'com.android.tools.build:gradle:X.Y.Z' }
```

| AGP | Requires Gradle ≥ | Requires JDK |
|---|---|---|
| ≤ 3.x | 4.1 | 8 |
| 4.x | 6.1.1 | 8 |
| 7.x | 7.0 | 11 |
| 8.x | 8.0 | 17 |

### 2. Build

```bash
# Windows (use gradlew.bat)
.\gradlew.bat assembleDebug

# Linux/Mac
./gradlew assembleDebug
```

If no wrapper exists, install one first or use system Gradle. Multi-module projects: find the app module in `settings.gradle` then run `<module>:assembleDebug`.

**Troubleshooting build failures:**

- **"Could not resolve all files"**: Run with `--refresh-dependencies`
- **"Compilation error" / JDK mismatch**: Check `JAVA_HOME` and AGP→JDK table above
- **"Namespace not specified"** (AGP 8+): Add `namespace 'com.example.app'` to module `build.gradle`
- **Configuration cache issues** (Gradle 6+): Add `--no-configuration-cache` to skip it
- **"compile" vs "implementation"** (Gradle < 4): Convert `implementation`/`api` back to `compile` if stuck on ancient toolchain

### 3. Find the APK

Common paths in order:
- `app/build/outputs/apk/debug/app-debug.apk`
- `**/build/outputs/apk/debug/*-debug.apk`
- `**/build/outputs/apk/**/*.apk` (any)

### 4. Install to device

```bash
adb devices                # verify device connected
adb install -r <apk>       # install/update
adb install -t <apk>       # for test-only APKs
```

If multiple devices: `adb -s <serial> install -r <apk>`.

### 5. Launch the app

Get package name from `AndroidManifest.xml` (`package=` attribute) or `build.gradle` (`applicationId`), then:

```bash
adb shell monkey -p <package> -c android.intent.category.LAUNCHER 1
```

## Script reference

`scripts/build-and-run.py` automates all five steps above.

```bash
python scripts/build-and-run.py --project <path>          # full pipeline
python scripts/build-and-run.py --project <path> --only build  # build only
python scripts/build-and-run.py --project <path> --only install  # install latest APK
python scripts/build-and-run.py --project <path> --device <serial>  # specific device
python scripts/build-and-run.py --project <path> --no-launch  # skip launch
```

The script emits a JSON summary on stdout (for programmatic use) and human-readable progress on stderr.
