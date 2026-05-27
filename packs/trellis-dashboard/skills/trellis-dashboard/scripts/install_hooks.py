#!/usr/bin/env python3
from __future__ import annotations
import argparse
import subprocess
import sys
from pathlib import Path


def run_step(command: list[str]) -> int:
    completed = subprocess.run(command)
    return completed.returncode


def detect_platform(project: Path) -> str:
    if (project / '.codebuddy').exists():
        return 'codebuddy'
    if (project / '.claude').exists():
        return 'claude'
    if (project / '.opencode').exists():
        return 'opencode'
    return 'all'


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--project', default='.')
    parser.add_argument('--platform', default='auto', choices=['auto', 'codebuddy', 'claude', 'opencode', 'all'])
    parser.add_argument('--start', action='store_true')
    parser.add_argument('--open', action='store_true')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port')
    args = parser.parse_args()

    scripts_dir = Path(__file__).resolve().parent
    project = Path(args.project).resolve()
    platform = detect_platform(project) if args.platform == 'auto' else args.platform

    selected = ['codebuddy', 'claude', 'opencode'] if platform == 'all' else [platform]
    hook_scripts = {
        'codebuddy': scripts_dir / 'install_codebuddy_hooks.py',
        'claude': scripts_dir / 'install_claude_hooks.py',
        'opencode': scripts_dir / 'install_opencode_hooks.py',
    }

    commands: list[list[str]] = []
    for item in selected:
        command = [sys.executable, str(hook_scripts[item]), '--project', str(project)]
        if args.dry_run:
            command.append('--dry-run')
        commands.append(command)

    dashboard_script = scripts_dir / 'dashboard-server.js'
    if args.start:
        command = [
            'node',
            str(dashboard_script),
            'start',
            '--project',
            str(project),
            '--host',
            args.host,
        ]
        if args.port:
            command.extend(['--port', args.port])
        commands.append(command)
    if args.open:
        commands.append([
            'node',
            str(dashboard_script),
            'open',
            '--project',
            str(project),
        ])

    if args.dry_run:
        for command in commands:
            print(' '.join(f'"{part}"' if ' ' in part else part for part in command))
        return 0

    for command in commands:
        code = run_step(command)
        if code != 0:
            return code
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
