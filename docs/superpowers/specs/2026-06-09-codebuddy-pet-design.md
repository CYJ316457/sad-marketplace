# CodeBuddy Pet Design

Date: 2026-06-09

## Summary

Create a new CodeBuddy-only marketplace pack named `codebuddy-pet`. The pack installs a small desktop pet for CodeBuddy projects. The first release ships an embedded `ikunchick` pet asset, installs CodeBuddy hooks, and drives a draggable always-on-top pet window from CodeBuddy session state.

This is a new pack, not an extension of `floating-island-hooks` or `cb-hud`. Existing packs remain unchanged except for marketplace registration references.

## Goals

- Add `packs/codebuddy-pet` as a CodeBuddy-only pack.
- Embed the `ikunchick` pet resource provided by the user from `C:\Users\13603\Downloads\archives\ikunchick.zip`.
- Preserve the resource's original structure: `pet.json` and `spritesheet.webp`.
- Provide install, show, hide, and uninstall commands.
- Install CodeBuddy hooks that map session events to pet states.
- Show a transparent, borderless, always-on-top pet window.
- Support dragging the pet window.
- Show a click-triggered speech bubble with current state, skill/tool, and short session duration.
- Keep the first release small enough to validate through automated tests plus manual visual checks.

## Non-Goals

- Do not support Codex, Claude Code, or OpenCode in the first release.
- Do not modify `floating-island-hooks` or `cb-hud` behavior.
- Do not implement a complete token, cost, Git, or SVN dashboard.
- Do not implement a pet marketplace or runtime download flow in the first release.
- Do not implement complex skin switching beyond the embedded default pet.
- Do not depend on a network call during normal install.

## Resource Policy

The first release embeds `ikunchick` because the user confirmed redistribution is allowed and supplied the local archive. The implementation should copy or extract the archive contents into:

```text
packs/codebuddy-pet/skills/codebuddy-pet/assets/pets/ikunchick/
```

Expected files:

```text
pet.json
spritesheet.webp
```

The previously supplied URL `https://codexpet.xyz/api/pets/ikunchick/download` was checked during design and returned 404 at that time. Implementation should use the local archive rather than relying on that URL.

## Pack Structure

```text
packs/codebuddy-pet/
  pack.json
  .codebuddy-plugin/plugin.json
  commands/
    CodeBuddy-Pet-init.md
    CodeBuddy-Pet-show.md
    CodeBuddy-Pet-hide.md
    CodeBuddy-Pet-uninstall.md
  skills/codebuddy-pet/
    SKILL.md
    agents/openai.yaml
    assets/pets/ikunchick/
      pet.json
      spritesheet.webp
    assets/runtime/
      desktop window source and launcher assets
    scripts/codebuddy-pet.js
```

The pack is registered as CodeBuddy-only:

```json
"platformSupport": {
  "codex": false,
  "claude": false,
  "codebuddy": true,
  "opencode": false
}
```

Marketplace registration should be added to `.codebuddy-plugin/marketplace.json`, `registry/index.json`, README, and existing marketplace tests.

## Commands

### `CodeBuddy-Pet-init`

Initializes the pet in the current project.

Responsibilities:

- Resolve the target project path, defaulting to the current working directory.
- Copy runtime files and embedded `ikunchick` assets into `<project>/.codebuddy/codebuddy-pet/`.
- Create initial `state.json`.
- Merge CodeBuddy hooks into `.codebuddy/settings.json`.
- Avoid duplicating hook entries on repeated runs.

Useful options:

- `--project <path>`
- `--force`
- `--pet ikunchick`
- `--dry-run`

### `CodeBuddy-Pet-show`

Re-enables the pet after hide. It should restore this pack's hook entries and ensure the local runtime can be launched without duplicating resources unless `--force` is supplied.

### `CodeBuddy-Pet-hide`

Disables this pack's hooks or marks the pet disabled while preserving local resources and state. This lets the user restore the pet without reinstalling.

### `CodeBuddy-Pet-uninstall`

Removes this pack's hook entries and deletes `<project>/.codebuddy/codebuddy-pet/`. It must preserve unrelated CodeBuddy configuration. If runtime files are locked, it should remove config first and then ask the user to close the window before retrying cleanup.

## Runtime Architecture

The desktop runtime follows the local floating-window model used by `floating-island-hooks`, but is scoped to CodeBuddy and pet behavior.

Runtime behavior:

- Transparent, borderless, always-on-top window.
- Small default size suitable for a desktop pet.
- Draggable body.
- Click toggles a speech bubble.
- Loads `pet.json` and `spritesheet.webp` from the embedded pet directory.
- Reads project-local state from `<project>/.codebuddy/codebuddy-pet/state.json`.
- Updates animation and bubble text when state changes.

The first release should prefer file-based state polling every 300-500 ms. This avoids local port conflicts and keeps lifecycle handling simple. A later release can add an HTTP or WebSocket channel if lower latency is necessary.

## State Model

State is stored at:

```text
<project>/.codebuddy/codebuddy-pet/state.json
```

Suggested schema:

```json
{
  "phase": "busy",
  "title": "CodeBuddy",
  "message": "Working...",
  "skill": "codebuddy-pet",
  "tool": "Bash",
  "sessionStartedAt": "2026-06-09T01:30:00.000Z",
  "updatedAt": "2026-06-09T01:31:12.000Z"
}
```

The hook script should tolerate missing or changing CodeBuddy payload fields. It should read JSON from stdin when available, extract known fields such as tool name, skill name, project path, and session id, and fall back to conservative defaults when fields are absent.

## Event Mapping

Use this mapping unless CodeBuddy local behavior proves a different event name is required:

| CodeBuddy event | Pet phase | Behavior |
| --- | --- | --- |
| `SessionStart` | `idle` | Initialize session time and show `Ready`. |
| `UserPromptSubmit` | `busy` | User submitted a prompt; show `Working...`. |
| `PreToolUse` | `tool` | Show current tool when available. |
| `PostToolUse` | `busy` | Return to working state after a tool finishes. |
| `Notification` | `ask` | Show `Need input` for permission or user input prompts. |
| `Stop` | `done` | Show `Done`, then return to `idle` after a short delay. |
| `SessionEnd` | `idle` | Clear current tool and return to idle. |

Animation fallback rules:

- `idle`: use the default idle action.
- `busy`: use a thinking or working action if available; otherwise use idle with a working bubble.
- `tool`: use busy animation and show the tool name.
- `ask`: use a prompt or surprised action if available; otherwise use idle with a highlighted bubble.
- `done`: use a completion action if available; otherwise show a short completion bubble.

## Error Handling

- Missing embedded pet files: fail `init` with a clear message naming the expected directory.
- Existing `.codebuddy/settings.json`: parse and preserve unrelated fields.
- Invalid settings JSON: do not overwrite; report the error and recommend backing up or fixing the file.
- Repeated init: update idempotently and avoid duplicate hooks.
- Unknown hook payload: write a valid fallback state and exit successfully so CodeBuddy is not disrupted.
- Runtime launch failure: hooks should still write state; command output should point to the runtime log location.
- Locked files during uninstall: remove config first, then report that the window must be closed before deleting local files.

## Verification Plan

Automated checks:

- `npm test`
- `npm run build`
- Marketplace tests confirm `codebuddy-pet` is registered and CodeBuddy-only.
- Tests confirm command and skill paths exist.
- Tests confirm embedded `ikunchick/pet.json` and `ikunchick/spritesheet.webp` exist.
- Script dry-run against a temporary project.
- Script real init against a temporary project and verify settings/state generation.

Manual checks:

- Launch the pet window from a temporary project.
- Simulate `idle`, `busy`, `tool`, `ask`, and `done` hook states.
- Confirm the window is visible, nonblank, draggable, and click toggles the bubble.
- Confirm hide, show, and uninstall preserve unrelated CodeBuddy settings.

## Implementation Notes

- Use the repository's existing marketplace pack patterns.
- Reuse ideas from `floating-island-hooks` for local window deployment and from `cb-hud` for CodeBuddy event/state semantics.
- Keep all generated project-local runtime files under `<project>/.codebuddy/codebuddy-pet/`.
- Keep command files thin; centralize logic in `scripts/codebuddy-pet.js`.
- Do not overwrite unrelated user settings.