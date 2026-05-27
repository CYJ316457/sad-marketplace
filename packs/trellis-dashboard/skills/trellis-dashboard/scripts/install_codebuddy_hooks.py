#!/usr/bin/env python3
from __future__ import annotations
import argparse
import json
from pathlib import Path

def read_json(path: Path) -> dict:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding='utf-8-sig'))
    except Exception:
        return {}

def event_hook(command: str, matcher: str | None = None) -> dict:
    item = {'hooks': [{'type': 'command', 'command': command, 'timeout': 10}]}
    if matcher:
        item['matcher'] = matcher
    return item

def append_unique(hooks: dict, name: str, entry: dict) -> None:
    arr = hooks.setdefault(name, [])
    cmd = entry['hooks'][0]['command']
    for existing in arr:
        try:
            if existing['hooks'][0]['command'] == cmd:
                return
        except Exception:
            pass
    arr.append(entry)

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--project', required=True)
    parser.add_argument('--settings', default='settings.local.json')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    project = Path(args.project).resolve()
    settings_path = project / '.codebuddy' / args.settings
    scripts_dir = Path(__file__).resolve().parent
    command = f'python "{scripts_dir / "write_dashboard_event.py"}"'
    data = read_json(settings_path)
    hooks = data.setdefault('hooks', {})
    for name, matcher in [('SessionStart', 'startup|clear|compact'), ('UserPromptSubmit', None), ('PreToolUse', 'Task'), ('Stop', None)]:
        append_unique(hooks, name, event_hook(command, matcher))
    if args.dry_run:
        print(json.dumps(data, indent=2, ensure_ascii=False))
        return 0
    settings_path.parent.mkdir(parents=True, exist_ok=True)
    settings_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
    print(str(settings_path))
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
