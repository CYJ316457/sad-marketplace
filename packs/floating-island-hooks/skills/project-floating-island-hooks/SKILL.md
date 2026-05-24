---
name: project-floating-island-hooks
description: Use when wiring CodeBuddy, Claude Code, or Codex hooks to a project-local Floating Island status app, especially requests to create an island and show busy, ask, or idle during assistant sessions, prompts, notifications, or stop lifecycle events.
---

# Floating Island Assistant Hooks

Create or update a project-local Floating Island app and install CodeBuddy, Claude Code, or Codex hooks that drive it.

## Workflow

1. Confirm the target project root and platform: `codebuddy`, `claude`, `codex`, or `all`.
2. Use `scripts/install_codebuddy_hooks.py --project <project> --platform <platform>`. With no platform flag it preserves the old CodeBuddy-only default.
3. It deploys bundled Floating Island app files plus a prebuilt Windows x64 runtime into a project-local directory.
4. The installer creates launcher and hook wrapper scripts, assigns a stable project-local port, and merges hooks.
5. Hooks call the generated `scripts/island-hook.js` wrapper. It auto-starts the island if needed, waits for readiness, then sends the state update.
6. You can still start the island manually with the generated `start-floating-island.cmd` or the distributed `Start-Floating-Island` command.
7. Verify manually with `scripts\island-hook.cmd busy <Title>`, then restart the target assistant so it reloads settings.

## Delivery Model

This pack now ships a prebuilt Windows x64 runtime.
这是预打包分发，不再依赖本地 npm 安装 Electron。

- No project-local `npm install`
- No local Electron build step
- Installer expands the bundled runtime into the project island directory
- Start script launches the bundled `electron.exe` directly

## Event Mapping

Use this mapping unless the user asks otherwise:

| Event | Matcher | Floating Island state | Reason |
| --- | --- | --- | --- |
| `SessionStart` | omit or platform startup matchers | `idle` | Default/reset state |
| `UserPromptSubmit` | omit | `busy` | User submitted a message; assistant starts work |
| `Notification` | `permission_prompt|idle_prompt` | `ask` | Assistant needs input or permission |
| `Stop` | omit | `idle` | Main agent response finished |
| `SessionEnd` | omit or `clear|logout|prompt_input_exit|other` | `idle` | Session ended |

`Notification` matcher `elicitation_dialog` is documented as not supported, so do not rely on it for normal asking behavior.

Codex support is intentionally conservative: install `UserPromptSubmit -> busy` and `Stop -> idle`. Do not force `SessionStart` for Codex unless the local Codex version and project already prove that event works. Codex also requires user-level hook enablement and hook trust review.

## Install Command

Run from any directory:

```powershell
python scripts/install_codebuddy_hooks.py --project C:\path\to\project
```

Useful flags:

```powershell
--platform codebuddy|claude|codex|all
--settings settings.json        # shared project config instead of settings.local.json
--island C:\path\to\island      # override default <project>/.codebuddy/floating-island
--port 17321                    # override stable project-local API port
--title CodeBuddy
--no-deploy-island              # only wire hooks to an existing island
--dry-run
```

Run that command from the installed skill directory. For example, after installing into Codex global skills, run it from `<codex-home>/skills/project-floating-island-hooks/`.

The installer preserves unrelated hooks, replaces older Floating Island hooks, and appends the current hooks. It creates the needed platform config directories.

Bundled Floating Island app source is stored in `assets/floating-island`. Bundled prebuilt runtime parts are stored in `assets/floating-island-runtime-win32-x64`.

Platform outputs:

| Platform | Config written |
| --- | --- |
| `codebuddy` | `<project>/.codebuddy/settings.local.json` by default |
| `claude` | `<project>/.claude/settings.json` |
| `codex` | `<project>/.codex/hooks.json` |
| `all` | all three configs, sharing one project-local island |

## Manual Config Shape

If editing manually, use this structure and prefer the generated wrapper command:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"C:\\path\\to\\project\\.floating-island\\scripts\\island-hook.js\" --port 17321 \"busy\" \"CodeBuddy\"",
            "timeout": 3
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "permission_prompt|idle_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "node \"C:\\path\\to\\project\\.floating-island\\scripts\\island-hook.js\" --port 17321 \"ask\" \"Need input\"",
            "timeout": 3
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"C:\\path\\to\\project\\.floating-island\\scripts\\island-hook.js\" --port 17321 \"idle\" \"CodeBuddy\"",
            "timeout": 3
          }
        ]
      }
    ]
  }
}
```

## Verification

After installing:

1. Run `start-floating-island.cmd` in the generated island directory, or execute `Start-Floating-Island`.
2. Run `scripts\island-hook.cmd busy CodeBuddy` or `node scripts\island-hook.js --port <port> busy CodeBuddy` to confirm the island changes.
3. Restart CodeBuddy, Claude Code, or Codex/open a new session.
4. Submit a prompt and expect `busy`.
5. Trigger a permission/idle notification and expect `ask`.
6. Let the response finish and expect `idle`.

For Codex, also verify `[features].hooks = true` in `C:\Users\C\.codex\config.toml` and approve project hooks with `/hooks` when prompted.

If `ask` never appears, inspect the platform hook logs or temporarily replace the hook command with a file append command to confirm which `Notification` matcher is actually emitted.
