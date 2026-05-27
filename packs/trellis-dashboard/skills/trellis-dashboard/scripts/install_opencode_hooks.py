#!/usr/bin/env python3
from __future__ import annotations
import argparse
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--project', required=True)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    project = Path(args.project).resolve()
    package_path = project / '.opencode' / 'package.json'
    plugins_dir = project / '.opencode' / 'plugins'
    plugins_dir.mkdir(parents=True, exist_ok=True)

    package = {}
    if package_path.is_file():
        try:
            package = json.loads(package_path.read_text(encoding='utf-8-sig'))
        except Exception:
            package = {}

    package.setdefault('dependencies', {})
    package['dependencies'].setdefault('@opencode-ai/plugin', '^1.14.39')

    plugin_path = plugins_dir / 'trellis-dashboard-events.js'
    plugin_source = """export default async function () {
  return {
    'chat.message': async (input) => input,
    'tool.execute.before': async (input) => input,
    'tool.execute.after': async (input) => input,
  };
}
"""

    if args.dry_run:
        print(json.dumps({'package': package, 'plugin': str(plugin_path)}, indent=2, ensure_ascii=False))
        return 0

    package_path.parent.mkdir(parents=True, exist_ok=True)
    package_path.write_text(json.dumps(package, indent=2, ensure_ascii=False), encoding='utf-8')
    plugin_path.write_text(plugin_source, encoding='utf-8')
    print(str(package_path))
    print(str(plugin_path))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
