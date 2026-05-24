#!/usr/bin/env python3
import argparse
import json
import shutil
import zlib
from pathlib import Path


DEFAULT_PORT_BASE = 17321
DEFAULT_PORT_SPAN = 1000
SKILL_ROOT = Path(__file__).resolve().parents[1]
ASSET_ISLAND = SKILL_ROOT / "assets" / "floating-island"
DEPENDENCY_MARKER = Path("node_modules") / "electron"
PLATFORM_CHOICES = ("codebuddy", "claude", "codex", "all")
PLATFORM_DIRS = {
    "codebuddy": ".codebuddy",
    "claude": ".claude",
    "codex": ".codex",
}


def main():
    parser = argparse.ArgumentParser(description="Install AI assistant hooks for Floating Island.")
    parser.add_argument("--project", required=True, help="Target project root.")
    parser.add_argument("--platform", default="codebuddy", choices=PLATFORM_CHOICES, help="Target hook platform.")
    parser.add_argument("--settings", default="settings.local.json", help="CodeBuddy settings file name.")
    parser.add_argument("--island", default=None, help="Floating Island path. Defaults to a project-local platform directory.")
    parser.add_argument("--port", type=int, default=None, help="Floating Island API port. Defaults to a stable project-local port.")
    parser.add_argument("--title", default=None, help="Default visible title for idle/busy states.")
    parser.add_argument("--deploy-island", action="store_true", help="Deprecated no-op. Deployment is enabled by default.")
    parser.add_argument("--no-deploy-island", action="store_true", help="Do not copy bundled Floating Island source.")
    parser.add_argument("--dependency-source", default=None, help="Existing Floating Island app to copy node_modules/package-lock.json from.")
    parser.add_argument("--no-copy-dependencies", action="store_true", help="Do not copy dependencies from an existing local Floating Island.")
    parser.add_argument("--dry-run", action="store_true", help="Print merged JSON without writing.")
    args = parser.parse_args()

    project = Path(args.project).expanduser().resolve()
    if not project.exists():
      raise SystemExit(f"Project path does not exist: {project}")

    platforms = selected_platforms(args.platform)
    island = resolve_island_path(project, args.island, platforms)
    port = args.port if args.port is not None else default_port_for(project)
    title = args.title or default_title_for(platforms)
    if not args.no_deploy_island:
        deploy_island(island, dry_run=args.dry_run)
        write_launcher_files(island, port, dry_run=args.dry_run)
        if not args.no_copy_dependencies:
            copy_dependencies(island, project, args.dependency_source, dry_run=args.dry_run)

    islandctl = island / "scripts" / "islandctl.js"
    hook_cmd = island / "scripts" / "island-hook.cmd"

    if not islandctl.exists() and not (args.dry_run and not args.no_deploy_island):
      raise SystemExit(f"Missing islandctl.js: {islandctl}")

    merged_by_path = {}
    for platform in platforms:
        settings_path = settings_path_for(project, platform, args.settings)
        existing = load_json(settings_path)
        desired_hooks = build_hooks(platform, hook_command_path(hook_cmd), title)
        merged_by_path[settings_path] = merge_hooks(existing, desired_hooks)

    if args.dry_run:
        for settings_path, merged in merged_by_path.items():
            print(f"--- {settings_path} ---")
            print(json.dumps(merged, indent=2, ensure_ascii=False))
        return

    for settings_path, merged in merged_by_path.items():
        settings_path.parent.mkdir(parents=True, exist_ok=True)
        settings_path.write_text(json.dumps(merged, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Wrote {settings_path}")

    print(f"Floating Island: {island}")
    print(f"API port: {port}")
    print(f"Start script: {island / 'start-floating-island.cmd'}")
    if not has_dependencies(island):
        print("Dependencies: missing. Run npm install in the Floating Island directory before starting it.")
    if "codex" in platforms:
        print("Codex: ensure user config has [features].hooks = true and approve hooks with /hooks if prompted.")


def selected_platforms(platform):
    if platform == "all":
        return ["codebuddy", "claude", "codex"]
    return [platform]


def default_title_for(platforms):
    if len(platforms) == 1:
        return {
            "codebuddy": "CodeBuddy",
            "claude": "Claude",
            "codex": "Codex",
        }[platforms[0]]
    return "AI"


def resolve_island_path(project, configured_island, platforms):
    if configured_island:
        return Path(configured_island).expanduser().resolve()
    if len(platforms) == 1:
        return project / PLATFORM_DIRS[platforms[0]] / "floating-island"
    existing_codebuddy_island = project / ".codebuddy" / "floating-island"
    if (existing_codebuddy_island / "scripts" / "islandctl.js").exists():
        return existing_codebuddy_island
    return project / ".floating-island"


def default_port_for(project):
    key = str(project).lower().replace("\\", "/").encode("utf-8")
    return DEFAULT_PORT_BASE + (zlib.crc32(key) % DEFAULT_PORT_SPAN)


def load_json(path):
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise SystemExit(f"Invalid JSON in {path}: {error}") from error


def deploy_island(destination, dry_run=False):
    if not ASSET_ISLAND.exists():
        raise SystemExit(f"Missing bundled Floating Island asset: {ASSET_ISLAND}")
    if destination.exists() and (destination / "scripts" / "islandctl.js").exists():
        return
    if destination.exists() and any(destination.iterdir()):
        raise SystemExit(f"Destination exists and is not an empty Floating Island directory: {destination}")
    if dry_run:
        return

    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        destination.rmdir()
    shutil.copytree(ASSET_ISLAND, destination)


def write_launcher_files(destination, port, dry_run=False):
    if dry_run:
        return

    cmd = (
        "@echo off\r\n"
        f"set FLOATING_ISLAND_PORT={port}\r\n"
        "npm start\r\n"
    )
    ps1 = (
        f"$env:FLOATING_ISLAND_PORT='{port}'\n"
        "npm start\n"
    )
    (destination / "start-floating-island.cmd").write_text(cmd, encoding="utf-8")
    (destination / "start-floating-island.ps1").write_text(ps1, encoding="utf-8")
    scripts_dir = destination / "scripts"
    scripts_dir.mkdir(parents=True, exist_ok=True)
    hook_cmd = (
        "@echo off\r\n"
        f"set FLOATING_ISLAND_PORT={port}\r\n"
        'node "%~dp0islandctl.js" %*\r\n'
        "exit /b 0\r\n"
    )
    hook_ps1 = (
        f"$env:FLOATING_ISLAND_PORT='{port}'\n"
        "& node \"$PSScriptRoot/islandctl.js\" @args\n"
        "exit 0\n"
    )
    (scripts_dir / "island-hook.cmd").write_text(hook_cmd, encoding="utf-8")
    (scripts_dir / "island-hook.ps1").write_text(hook_ps1, encoding="utf-8")


def has_dependencies(island):
    return (island / DEPENDENCY_MARKER).exists()


def copy_dependencies(destination, project, configured_source=None, dry_run=False):
    if has_dependencies(destination):
        return

    source = find_dependency_source(project, configured_source)
    if source is None:
        return

    if dry_run:
        return

    target_modules = destination / "node_modules"
    if target_modules.exists():
        shutil.rmtree(target_modules)
    shutil.copytree(source / "node_modules", destination / "node_modules")
    lockfile = source / "package-lock.json"
    if lockfile.exists():
        shutil.copy2(lockfile, destination / "package-lock.json")
    print(f"Copied dependencies from {source}")


def find_dependency_source(project, configured_source=None):
    candidates = []
    if configured_source:
        candidates.append(Path(configured_source).expanduser())
    candidates.extend([
        project.parent / "FloatingIsland",
        Path.home() / "FloatingIsland",
    ])

    seen = set()
    for candidate in candidates:
        source = candidate.resolve()
        key = str(source).lower()
        if key in seen:
            continue
        seen.add(key)
        if (source / DEPENDENCY_MARKER).exists():
            return source
    return None


def settings_path_for(project, platform, codebuddy_settings):
    if platform == "codebuddy":
        return project / ".codebuddy" / codebuddy_settings
    if platform == "claude":
        return project / ".claude" / "settings.json"
    if platform == "codex":
        return project / ".codex" / "hooks.json"
    raise ValueError(f"Unsupported platform: {platform}")


def hook_command_path(path):
    return str(path)


def build_command(hook_cmd, state, title):
    return f'cmd.exe /d /s /c call "{hook_cmd}" {quote_cmd_arg(state)} {quote_cmd_arg(title)}'


def quote_cmd_arg(value):
    return '"' + str(value).replace('"', "'") + '"'


def build_hooks(platform, hook_cmd, title):
    idle = build_command(hook_cmd, "idle", title)
    busy = build_command(hook_cmd, "busy", title)
    ask = build_command(hook_cmd, "ask", "Need input")

    if platform == "codex":
        return {
            "UserPromptSubmit": [
                hook_group(None, busy),
            ],
            "Stop": [
                hook_group(None, idle),
            ],
        }

    hooks = {
        "SessionStart": [
            hook_group(None, idle),
        ],
        "UserPromptSubmit": [
            hook_group(None, busy),
        ],
        "Notification": [
            hook_group("permission_prompt|idle_prompt", ask),
        ],
        "Stop": [
            hook_group(None, idle),
        ],
    }
    if platform == "codebuddy":
        hooks["SessionEnd"] = [
            hook_group(None, idle),
        ]
    return {
        key: value
        for key, value in hooks.items()
    }


def hook_group(matcher, command):
    group = {
        "hooks": [
            {
                "type": "command",
                "command": command,
                "timeout": 3,
            }
        ]
    }
    if matcher is not None:
        group["matcher"] = matcher
    return group


def merge_hooks(settings, desired_hooks):
    settings = dict(settings)
    hooks = dict(settings.get("hooks", {}))

    for event, groups in desired_hooks.items():
        current_groups = remove_existing_floating_island_groups(list(hooks.get(event, [])))
        for group in groups:
            if not contains_group(current_groups, group):
                current_groups.append(group)
        hooks[event] = current_groups

    settings["hooks"] = hooks
    return settings


def remove_existing_floating_island_groups(groups):
    return [
        group
        for group in groups
        if not is_floating_island_group(group)
    ]


def is_floating_island_group(group):
    commands = [
        hook.get("command", "")
        for hook in group.get("hooks", [])
        if hook.get("type") == "command"
    ]
    return any(is_floating_island_command(command) for command in commands)


def is_floating_island_command(command):
    normalized = command.lower().replace("\\", "/")
    if "island-hook.cmd" in normalized:
        return True
    if "islandctl.js" in normalized and "floating_island_port" in normalized:
        return True
    if "floatingisland/scripts/islandctl.js" in normalized:
        return True
    if "floating-island/scripts/islandctl.js" in normalized:
        return True
    return False


def contains_group(groups, desired):
    desired_key = group_key(desired)
    return any(group_key(group) == desired_key for group in groups)


def group_key(group):
    matcher = group.get("matcher", "")
    commands = tuple(
        hook.get("command", "")
        for hook in group.get("hooks", [])
        if hook.get("type") == "command"
    )
    return matcher, commands


if __name__ == "__main__":
    main()
