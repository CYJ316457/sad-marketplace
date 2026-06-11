---
name: codebuddy-pet
description: Use when installing, showing, hiding, uninstalling, or debugging the CodeBuddy desktop pet with embedded ikunchick assets and hook-driven status bubbles.
---

# CodeBuddy Pet

Install and manage a CodeBuddy-only desktop pet for the current project.

## Workflow

1. Confirm the target project root.
2. Run `node scripts/codebuddy-pet.js init --project <project>` from the installed skill directory.
3. The init command installs runtime dependencies if needed and starts the pet window.
4. Restart CodeBuddy if it needs to reload `.codebuddy/settings.json` hooks.
5. Verify state manually with `node scripts/codebuddy-pet.js hook busy --project <project>`.

## Commands

- `CodeBuddy-Pet-init`: install runtime files, embedded ikunchick assets, state file, CodeBuddy hooks, local Electron dependencies, and start the pet.
- `CodeBuddy-Pet-show`: refresh files, re-enable hooks, install local Electron dependencies if needed, and make the pet visible again.
- `CodeBuddy-Pet-hide`: disable this pack's hooks while preserving project-local files.
- `CodeBuddy-Pet-uninstall`: remove this pack's hooks and project-local files.

## State

Project state is stored in `<project>/.codebuddy/codebuddy-pet/state.json`.

| Event | Phase |
| --- | --- |
| `SessionStart` | `idle` |
| `UserPromptSubmit` | `busy` |
| `PreToolUse` | `tool` |
| `PostToolUse` | `busy` |
| `Notification` | `ask` |
| `Stop` | `done` |
| `SessionEnd` | `idle` |

## Verification

Run from the installed skill directory:

```powershell
node scripts/codebuddy-pet.js init --project <project>
node scripts/codebuddy-pet.js hook busy --project <project>
node scripts/codebuddy-pet.js hook tool --project <project> --tool Bash
node scripts/codebuddy-pet.js hook ask --project <project>
node scripts/codebuddy-pet.js hook done --project <project>
node scripts/codebuddy-pet.js hook idle --project <project>
```

Expected: `state.json` updates after each hook command. The desktop pet window should update when running.
