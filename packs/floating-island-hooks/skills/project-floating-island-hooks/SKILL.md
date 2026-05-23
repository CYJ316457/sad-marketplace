---
name: project-floating-island-hooks
description: Use when wiring CodeBuddy, Claude Code, or Codex hooks to a project-local Floating Island status app, especially requests to create an island and show busy, ask, or idle during assistant sessions, prompts, notifications, or stop lifecycle events.
---

# Floating Island Assistant Hooks

Create or update a project-local Floating Island app and install CodeBuddy, Claude Code, or Codex hooks that drive it.

## Workflow

1. Confirm the target project root and platform: `codebuddy`, `claude`, `codex`, or `all`.
2. Use `scripts/install_codebuddy_hooks.py --project <project> --platform <platform>`. With no platform flag it preserves the old CodeBuddy-only default.
3. It deploys a bundled Floating Island into a project-local directory, creates launcher and hook wrapper scripts, assigns a stable project-local port, and merges hooks.
4. The installer tries to copy dependencies from an existing local Floating Island before requiring a network install.
5. Start the island with the generated `start-floating-island.cmd`.
6. Hooks call the generated `scripts/island-hook.cmd` wrapper so the same config works from Git Bash, cmd, and PowerShell-backed launchers.
7. Verify manually with `scripts\island-hook.cmd busy <Title>`, then restart the target assistant so it reloads settings.

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
python C:\Users\C\.agents\skills\project-floating-island-hooks\scripts\install_codebuddy_hooks.py --project C:\path\to\project
```

Useful flags:

```powershell
--platform codebuddy|claude|codex|all
--settings settings.json        # shared project config instead of settings.local.json
--island C:\path\to\island      # override default <project>/.codebuddy/floating-island
--port 17321                    # override stable project-local API port
--title CodeBuddy
--no-deploy-island              # only wire hooks to an existing island
--dependency-source C:\path\to\FloatingIsland
--no-copy-dependencies          # skip local node_modules/package-lock reuse
--dry-run
```

The installer preserves unrelated hooks, replaces older Floating Island hooks, and appends the current hooks. It creates the needed platform config directories.

Bundled Floating Island source is stored in `assets/floating-island`. Do not store `node_modules` in the skill. The installer first looks for an existing dependency source such as a sibling `FloatingIsland` directory or `C:\AI\Codex\Install\FloatingIsland`; if none exists, run `npm install` in the deployed app directory.

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
            "command": "cmd.exe /d /s /c call \"C:\\path\\to\\project\\.floating-island\\scripts\\island-hook.cmd\" \"busy\" \"CodeBuddy\"",
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
            "command": "cmd.exe /d /s /c call \"C:\\path\\to\\project\\.floating-island\\scripts\\island-hook.cmd\" \"ask\" \"Need input\"",
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
            "command": "cmd.exe /d /s /c call \"C:\\path\\to\\project\\.floating-island\\scripts\\island-hook.cmd\" \"idle\" \"CodeBuddy\"",
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

1. If the deployed app has no `node_modules/electron`, run `npm install` or rerun the installer with `--dependency-source C:\path\to\FloatingIsland`.
2. Run `start-floating-island.cmd` in the generated island directory if the app is not listening.
3. Run `scripts\island-hook.cmd busy CodeBuddy` to confirm the island changes.
4. Restart CodeBuddy, Claude Code, or Codex/open a new session.
5. Submit a prompt and expect `busy`.
6. Trigger a permission/idle notification and expect `ask`.
7. Let the response finish and expect `idle`.

For Codex, also verify `[features].hooks = true` in `C:\Users\C\.codex\config.toml` and approve project hooks with `/hooks` when prompted.

If `ask` never appears, inspect the platform hook logs or temporarily replace the hook command with a file append command to confirm which `Notification` matcher is actually emitted.
