#!/usr/bin/env python3
from __future__ import annotations
import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path


def find_repo_root(start: Path) -> Path | None:
    current = start.resolve()
    while True:
        if (current / '.trellis').is_dir():
            return current
        parent = current.parent
        if parent == current:
            return None
        current = parent


def sanitize_json(value):
    if isinstance(value, str):
        return value.encode('utf-8', errors='replace').decode('utf-8')
    if isinstance(value, list):
        return [sanitize_json(item) for item in value]
    if isinstance(value, dict):
        return {
            sanitize_json(key): sanitize_json(item)
            for key, item in value.items()
        }
    return value
def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--project')
    parser.add_argument('--host', default='unknown')
    parser.add_argument('--stage', default='unknown')
    parser.add_argument('--agent', default='')
    parser.add_argument('--task-id', default='')
    parser.add_argument('--details', default='')
    args = parser.parse_args()

    try:
        payload = sanitize_json(json.load(sys.stdin))
    except Exception:
        payload = {}

    start = Path(args.project or payload.get('cwd') or os.getcwd())
    repo_root = find_repo_root(start)
    if repo_root is None:
        return 0

    runtime_dir = repo_root / '.trellis' / '.runtime'
    runtime_dir.mkdir(parents=True, exist_ok=True)
    event = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'host': args.host or os.environ.get('TRELLIS_DASHBOARD_PLATFORM', 'unknown'),
        'stage': args.stage or payload.get('hook_event_name') or payload.get('event') or 'unknown',
        'agent': args.agent or payload.get('agent_name') or payload.get('subagent_type') or payload.get('subagentType') or '',
        'task_id': args.task_id,
        'tool': payload.get('tool_name') or payload.get('toolName') or '',
        'session': payload.get('session_id') or payload.get('sessionId') or payload.get('transcript_path') or '',
        'cwd': payload.get('cwd') or os.getcwd(),
        'details': args.details,
        'payload': payload,
    }
    event = sanitize_json(event)
    with (runtime_dir / 'dashboard-events.jsonl').open('a', encoding='utf-8') as handle:
        handle.write(json.dumps(event, ensure_ascii=False) + '\n')
    print(json.dumps({'ok': True}, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    import sys
    raise SystemExit(main())
