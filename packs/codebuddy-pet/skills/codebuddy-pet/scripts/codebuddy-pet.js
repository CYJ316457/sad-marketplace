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

function runInit(args) {
  const project = resolveProject(args);
  const dryRun = hasFlag(args, "--dry-run");
  assertPetAssets();
  const localDir = localPetDir(project);
  const settingsPath = codebuddySettingsPath(project);
  const statePath = codebuddyStatePath(project);

  if (dryRun) {
    console.log(JSON.stringify({ action: "init", project, localDir, settingsPath, statePath }, null, 2));
    return;
  }

  if (fs.existsSync(runtimeSourceDir)) {
    copyDirectory(runtimeSourceDir, path.join(localDir, "runtime"));
  }
  copyDirectory(petSourceDir, path.join(localDir, "pets", "ikunchick"));
  writeState(project, defaultState("idle", "Ready"));
  const settings = readJson(settingsPath);
  settings.hooks = mergePetHooks(settings.hooks || {}, scriptPath, project);
  writeJson(settingsPath, settings);
  console.log(`CodeBuddy Pet initialized: ${localDir}`);
}

function runShow(args) {
  const project = resolveProject(args);
  const settingsPath = codebuddySettingsPath(project);
  const settings = readJson(settingsPath);
  settings.hooks = mergePetHooks(settings.hooks || {}, scriptPath, project);
  writeJson(settingsPath, settings);
  writeState(project, defaultState("idle", "Ready"));
  console.log(`CodeBuddy Pet enabled: ${settingsPath}`);
}

function runHide(args) {
  const project = resolveProject(args);
  const settingsPath = codebuddySettingsPath(project);
  const settings = readJson(settingsPath);
  settings.hooks = removePetHooks(settings.hooks || {});
  writeJson(settingsPath, settings);
  writeState(project, defaultState("idle", "Hidden"));
  console.log(`CodeBuddy Pet hidden: ${settingsPath}`);
}

function runUninstall(args) {
  const project = resolveProject(args);
  const settingsPath = codebuddySettingsPath(project);
  const settings = readJson(settingsPath);
  settings.hooks = removePetHooks(settings.hooks || {});
  writeJson(settingsPath, settings);
  fs.rmSync(localPetDir(project), { recursive: true, force: true });
  console.log(`CodeBuddy Pet uninstalled: ${settingsPath}`);
}

async function runHook(args, rawInput) {
  const eventOrPhase = args[0] || "idle";
  const payload = parseJson(rawInput);
  const project = resolveProject(args, payload.cwd || payload.workspace?.current_dir || process.cwd());
  const tool = optionValue(args, "--tool") || payload.tool_name || payload.tool?.name || payload.tool_input?.name || "";
  const skill = optionValue(args, "--skill") || inferSkill(payload);
  const phase = phaseForEvent(eventOrPhase, payload.hook_event_name);
  const message = messageForPhase(phase, tool);
  const previous = readJson(codebuddyStatePath(project));
  const sessionStartedAt = previous.sessionStartedAt || new Date().toISOString();
  writeState(project, {
    phase,
    title: "CodeBuddy",
    message,
    skill,
    tool,
    sessionStartedAt,
    updatedAt: new Date().toISOString(),
  });
  console.log(`CodeBuddy Pet state: ${phase}`);
}

function runStart(args) {
  const project = resolveProject(args);
  const runtimeDir = path.join(localPetDir(project), "runtime");
  const runtimeMain = path.join(runtimeDir, "src", "main.js");
  if (!fs.existsSync(runtimeMain)) {
    throw new Error(`Runtime not installed. Run init first for ${project}`);
  }
  const electronBin = resolveElectronBin(runtimeDir);
  const child = spawn(electronBin.command, [...electronBin.args, runtimeDir, "--project", project], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  console.log(`CodeBuddy Pet started for ${project}`);
}

function resolveElectronBin(runtimeDir) {
  const localCmd = path.join(runtimeDir, "node_modules", ".bin", process.platform === "win32" ? "electron.cmd" : "electron");
  if (fs.existsSync(localCmd)) return { command: localCmd, args: [] };
  return { command: "npx", args: ["electron"] };
}

function mergePetHooks(hooks, currentScriptPath, project) {
  const next = removePetHooks(hooks);
  const commandFor = (event) => `node "${currentScriptPath}" hook ${event} --project "${project}"`;
  const definitions = {
    SessionStart: [{ hooks: [hookCommand(commandFor("SessionStart"))] }],
    UserPromptSubmit: [{ hooks: [hookCommand(commandFor("UserPromptSubmit"))] }],
    PreToolUse: [{ matcher: "*", hooks: [hookCommand(commandFor("PreToolUse"))] }],
    PostToolUse: [{ matcher: "*", hooks: [hookCommand(commandFor("PostToolUse"))] }],
    Notification: [{ hooks: [hookCommand(commandFor("Notification"))] }],
    Stop: [{ hooks: [hookCommand(commandFor("Stop"))] }],
    SessionEnd: [{ hooks: [hookCommand(commandFor("SessionEnd"))] }],
  };
  for (const [event, groups] of Object.entries(definitions)) {
    next[event] = [...(next[event] || []), ...groups];
  }
  return next;
}

function removePetHooks(hooks) {
  const next = {};
  for (const [event, groups] of Object.entries(hooks || {})) {
    const remaining = (groups || [])
      .map((group) => ({
        ...group,
        hooks: (group.hooks || []).filter((hook) => !String(hook.command || "").includes("codebuddy-pet.js")),
      }))
      .filter((group) => group.hooks.length);
    if (remaining.length) next[event] = remaining;
  }
  return next;
}

function hookCommand(commandLine) {
  return { type: "command", command: commandLine, timeout: 3 };
}

function phaseForEvent(eventOrPhase, payloadEvent) {
  const value = eventOrPhase || payloadEvent || "idle";
  const direct = new Set(["idle", "busy", "tool", "ask", "done"]);
  if (direct.has(value)) return value;
  if (value === "SessionStart" || value === "SessionEnd") return "idle";
  if (value === "UserPromptSubmit" || value === "PostToolUse") return "busy";
  if (value === "PreToolUse") return "tool";
  if (value === "Notification") return "ask";
  if (value === "Stop") return "done";
  return "idle";
}

function messageForPhase(phase, tool) {
  if (phase === "busy") return "Working...";
  if (phase === "tool") return tool ? `Using ${tool}` : "Using tool";
  if (phase === "ask") return "Need input";
  if (phase === "done") return "Done";
  return "Ready";
}

function defaultState(phase, message) {
  const now = new Date().toISOString();
  return {
    phase,
    title: "CodeBuddy",
    message,
    skill: "",
    tool: "",
    sessionStartedAt: now,
    updatedAt: now,
  };
}

function writeState(project, state) {
  writeJson(codebuddyStatePath(project), state);
}

function assertPetAssets() {
  for (const file of ["pet.json", "spritesheet.webp"]) {
    const fullPath = path.join(petSourceDir, file);
    if (!fs.existsSync(fullPath)) throw new Error(`Missing embedded pet asset: ${fullPath}`);
  }
}

function localPetDir(project) {
  return path.join(project, ".codebuddy", "codebuddy-pet");
}

function codebuddySettingsPath(project) {
  return path.join(project, ".codebuddy", "settings.json");
}

function codebuddyStatePath(project) {
  return path.join(localPetDir(project), "state.json");
}

function resolveProject(args, fallback = ".") {
  const value = optionValue(args, "--project") || fallback;
  return path.resolve(value);
}

function optionValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : "";
}

function hasFlag(args, name) {
  return args.includes(name);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(source, target, { recursive: true, force: true });
}

async function readStdin() {
  if (process.stdin.isTTY) return "";
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

function parseJson(rawInput) {
  if (!rawInput || !rawInput.trim()) return {};
  try {
    return JSON.parse(rawInput);
  } catch {
    return {};
  }
}

function inferSkill(payload) {
  return payload.skill || payload.skill_name || payload.command_name || payload.active_skill || "";
}

function printHelp() {
  console.log("Usage: codebuddy-pet.js init|show|hide|uninstall|hook|start --project <path>");
}
