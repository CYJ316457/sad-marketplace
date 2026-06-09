# CodeBuddy Pet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CodeBuddy-only marketplace pack that installs a draggable desktop pet using the embedded `ikunchick` asset and CodeBuddy hook state.

**Architecture:** Add a new `packs/codebuddy-pet` pack with CodeBuddy plugin metadata, command docs, a skill, embedded pet assets, and a Node CLI script. The CLI installs project-local runtime files under `.codebuddy/codebuddy-pet`, merges CodeBuddy hooks into `.codebuddy/settings.json`, writes state updates from hook payloads, and launches a lightweight Electron pet window that polls state from disk.

**Tech Stack:** Node.js ESM, CodeBuddy plugin manifests, JSON file state, Electron runtime assets copied from the pack, Vitest marketplace tests.

---

## File Structure

Create:
- `packs/codebuddy-pet/pack.json`: pack metadata and CodeBuddy-only platform support.
- `packs/codebuddy-pet/.codebuddy-plugin/plugin.json`: CodeBuddy manifest.
- `packs/codebuddy-pet/commands/CodeBuddy-Pet-init.md`, `CodeBuddy-Pet-show.md`, `CodeBuddy-Pet-hide.md`, `CodeBuddy-Pet-uninstall.md`: thin command docs.
- `packs/codebuddy-pet/skills/codebuddy-pet/SKILL.md`: skill workflow.
- `packs/codebuddy-pet/skills/codebuddy-pet/agents/openai.yaml`: skill UI metadata.
- `packs/codebuddy-pet/skills/codebuddy-pet/assets/pets/ikunchick/pet.json` and `spritesheet.webp`: extracted from `C:\Users\13603\Downloads\archives\ikunchick.zip`.
- `packs/codebuddy-pet/skills/codebuddy-pet/assets/runtime/package.json`, `src/main.js`, `src/renderer.html`, `src/renderer.js`: desktop window runtime.
- `packs/codebuddy-pet/skills/codebuddy-pet/scripts/codebuddy-pet.js`: CLI for init/show/hide/uninstall/hook/start.

Modify:
- `.codebuddy-plugin/marketplace.json`: add CodeBuddy marketplace entry.
- `registry/index.json`: add registry entry.
- `README.md`: add ASCII-safe row and detail section.
- `tests/marketplace.test.ts`: add tests for registration, assets, install layout, and CLI behavior.

Do not overwrite or revert existing unrelated changes, especially current `codebuddy-usage-report` work.

---

### Task 1: Add Failing Marketplace And Resource Tests

**Files:**
- Modify: `tests/marketplace.test.ts`
- Test: `tests/marketplace.test.ts`

- [ ] **Step 1: Add CodeBuddy pet command constants**

Add near existing command constants:

```ts
const CODEBUDDY_PET_COMMANDS = [
  "CodeBuddy-Pet-init",
  "CodeBuddy-Pet-show",
  "CodeBuddy-Pet-hide",
  "CodeBuddy-Pet-uninstall",
];

const CODEBUDDY_PET_COMMAND_PATHS = CODEBUDDY_PET_COMMANDS.map(
  (command) => `./commands/${command}.md`,
);
```

- [ ] **Step 2: Add CodeBuddy marketplace root expectation**

In `test("exposes a CodeBuddy-native marketplace root"...)`, insert `"codebuddy-pet"` after `"cb-hud"`:

```ts
      "cb-hud",
      "codebuddy-pet",
      "codebuddy-usage-report",
```

- [ ] **Step 3: Add CodeBuddy plugin manifest expectation**

In `test("each pack exposes a CodeBuddy plugin manifest"...)`, after the `cbHud` assertions, add:

```ts
    const codebuddyPet = JSON.parse(
      fs.readFileSync(
        path.join(repoRoot(), "packs", "codebuddy-pet", ".codebuddy-plugin", "plugin.json"),
        "utf-8",
      ),
    ) as { name: string; skills?: string[]; commands?: string[] };
    expect(codebuddyPet.name).toBe("codebuddy-pet");
    expect(codebuddyPet.skills).toEqual(["./skills/codebuddy-pet"]);
    expect(codebuddyPet.commands).toEqual(CODEBUDDY_PET_COMMAND_PATHS);
```

- [ ] **Step 4: Update registry list expectations**

In `test("lists packs from the registry"...)`, change pack count to 14, insert `"codebuddy-pet"` after `"cb-hud"`, and add:

```ts
    expect(byName.get("codebuddy-pet")?.platformSupport).toEqual({
      codex: false,
      claude: false,
      codebuddy: true,
      opencode: false,
    });
    expect(byName.get("codebuddy-pet")?.contents.skills).toEqual(["codebuddy-pet"]);
    expect(byName.get("codebuddy-pet")?.contents.commands).toEqual(CODEBUDDY_PET_COMMANDS);
```

- [ ] **Step 5: Add embedded resource test**

Add inside the top-level `describe` block:

```ts
  test("codebuddy-pet embeds ikunchick pet assets", async () => {
    const petDir = path.join(repoRoot(), "packs", "codebuddy-pet", "skills", "codebuddy-pet", "assets", "pets", "ikunchick");
    expect(fs.existsSync(path.join(petDir, "pet.json"))).toBe(true);
    expect(fs.existsSync(path.join(petDir, "spritesheet.webp"))).toBe(true);
    const petJson = JSON.parse(fs.readFileSync(path.join(petDir, "pet.json"), "utf-8")) as Record<string, unknown>;
    expect(Object.keys(petJson).length).toBeGreaterThan(0);
    expect(fs.statSync(path.join(petDir, "spritesheet.webp")).size).toBeGreaterThan(1024);
  });
```

- [ ] **Step 6: Add CodeBuddy install layout test**

Add inside the top-level `describe` block:

```ts
  test("installs codebuddy-pet for CodeBuddy only", async () => {
    const workspace = tempWorkspace();
    process.env.SKILL_MARKETPLACE_HOME = path.join(workspace, "home");
    const record = await installPack({ registryPath: registryPath(), packName: "codebuddy-pet", scope: "global", cwd: workspace, platform: "all" });
    expect(record.platforms).toEqual(["codebuddy"]);
    const pluginRoot = path.join(workspace, "home", ".codebuddy", "plugins", "marketplaces", "sad-marketplace", "plugins", "codebuddy-pet");
    expect(fs.existsSync(path.join(pluginRoot, "skills", "codebuddy-pet", "SKILL.md"))).toBe(true);
    expect(fs.existsSync(path.join(pluginRoot, "commands", "CodeBuddy-Pet-init.md"))).toBe(true);
    expect(fs.existsSync(path.join(pluginRoot, "skills", "codebuddy-pet", "assets", "pets", "ikunchick", "pet.json"))).toBe(true);
    expect(fs.existsSync(path.join(pluginRoot, "skills", "codebuddy-pet", "assets", "pets", "ikunchick", "spritesheet.webp"))).toBe(true);
  });
```

- [ ] **Step 7: Run tests to verify failure**

Run: `npm test -- --runInBand`

Expected: FAIL due to missing `codebuddy-pet` pack files and registry entries.

- [ ] **Step 8: Commit failing tests only if red commits are acceptable**

Run: `git add tests/marketplace.test.ts && git commit -m "test: cover CodeBuddy pet marketplace pack"`

Expected: commit contains only `tests/marketplace.test.ts`.

---

### Task 2: Create Pack Skeleton And Embedded Pet Assets

**Files:**
- Create: `packs/codebuddy-pet/pack.json`
- Create: `packs/codebuddy-pet/.codebuddy-plugin/plugin.json`
- Create: `packs/codebuddy-pet/skills/codebuddy-pet/SKILL.md`
- Create: `packs/codebuddy-pet/skills/codebuddy-pet/agents/openai.yaml`
- Create: `packs/codebuddy-pet/commands/CodeBuddy-Pet-init.md`
- Create: `packs/codebuddy-pet/commands/CodeBuddy-Pet-show.md`
- Create: `packs/codebuddy-pet/commands/CodeBuddy-Pet-hide.md`
- Create: `packs/codebuddy-pet/commands/CodeBuddy-Pet-uninstall.md`
- Create: `packs/codebuddy-pet/skills/codebuddy-pet/assets/pets/ikunchick/pet.json`
- Create: `packs/codebuddy-pet/skills/codebuddy-pet/assets/pets/ikunchick/spritesheet.webp`

- [ ] **Step 1: Create `pack.json`**

```json
{
  "name": "codebuddy-pet",
  "version": "1.0.0",
  "description": "CodeBuddy-only desktop pet with embedded ikunchick assets and hook-driven status bubbles",
  "author": { "name": "Local Publisher" },
  "license": "MIT",
  "tags": ["codebuddy", "pet", "desktop-pet", "hooks", "ikunchick"],
  "platformSupport": { "codex": false, "claude": false, "codebuddy": true, "opencode": false },
  "contents": {
    "skills": [{ "name": "codebuddy-pet", "path": "skills/codebuddy-pet", "kind": "platform" }],
    "commands": [
      { "name": "CodeBuddy-Pet-init", "path": "commands/CodeBuddy-Pet-init.md", "kind": "platform" },
      { "name": "CodeBuddy-Pet-show", "path": "commands/CodeBuddy-Pet-show.md", "kind": "platform" },
      { "name": "CodeBuddy-Pet-hide", "path": "commands/CodeBuddy-Pet-hide.md", "kind": "platform" },
      { "name": "CodeBuddy-Pet-uninstall", "path": "commands/CodeBuddy-Pet-uninstall.md", "kind": "platform" }
    ]
  },
  "codebuddy": { "pluginName": "codebuddy-pet", "category": "productivity" }
}
```

- [ ] **Step 2: Create CodeBuddy plugin manifest**

Create `packs/codebuddy-pet/.codebuddy-plugin/plugin.json`:

```json
{
  "name": "codebuddy-pet",
  "version": "1.0.0",
  "description": "CodeBuddy-only desktop pet with embedded ikunchick assets and hook-driven status bubbles",
  "skills": ["./skills/codebuddy-pet"],
  "commands": [
    "./commands/CodeBuddy-Pet-init.md",
    "./commands/CodeBuddy-Pet-show.md",
    "./commands/CodeBuddy-Pet-hide.md",
    "./commands/CodeBuddy-Pet-uninstall.md"
  ]
}
```

- [ ] **Step 3: Extract embedded pet assets**

Run:

```powershell
New-Item -ItemType Directory -Force -Path "packs\codebuddy-pet\skills\codebuddy-pet\assets\pets\ikunchick" | Out-Null
tar -xf "C:\Users\13603\Downloads\archives\ikunchick.zip" -C "packs\codebuddy-pet\skills\codebuddy-pet\assets\pets\ikunchick"
Get-ChildItem "packs\codebuddy-pet\skills\codebuddy-pet\assets\pets\ikunchick"
```

Expected: exactly `pet.json` and `spritesheet.webp` are present.

- [ ] **Step 4: Create `agents/openai.yaml`**

```yaml
name: codebuddy-pet
description: Install and manage a CodeBuddy desktop pet that reacts to CodeBuddy hooks and shows status bubbles.
```

- [ ] **Step 5: Create `SKILL.md`**

```markdown
---
name: codebuddy-pet
description: Use when installing, showing, hiding, uninstalling, or debugging the CodeBuddy desktop pet with embedded ikunchick assets and hook-driven status bubbles.
---

# CodeBuddy Pet

Install and manage a CodeBuddy-only desktop pet for the current project.

## Workflow

1. Confirm the target project root.
2. Run `node scripts/codebuddy-pet.js init --project <project>` from the installed skill directory.
3. Restart CodeBuddy so it reloads `.codebuddy/settings.json` hooks.
4. Verify state manually with `node scripts/codebuddy-pet.js hook busy --project <project>`.
5. Start the pet with `node scripts/codebuddy-pet.js start --project <project>` if it is not already visible.

## Commands

- `CodeBuddy-Pet-init`: install runtime files, embedded ikunchick assets, state file, and CodeBuddy hooks.
- `CodeBuddy-Pet-show`: re-enable hooks and make the pet visible again.
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
```

- [ ] **Step 6: Create command docs**

Each command doc locates `<marketplace-root>/plugins/codebuddy-pet/skills/codebuddy-pet/scripts/codebuddy-pet.js` and runs the matching command:

```markdown
---
description: Initialize the CodeBuddy desktop pet in a project
argument-hint: [project-path]
allowed-tools: [Bash(node *), Read, Glob]
---

Locate the installed script:

`<marketplace-root>/plugins/codebuddy-pet/skills/codebuddy-pet/scripts/codebuddy-pet.js`

Run it for the current project or the user-provided path:

`node "<script>" init --project <project-path>`

After initialization, restart CodeBuddy so it reloads `.codebuddy/settings.json` hooks.
```

For `show`, `hide`, and `uninstall`, use the same frontmatter shape and replace the command line with `show`, `hide`, or `uninstall`. The hide doc must state that project-local files are preserved. The uninstall doc must state that `.codebuddy/codebuddy-pet/` is deleted.

- [ ] **Step 7: Run tests**

Run: `npm test -- --runInBand`

Expected: resource test passes; registration tests still fail until Task 5.

- [ ] **Step 8: Commit skeleton**

Run: `git add packs/codebuddy-pet tests/marketplace.test.ts && git commit -m "feat: add CodeBuddy pet pack skeleton"`

Expected: commit includes new pack skeleton, assets, and test changes.

---

### Task 3: Implement CLI State And Hook Management

**Files:**
- Create: `packs/codebuddy-pet/skills/codebuddy-pet/scripts/codebuddy-pet.js`
- Modify: `tests/marketplace.test.ts`

- [ ] **Step 1: Create CLI script with these functions**

Create `codebuddy-pet.js` as an ESM Node script with these required functions and behavior:

```js
#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const command = process.argv[2] || "help";
const argv = process.argv.slice(3);
const scriptPath = fileURLToPath(import.meta.url);
const skillDir = path.resolve(path.dirname(scriptPath), "..");
const runtimeSourceDir = path.join(skillDir, "assets", "runtime");
const petSourceDir = path.join(skillDir, "assets", "pets", "ikunchick");

try {
  if (command === "init") runInit(argv);
  else if (command === "show") runShow(argv);
  else if (command === "hide") runHide(argv);
  else if (command === "uninstall") runUninstall(argv);
  else if (command === "hook") await runHook(argv, await readStdin());
  else if (command === "start") runStart(argv);
  else printHelp();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
```

Implement `runInit`, `runShow`, `runHide`, and `runUninstall` using the same config merge pattern as `packs/cb-hud/skills/cb-hud/scripts/cb-hud.js`: read `.codebuddy/settings.json`, preserve unrelated fields, remove old `codebuddy-pet.js` hook commands before appending current hook commands, and write formatted JSON.

Required hook definitions:

```js
const definitions = {
  SessionStart: [{ hooks: [hookCommand(commandFor("SessionStart"))] }],
  UserPromptSubmit: [{ hooks: [hookCommand(commandFor("UserPromptSubmit"))] }],
  PreToolUse: [{ matcher: "*", hooks: [hookCommand(commandFor("PreToolUse"))] }],
  PostToolUse: [{ matcher: "*", hooks: [hookCommand(commandFor("PostToolUse"))] }],
  Notification: [{ hooks: [hookCommand(commandFor("Notification"))] }],
  Stop: [{ hooks: [hookCommand(commandFor("Stop"))] }],
  SessionEnd: [{ hooks: [hookCommand(commandFor("SessionEnd"))] }],
};
```

Required phase mapping:

```js
const direct = new Set(["idle", "busy", "tool", "ask", "done"]);
if (direct.has(value)) return value;
if (value === "SessionStart" || value === "SessionEnd") return "idle";
if (value === "UserPromptSubmit" || value === "PostToolUse") return "busy";
if (value === "PreToolUse") return "tool";
if (value === "Notification") return "ask";
if (value === "Stop") return "done";
return "idle";
```

Required state path: `<project>/.codebuddy/codebuddy-pet/state.json`.

Required state fields: `phase`, `title`, `message`, `skill`, `tool`, `sessionStartedAt`, `updatedAt`.

- [ ] **Step 2: Add dry-run and hook state test**

Add inside `tests/marketplace.test.ts`:

```ts
  test("codebuddy-pet CLI supports dry-run and hook state updates", async () => {
    const workspace = tempWorkspace();
    const script = path.join(repoRoot(), "packs", "codebuddy-pet", "skills", "codebuddy-pet", "scripts", "codebuddy-pet.js");
    const dryRun = spawnSync("node", [script, "init", "--project", workspace, "--dry-run"], { encoding: "utf-8" });
    expect(dryRun.status).toBe(0);
    expect(dryRun.stdout).toContain("codebuddy-pet");
    const hook = spawnSync("node", [script, "hook", "PreToolUse", "--project", workspace], { encoding: "utf-8", input: JSON.stringify({ tool_name: "Bash", skill: "codebuddy-pet" }) });
    expect(hook.status).toBe(0);
    const state = JSON.parse(fs.readFileSync(path.join(workspace, ".codebuddy", "codebuddy-pet", "state.json"), "utf-8")) as { phase: string; tool: string; message: string };
    expect(state.phase).toBe("tool");
    expect(state.tool).toBe("Bash");
    expect(state.message).toBe("Using Bash");
  });
```

- [ ] **Step 3: Add unrelated hook preservation test**

Add inside `tests/marketplace.test.ts`:

```ts
  test("codebuddy-pet init preserves unrelated CodeBuddy hooks", async () => {
    const workspace = tempWorkspace();
    const settingsDir = path.join(workspace, ".codebuddy");
    fs.mkdirSync(settingsDir, { recursive: true });
    fs.writeFileSync(path.join(settingsDir, "settings.json"), JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: "node other-hook.js" }] }] } }, null, 2), "utf-8");
    const script = path.join(repoRoot(), "packs", "codebuddy-pet", "skills", "codebuddy-pet", "scripts", "codebuddy-pet.js");
    const result = spawnSync("node", [script, "init", "--project", workspace], { encoding: "utf-8" });
    expect(result.status).toBe(0);
    const settings = JSON.parse(fs.readFileSync(path.join(settingsDir, "settings.json"), "utf-8")) as { hooks?: Record<string, Array<{ hooks: Array<{ command: string }> }>> };
    expect(settings.hooks?.Stop?.some((group) => group.hooks.some((hook) => hook.command === "node other-hook.js"))).toBe(true);
    expect(Object.values(settings.hooks || {}).some((groups) => groups.some((group) => group.hooks.some((hook) => hook.command.includes("codebuddy-pet.js"))))).toBe(true);
  });
```

- [ ] **Step 4: Run syntax and tests**

Run:

```powershell
node --check packs\codebuddy-pet\skills\codebuddy-pet\scripts\codebuddy-pet.js
npm test -- --runInBand
```

Expected: syntax check passes. Tests may still fail on registration until Task 5.

- [ ] **Step 5: Commit CLI work**

Run: `git add packs/codebuddy-pet/skills/codebuddy-pet/scripts/codebuddy-pet.js tests/marketplace.test.ts && git commit -m "feat: add CodeBuddy pet CLI hooks"`

---

### Task 4: Add Runtime Window Assets

**Files:**
- Create: `packs/codebuddy-pet/skills/codebuddy-pet/assets/runtime/package.json`
- Create: `packs/codebuddy-pet/skills/codebuddy-pet/assets/runtime/src/main.js`
- Create: `packs/codebuddy-pet/skills/codebuddy-pet/assets/runtime/src/renderer.html`
- Create: `packs/codebuddy-pet/skills/codebuddy-pet/assets/runtime/src/renderer.js`
- Modify: `packs/codebuddy-pet/skills/codebuddy-pet/scripts/codebuddy-pet.js`

- [ ] **Step 1: Create runtime `package.json`**

```json
{
  "name": "codebuddy-pet-runtime",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Project-local CodeBuddy desktop pet runtime",
  "main": "src/main.js",
  "dependencies": { "electron": "^38.5.1" }
}
```

- [ ] **Step 2: Create Electron main process**

Create `src/main.js` with a transparent, borderless, always-on-top `BrowserWindow` sized `220x220`. It must resolve `--project`, expose `codebuddy-pet-context` over `ipcMain.handle`, and return:

```js
{
  project,
  statePath: path.join(project, ".codebuddy", "codebuddy-pet", "state.json"),
  petDir: path.join(project, ".codebuddy", "codebuddy-pet", "pets", "ikunchick")
}
```

Use `nodeIntegration: true` and `contextIsolation: false` for this local-only MVP runtime.

- [ ] **Step 3: Create renderer HTML**

Create `src/renderer.html` with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' file: data:; img-src 'self' file: data:;" />
    <title>CodeBuddy Pet</title>
    <style>
      html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: transparent; font-family: Arial, sans-serif; user-select: none; }
      #pet-root { position: relative; width: 100vw; height: 100vh; -webkit-app-region: drag; }
      #sprite { position: absolute; left: 50%; bottom: 14px; width: 128px; height: 128px; transform: translateX(-50%); object-fit: contain; pointer-events: auto; -webkit-app-region: no-drag; }
      #bubble { position: absolute; left: 50%; top: 8px; max-width: 180px; transform: translateX(-50%); padding: 8px 10px; border-radius: 8px; background: rgba(24,24,28,0.88); color: white; font-size: 12px; line-height: 1.35; white-space: pre-line; opacity: 0; transition: opacity 120ms ease; pointer-events: auto; -webkit-app-region: no-drag; }
      #bubble.visible { opacity: 1; }
    </style>
  </head>
  <body>
    <div id="pet-root"><div id="bubble"></div><img id="sprite" alt="CodeBuddy Pet" /></div>
    <script type="module" src="./renderer.js"></script>
  </body>
</html>
```

- [ ] **Step 4: Create renderer logic**

Create `src/renderer.js` that:

```js
const { ipcRenderer } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const sprite = document.getElementById("sprite");
const bubble = document.getElementById("bubble");
const root = document.getElementById("pet-root");
let context;
let bubbleVisible = true;
let lastStateText = "";

init();
async function init() {
  context = await ipcRenderer.invoke("codebuddy-pet-context");
  sprite.src = pathToFileUrl(path.join(context.petDir, "spritesheet.webp"));
  root.addEventListener("click", () => { bubbleVisible = !bubbleVisible; renderBubble(readState()); });
  setInterval(tick, 400);
  tick();
}
function tick() {
  const state = readState();
  const text = JSON.stringify(state);
  if (text === lastStateText) return;
  lastStateText = text;
  sprite.dataset.phase = state.phase || "idle";
  renderBubble(state);
}
function readState() {
  try { return JSON.parse(fs.readFileSync(context.statePath, "utf-8")); }
  catch { return { phase: "idle", message: "Ready", title: "CodeBuddy", skill: "", tool: "" }; }
}
function renderBubble(state) {
  const details = [state.message || "Ready"];
  if (state.skill) details.push(`Skill: ${state.skill}`);
  if (state.tool) details.push(`Tool: ${state.tool}`);
  if (state.sessionStartedAt) details.push(`Time: ${formatElapsed(state.sessionStartedAt)}`);
  bubble.textContent = details.join("\n");
  bubble.classList.toggle("visible", bubbleVisible);
}
function formatElapsed(value) {
  const started = Date.parse(value);
  if (!Number.isFinite(started)) return "0s";
  const seconds = Math.max(0, Math.round((Date.now() - started) / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes}m ${rest}s` : `${rest}s`;
}
function pathToFileUrl(filePath) {
  return `file:///${filePath.replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1:")}`;
}
```

- [ ] **Step 5: Update CLI `start` to use Electron**

`runStart` must look for `<project>/.codebuddy/codebuddy-pet/runtime/node_modules/.bin/electron.cmd` on Windows. If absent, fall back to `npx electron <runtimeDir> --project <project>`. Start detached with `windowsHide: true`.

- [ ] **Step 6: Run syntax checks**

Run:

```powershell
node --check packs\codebuddy-pet\skills\codebuddy-pet\scripts\codebuddy-pet.js
node --check packs\codebuddy-pet\skills\codebuddy-pet\assets\runtime\src\main.js
node --check packs\codebuddy-pet\skills\codebuddy-pet\assets\runtime\src\renderer.js
```

Expected: all exit 0.

- [ ] **Step 7: Commit runtime work**

Run: `git add packs/codebuddy-pet/skills/codebuddy-pet/assets/runtime packs/codebuddy-pet/skills/codebuddy-pet/scripts/codebuddy-pet.js && git commit -m "feat: add CodeBuddy pet runtime"`

---

### Task 5: Register Pack In Marketplace And Docs

**Files:**
- Modify: `.codebuddy-plugin/marketplace.json`
- Modify: `registry/index.json`
- Modify: `README.md`
- Modify: `tests/marketplace.test.ts`

- [ ] **Step 1: Add `.codebuddy-plugin/marketplace.json` entry**

Add after `cb-hud` and before `codebuddy-usage-report`:

```json
{
  "name": "codebuddy-pet",
  "description": "CodeBuddy-only desktop pet with embedded ikunchick assets and hook-driven status bubbles",
  "version": "1.0.0",
  "source": "./packs/codebuddy-pet",
  "category": "productivity",
  "author": { "name": "Local Publisher" },
  "license": "MIT",
  "skills": ["./packs/codebuddy-pet/skills/codebuddy-pet"],
  "commands": [
    "./packs/codebuddy-pet/commands/CodeBuddy-Pet-init.md",
    "./packs/codebuddy-pet/commands/CodeBuddy-Pet-show.md",
    "./packs/codebuddy-pet/commands/CodeBuddy-Pet-hide.md",
    "./packs/codebuddy-pet/commands/CodeBuddy-Pet-uninstall.md"
  ]
}
```

- [ ] **Step 2: Add `registry/index.json` entry**

Add after `cb-hud` and before `codebuddy-usage-report`:

```json
{
  "name": "codebuddy-pet",
  "version": "1.0.0",
  "description": "CodeBuddy-only desktop pet with embedded ikunchick assets and hook-driven status bubbles",
  "author": { "name": "Local Publisher" },
  "license": "MIT",
  "tags": ["codebuddy", "pet", "desktop-pet", "hooks", "ikunchick"],
  "source": "./packs/codebuddy-pet",
  "platformSupport": { "codex": false, "claude": false, "codebuddy": true, "opencode": false },
  "install": { "unit": "pack" },
  "contents": {
    "skills": ["codebuddy-pet"],
    "commands": ["CodeBuddy-Pet-init", "CodeBuddy-Pet-show", "CodeBuddy-Pet-hide", "CodeBuddy-Pet-uninstall"]
  }
}
```

- [ ] **Step 3: Update README with ASCII-safe text**

Add row near `cb-hud`:

```markdown
| codebuddy-pet | CodeBuddy-only desktop pet using embedded ikunchick assets and hook-driven status bubbles | - | - | yes | - |
```

Add detail section near `cb-hud`:

```markdown
### codebuddy-pet

CodeBuddy-only desktop pet pack. It embeds the user-provided `ikunchick` pet assets and installs project-local CodeBuddy hooks that update `idle`, `busy`, `tool`, `ask`, and `done` state.

- Skill: `codebuddy-pet`
- Commands: `CodeBuddy-Pet-init`, `CodeBuddy-Pet-show`, `CodeBuddy-Pet-hide`, `CodeBuddy-Pet-uninstall`
- Project files: `<project>/.codebuddy/codebuddy-pet/`
- State file: `<project>/.codebuddy/codebuddy-pet/state.json`
```

- [ ] **Step 4: Validate JSON**

Run:

```powershell
node -e "JSON.parse(require('fs').readFileSync('.codebuddy-plugin/marketplace.json','utf8')); JSON.parse(require('fs').readFileSync('registry/index.json','utf8')); console.log('json ok')"
```

Expected: `json ok`.

- [ ] **Step 5: Run full verification**

Run:

```powershell
npm test
npm run build
```

Expected: both exit 0.

- [ ] **Step 6: Commit registration and docs**

Run: `git add .codebuddy-plugin/marketplace.json registry/index.json README.md tests/marketplace.test.ts && git commit -m "feat: register CodeBuddy pet pack"`

---

### Task 6: Manual Temporary Project Verification

**Files:**
- No repository file changes expected unless bugs are found.

- [ ] **Step 1: Create temp project**

```powershell
$tmp = Join-Path $env:TEMP ("codebuddy-pet-check-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$tmp
```

- [ ] **Step 2: Run init**

```powershell
node packs\codebuddy-pet\skills\codebuddy-pet\scripts\codebuddy-pet.js init --project $tmp
```

Expected: output contains `CodeBuddy Pet initialized`.

- [ ] **Step 3: Inspect generated files**

```powershell
Get-ChildItem -Recurse -File (Join-Path $tmp ".codebuddy\codebuddy-pet") | Select-Object FullName,Length
Get-Content (Join-Path $tmp ".codebuddy\settings.json")
Get-Content (Join-Path $tmp ".codebuddy\codebuddy-pet\state.json")
```

Expected: runtime files, pet assets, settings hooks, and state JSON exist.

- [ ] **Step 4: Simulate hook states**

```powershell
node packs\codebuddy-pet\skills\codebuddy-pet\scripts\codebuddy-pet.js hook busy --project $tmp
node packs\codebuddy-pet\skills\codebuddy-pet\scripts\codebuddy-pet.js hook tool --project $tmp --tool Bash
node packs\codebuddy-pet\skills\codebuddy-pet\scripts\codebuddy-pet.js hook ask --project $tmp
node packs\codebuddy-pet\skills\codebuddy-pet\scripts\codebuddy-pet.js hook done --project $tmp
node packs\codebuddy-pet\skills\codebuddy-pet\scripts\codebuddy-pet.js hook idle --project $tmp
Get-Content (Join-Path $tmp ".codebuddy\codebuddy-pet\state.json")
```

Expected: final state phase is `idle`.

- [ ] **Step 5: Verify hide/show/uninstall**

```powershell
node packs\codebuddy-pet\skills\codebuddy-pet\scripts\codebuddy-pet.js hide --project $tmp
node packs\codebuddy-pet\skills\codebuddy-pet\scripts\codebuddy-pet.js show --project $tmp
node packs\codebuddy-pet\skills\codebuddy-pet\scripts\codebuddy-pet.js uninstall --project $tmp
Test-Path (Join-Path $tmp ".codebuddy\codebuddy-pet")
```

Expected: `Test-Path` prints `False`.

- [ ] **Step 6: Optional visual runtime check**

Run only if Electron is available or using `npx electron` is acceptable:

```powershell
node packs\codebuddy-pet\skills\codebuddy-pet\scripts\codebuddy-pet.js init --project $tmp
node packs\codebuddy-pet\skills\codebuddy-pet\scripts\codebuddy-pet.js start --project $tmp
```

Expected: a small transparent desktop pet window appears, is nonblank, draggable, and toggles its bubble on click.

- [ ] **Step 7: Commit fixes if needed**

If manual verification requires code fixes, run:

```powershell
git add packs/codebuddy-pet tests/marketplace.test.ts .codebuddy-plugin/marketplace.json registry/index.json README.md
git commit -m "fix: harden CodeBuddy pet project install"
```

Expected: no commit is needed if verification passes without changes.

---

## Self-Review Checklist

- Spec coverage: Tasks cover new pack, embedded `ikunchick`, CodeBuddy-only registration, commands, hooks, state, runtime, error handling, automated tests, and manual checks.
- Scope: The plan excludes token/cost/Git/SVN dashboard, multi-platform support, runtime pet downloads, and complex skin switching as specified.
- Type consistency: The CLI uses `phase`, `message`, `skill`, `tool`, `sessionStartedAt`, and `updatedAt` consistently with the spec.
- Existing work safety: The plan explicitly preserves unrelated current `codebuddy-usage-report` changes and unrelated CodeBuddy settings.
- Placeholder scan: `Working...` is intentional runtime text, not a placeholder.
