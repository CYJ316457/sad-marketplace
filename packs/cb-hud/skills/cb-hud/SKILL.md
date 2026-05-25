---
name: cb-hud
description: Use when configuring CodeBuddy Code to show a polished status line HUD with model, project, session, git, cost, duration, and code-change state.
---

# CB HUD

CB HUD is a CodeBuddy-only status line pack. It configures CodeBuddy's native `statusLine` command and renders a compact ANSI-styled HUD at the bottom of the CodeBuddy interface.

v2 also installs lightweight CodeBuddy hooks. The hooks update `.codebuddy/cb-hud/state.json` on session, prompt, tool, and stop events so the HUD can show current activity.

## Commands

- `CB-HUD-init`: write `.codebuddy/settings.json` with `statusLine.command` pointing to this pack's `scripts/cb-hud.js statusline`, and install tool-tracking hooks.
- `CB-HUD-show`: enable the status line again after it has been hidden.
- `CB-HUD-hide`: preserve settings but remove `statusLine` so the HUD stops rendering.
- `CB-HUD-uninstall`: remove CB HUD status line config and delete the project-local `.codebuddy/cb-hud/` state directory.

## Status Line

The status line script reads CodeBuddy JSON from stdin and prints one styled line. It shows:

- current state: `idle`, `thinking`, `tool`, `tool-error`, or `done`
- current or last tool from CodeBuddy hooks
- inferred recent skill or command when hook input includes it
- model display name
- project folder
- short session id
- git branch and dirty state when available
- elapsed duration
- cost
- changed lines
- CodeBuddy version

`statusLine` only reliably consumes the first stdout line. CB HUD therefore keeps everything on one line. Long output can visually wrap in CodeBuddy versions that support status bar wrapping.

## Manual Use

From a project root:

```powershell
node <installed-plugin>/skills/cb-hud/scripts/cb-hud.js init --project .
node <installed-plugin>/skills/cb-hud/scripts/cb-hud.js show --project .
node <installed-plugin>/skills/cb-hud/scripts/cb-hud.js hide --project .
node <installed-plugin>/skills/cb-hud/scripts/cb-hud.js uninstall --project .
```

Restart CodeBuddy after `init`, `show`, `hide`, or `uninstall` so it reloads settings.
