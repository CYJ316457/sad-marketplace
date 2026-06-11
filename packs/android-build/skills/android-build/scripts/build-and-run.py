#!/usr/bin/env python3
"""Build Android debug APK and install/run via ADB — Gradle-version-aware."""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path


# ── helpers ──────────────────────────────────────────────────────────────────

def log(msg: str) -> None:
    print(f"[android-build] {msg}", file=sys.stderr)


def fail(msg: str, code: int = 1) -> None:
    print(f"[android-build] ERROR: {msg}", file=sys.stderr)
    sys.exit(code)


def run(cmd: list[str], cwd: str | None = None, check: bool = True) -> subprocess.CompletedProcess:
    log(f"  $ {' '.join(cmd)}")
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, check=check)


def find_first(base: Path, *globs: str) -> Path | None:
    for g in globs:
        hits = sorted(base.glob(g))
        if hits:
            return hits[0]
    return None


# ── detection ────────────────────────────────────────────────────────────────

def detect_gradle_version(project: Path) -> tuple[int, int] | None:
    """Parse gradle-wrapper.properties to extract Gradle major.minor."""
    wrapper_props = project / "gradle" / "wrapper" / "gradle-wrapper.properties"
    if not wrapper_props.exists():
        return None
    text = wrapper_props.read_text(encoding="utf-8")
    m = re.search(r"distributionUrl=.*gradle-(\d+)\.(\d+)", text)
    if m:
        return int(m.group(1)), int(m.group(2))
    return None


def detect_agp_version(project: Path) -> tuple[int, int, int] | None:
    """Look inside build.gradle(.kts) for AGP classpath."""
    for name in ("build.gradle", "build.gradle.kts"):
        f = project / name
        if f.exists():
            text = f.read_text(encoding="utf-8", errors="ignore")
            m = re.search(r"com\.android\.tools\.build:gradle:(\d+)\.(\d+)\.(\d+)", text)
            if m:
                return int(m.group(1)), int(m.group(2)), int(m.group(3))
    return None


def find_app_module(project: Path) -> str | None:
    """Heuristic: first ':app' line in settings.gradle, else 'app'."""
    settings = project / "settings.gradle"
    if not settings.exists():
        settings = project / "settings.gradle.kts"
    if not settings.exists():
        return None
    text = settings.read_text(encoding="utf-8", errors="ignore")
    m = re.search(r"['\"]:app['\"]", text)
    if m:
        return "app"
    # any other module?
    m = re.search(r"""include\s*['\"](?:\:)?(\w[\w.-]*)['\"]""", text)
    if m:
        return m.group(1)
    return None


def find_package_name(project: Path, module: str | None) -> str | None:
    """Read applicationId from build.gradle or package from AndroidManifest."""
    candidates: list[Path] = []
    if module:
        candidates.append(project / module / "build.gradle")
        candidates.append(project / module / "build.gradle.kts")
        candidates.append(project / module / "src" / "main" / "AndroidManifest.xml")
    candidates.append(project / "app" / "build.gradle")
    candidates.append(project / "app" / "build.gradle.kts")
    candidates.append(project / "app" / "src" / "main" / "AndroidManifest.xml")

    for f in candidates:
        if f.exists():
            text = f.read_text(encoding="utf-8", errors="ignore")
            # build.gradle: applicationId "com.example.app" or applicationId = "com.example.app"
            m = re.search(r"""applicationId\s*[= ]\s*['"]([^'"]+)['"]""", text)
            if m:
                return m.group(1)
            # AndroidManifest.xml: package="com.example.app"
            m = re.search(r"""package\s*=\s*['"]([^'"]+)['"]""", text)
            if m:
                return m.group(1)
    return None


def gradlew_cmd(project: Path) -> list[str]:
    """Return the platform-appropriate gradle wrapper command."""
    if os.name == "nt":
        bat = project / "gradlew.bat"
        return [str(bat)] if bat.exists() else ["gradle"]
    sh = project / "gradlew"
    return [str(sh)] if sh.exists() else ["gradle"]


# ── build ────────────────────────────────────────────────────────────────────

def build_apk(project: Path, module: str | None, gv: tuple[int, int] | None) -> Path:
    """Run assembleDebug and return path to the output APK."""
    gradle = gradlew_cmd(project)
    task = f"{module}:assembleDebug" if module else "assembleDebug"

    cmd = [*gradle, task]
    if gv and gv >= (6, 1):
        cmd.append("--no-daemon")   # avoid lingering daemon

    log(f"Building: {task}")
    log(f"  Gradle version: {'.'.join(map(str, gv)) if gv else 'unknown'}")
    cp = run(cmd, cwd=str(project), check=False)
    if cp.returncode != 0:
        log("Build failed. Captured output:")
        sys.stderr.write(cp.stdout[-2000:] if len(cp.stdout) > 2000 else cp.stdout)
        sys.stderr.write(cp.stderr[-2000:] if len(cp.stderr) > 2000 else cp.stderr)
        fail("Build failed — see output above.")

    # discover output APK
    apk = find_first(
        project,
        f"{module or 'app'}/build/outputs/apk/debug/*-debug.apk",
        f"{module or 'app'}/build/outputs/apk/debug/*.apk",
        "**/build/outputs/apk/debug/*-debug.apk",
        "**/build/outputs/apk/debug/*.apk",
        "**/build/outputs/apk/**/*-debug.apk",
        "**/build/outputs/apk/**/*.apk",
    )
    if not apk:
        fail("APK not found after build. Check module structure.")
    log(f"APK: {apk}")
    return apk


# ── install ──────────────────────────────────────────────────────────────────

def install_apk(apk: Path, device: str | None) -> None:
    """adb install the APK."""
    adb = ["adb"]
    if device:
        adb += ["-s", device]
    run([*adb, "install", "-r", str(apk)])
    log("Installed.")


def launch_app(pkg: str, device: str | None) -> None:
    """Launch the app via monkey."""
    adb = ["adb"]
    if device:
        adb += ["-s", device]
    run([*adb, "shell", "monkey", "-p", pkg, "-c", "android.intent.category.LAUNCHER", "1"])
    log(f"Launched {pkg}")


# ── main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Android build, install, and run")
    parser.add_argument("--project", required=True, help="Path to Android project root")
    parser.add_argument("--only", choices=["build", "install", "launch"], help="Single step")
    parser.add_argument("--device", help="ADB device serial")
    parser.add_argument("--no-launch", action="store_true", help="Skip launch after install")
    args = parser.parse_args()

    project = Path(args.project).resolve()
    if not project.is_dir():
        fail(f"Not a directory: {project}")

    gv = detect_gradle_version(project)
    agp = detect_agp_version(project)
    module = find_app_module(project)
    pkg = find_package_name(project, module)

    summary: dict = {
        "project": str(project),
        "gradle_version": list(gv) if gv else None,
        "agp_version": list(agp) if agp else None,
        "module": module,
        "package": pkg,
    }

    log(f"Project: {project}")
    log(f"  Gradle: {'.'.join(map(str, gv)) if gv else 'unknown'}")
    log(f"  AGP:    {'.'.join(map(str, agp)) if agp else 'unknown'}")
    log(f"  Module: {module or 'root'}")
    log(f"  Package: {pkg or 'unknown'}")

    # ── build ──
    if args.only and args.only != "build":
        # try to find existing APK
        apk_paths = sorted(project.glob("**/build/outputs/apk/**/*debug*.apk"))
        summary["apk"] = str(apk_paths[-1]) if apk_paths else None
    else:
        apk = build_apk(project, module, gv)
        summary["apk"] = str(apk)
        apk_paths = [apk]

    # ── install ──
    if not args.only or args.only == "install":
        if not summary.get("apk"):
            fail("No APK found. Run build step first.")
        install_apk(Path(summary["apk"]), args.device)
        summary["installed"] = True

    # ── launch ──
    if not args.no_launch and (not args.only or args.only == "launch"):
        if not pkg:
            fail("Cannot determine package name for launch. Provide manually.")
        launch_app(pkg, args.device)
        summary["launched"] = True

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
