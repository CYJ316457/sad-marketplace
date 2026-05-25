---
name: cb-hud
description: Use when configuring CodeBuddy Code to show a polished cat status line HUD with current skill, tool, phase, duration, SVN, model, project, git, cost, token, and code-change state.
---

# CB HUD

CB HUD is a CodeBuddy-only status line pack. It configures CodeBuddy's native `statusLine` command and renders a compact ANSI-styled HUD at the bottom of the CodeBuddy interface.

v2 also installs lightweight CodeBuddy hooks. The hooks update `.codebuddy/cb-hud/state.json` on session, prompt, tool, and stop events so the HUD can show current activity.

v2.1 makes the activity area more visible with emoji labels and lightweight spinner frames. The spinner advances only when CodeBuddy refreshes the status line; it does not start a background process.

v2.2 displays total token usage, explicit changed-line counts, and API duration when CodeBuddy provides those fields.

v2.3 uses a fixed cat title, moves skill and tool names to the front without labels, and adds phase, activity duration, and SVN change count.

v2.4 adds a three-line multiline layout. Line 1 shows title, phase, project, and session only. Line 2 starts with agent, then shows active skill/tool details and counters. Line 3 shows duration, version, model, and file changes.

## Commands

- `CB-HUD-init`: write `.codebuddy/settings.json` with `statusLine.command` pointing to this pack's `scripts/cb-hud.js statusline`, and install tool-tracking hooks.
- `CB-HUD-show`: enable the status line again after it has been hidden.
- `CB-HUD-hide`: preserve settings but remove `statusLine` so the HUD stops rendering.
- `CB-HUD-uninstall`: remove CB HUD status line config and delete the project-local `.codebuddy/cb-hud/` state directory.

## Status Line

The status line script reads CodeBuddy JSON from stdin and prints one styled line. It shows:

- current phase: `idle`, `thinking`, `tool`, `error`, or `done`, displayed as `🎯 <phase>`
- current or last tool from CodeBuddy hooks, displayed as `🔧 <name>` or `🛠 <name>`
- inferred recent skill or command when hook input includes it, displayed as `🧩 <name>`
- activity duration, displayed as `🔥 <duration>`
- model display name
- project folder
- short session id
- git branch and dirty state when available
- elapsed duration and API duration
- cost
- total token count when CodeBuddy provides token fields
- changed lines, displayed as `📝 +<added> -<removed>`
- SVN changed item count, displayed as `📦 SVN <count>` when `svn status` is available
- CodeBuddy version

Example shape:

```text
🐱 CB HUD | 🎯 tool ⠋ | 📁 TestMarketPlace | #abcdef12
🤝 frontend-agent | 🎯 tool 🔥 18.0s 🧩 cb-hud 🔧 Bash | 🧾 2.4M tok | 📦 SVN 3
⏱ 2m5s / API 2.3s | v2.96.0 | 🤖 GPT-5.5 | 📝 +12 -3
```

Token counts are shown as a total. Counts support raw numbers, `K`, and `M`; values with a unit keep one decimal place.

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
