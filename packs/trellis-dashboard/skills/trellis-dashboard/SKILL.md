---
name: trellis-dashboard
description: Use when the user wants a realtime Trellis dashboard with a local web service that shows tasks, progress, PRDs, context files, research, events, and current agent activity.
---

# Trellis Dashboard

Trellis Dashboard starts a project-local web service and opens a live dashboard for the current Trellis repository.

## What It Shows

- all active and archived Trellis tasks
- current active task and workflow phase
- current developer and active session pointers
- current and recent agent activity from dashboard events
- rendered task artifacts: `prd.md`, `info.md`, `implement.jsonl`, `check.jsonl`, `research/*.md`, `summary.md`
- recent dashboard event stream

## Runtime Model

The dashboard runs as a local Node.js process on `127.0.0.1` and watches `.trellis/tasks` plus `.trellis/.runtime` for changes. It also reads `.trellis/.runtime/dashboard-events.jsonl` when platform hooks append agent or lifecycle events.

## Start

Run:

```powershell
node scripts/dashboard-server.js start --project C:\path\to\repo
```

Useful flags:

```powershell
--port 3477
--host 127.0.0.1
--open
--foreground
```

## Open

```powershell
node scripts/dashboard-server.js open --project C:\path\to\repo
```

## Stop

```powershell
node scripts/dashboard-server.js stop --project C:\path\to\repo
```

## Platform Wiring

- CodeBuddy: `python scripts/install_codebuddy_hooks.py --project <repo>`
- Claude Code: `python scripts/install_claude_hooks.py --project <repo>`
- OpenCode: `python scripts/install_opencode_hooks.py --project <repo>`

These scripts only append dashboard event hooks. They do not replace Trellis workflow hooks.
