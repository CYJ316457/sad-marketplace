#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const command = process.argv[2] || "help";
const argv = process.argv.slice(3);

const scriptPath = fileURLToPath(import.meta.url);
const skillDir = path.resolve(path.dirname(scriptPath), "..");
const runtimeSourceDir = path.join(skillDir, "assets", "runtime");
const petSourceDir = path.join(skillDir, "assets", "pets", "ikunchick");
const petProcessName = "codebuddy-pet";
const stalePetProcessMs = 60_000;
const staleStartLockMs = 30_000;

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
  const noStart = shouldSkipStart(args);
  const noInstall = shouldSkipInstall(args);
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
  if (!noInstall) ensureRuntimeDependencies(path.join(localDir, "runtime"));
  writeState(project, defaultState("idle", "Ready"));
  const settings = readJson(settingsPath);
  settings.hooks = mergePetHooks(settings.hooks || {}, scriptPath, project);
  writeJson(settingsPath, settings);
  console.log(`CodeBuddy Pet initialized: ${localDir}`);
  if (noStart) return;
  startPet(project);
}

function runShow(args) {
  const project = resolveProject(args);
  const noStart = shouldSkipStart(args);
  const noInstall = shouldSkipInstall(args);
  installLocalFiles(project, { skipInstall: noInstall });
  const settingsPath = codebuddySettingsPath(project);
  const settings = readJson(settingsPath);
  settings.hooks = mergePetHooks(settings.hooks || {}, scriptPath, project);
  writeJson(settingsPath, settings);
  writeState(project, defaultState("idle", "Ready"));
  console.log(`CodeBuddy Pet enabled: ${settingsPath}`);
  if (noStart) return;
  startPet(project);
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
  startPet(project);
}

function startPet(project) {
  const runtimeDir = path.join(localPetDir(project), "runtime");
  const runtimeMain = path.join(runtimeDir, "src", "main.js");
  if (!fs.existsSync(runtimeMain)) {
    throw new Error(`Runtime not installed. Run init first for ${project}`);
  }
  if (reuseRunningPet(project)) return;

  const lockAcquired = acquireStartLock(project);
  if (!lockAcquired) {
    console.log(`CodeBuddy Pet already starting for ${project}`);
    return;
  }

  try {
    if (reuseRunningPet(project)) return;
    ensureRuntimeDependencies(runtimeDir);
    const electronBin = resolveElectronBin(runtimeDir);
    const child = spawnDetached(electronBin.command, [...electronBin.args, runtimeDir, "--project", project], runtimeDir);
    child.on("error", (error) => {
      removePetProcess(project);
      console.error(`CodeBuddy Pet failed to start: ${error.message}`);
      process.exitCode = 1;
    });
    if (child.pid && electronBin.trackPid) writePetProcess(project, child.pid);
    child.unref();
    console.log(`CodeBuddy Pet started for ${project}`);
  } finally {
    releaseStartLock(project);
  }
}

function reuseRunningPet(project) {
  const existingProcess = readPetProcess(project);
  if (!existingProcess) return false;
  if (isPetProcessCurrent(existingProcess, project)) {
    console.log(`CodeBuddy Pet already running for ${project}`);
    return true;
  }
  removePetProcess(project);
  return false;
}

function installLocalFiles(project, options = {}) {
  assertPetAssets();
  const localDir = localPetDir(project);
  if (fs.existsSync(runtimeSourceDir)) {
    copyDirectory(runtimeSourceDir, path.join(localDir, "runtime"));
  }
  copyDirectory(petSourceDir, path.join(localDir, "pets", "ikunchick"));
  if (!options.skipInstall) ensureRuntimeDependencies(path.join(localDir, "runtime"));
}

function ensureRuntimeDependencies(runtimeDir) {
  const packageJsonPath = path.join(runtimeDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`Missing runtime package.json: ${packageJsonPath}`);
  }
  if (fs.existsSync(path.join(runtimeDir, "node_modules", "electron"))) return;

  const npm = findOnPath(process.platform === "win32" ? "npm.cmd" : "npm") || findOnPath("npm");
  if (!npm) throw new Error("npm is required to install CodeBuddy Pet runtime dependencies");
  console.log("Installing CodeBuddy Pet runtime dependencies...");
  const result = spawnSync(npm, ["install", "--omit=dev"], {
    cwd: runtimeDir,
    stdio: "inherit",
    shell: process.platform === "win32" && /\.(?:cmd|bat)$/i.test(npm),
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`npm install failed with exit code ${result.status}`);
  }
}

function resolveElectronBin(runtimeDir) {
  const npmDir = path.join(runtimeDir, "node_modules");
  const isWin = process.platform === "win32";
  // Prefer the real executable on Windows. Spawning .cmd shims directly can fail
  // with EINVAL in embedded terminals and agent runtimes.
  const directExe = path.join(npmDir, "electron", "dist", isWin ? "electron.exe" : "electron");
  if (fs.existsSync(directExe)) return { command: directExe, args: [], trackPid: true };
  // Check .bin shims (created by npm for most packages)
  const localCmd = path.join(npmDir, ".bin", isWin ? "electron.cmd" : "electron");
  if (fs.existsSync(localCmd)) return { command: localCmd, args: [], trackPid: false };
  const npx = findOnPath(isWin ? "npx.cmd" : "npx") || findOnPath("npx");
  return { command: npx || (isWin ? "npx.cmd" : "npx"), args: ["electron"], trackPid: false };
}

function spawnDetached(commandPath, args, cwd) {
  const useShell = process.platform === "win32" && /\.(?:cmd|bat)$/i.test(commandPath);
  return spawn(commandPath, args, {
    cwd,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    shell: useShell,
  });
}

function findOnPath(executable) {
  const pathValue = process.env.PATH || "";
  for (const entry of pathValue.split(path.delimiter)) {
    if (!entry) continue;
    const fullPath = path.join(entry, executable);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return "";
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

function readPetProcess(project) {
  try {
    const record = readJson(codebuddyPidPath(project));
    const pid = Number(record.pid);
    if (!Number.isInteger(pid) || pid <= 0) return undefined;
    return {
      name: String(record.name || ""),
      pid,
      project: String(record.project || ""),
      updatedAt: String(record.updatedAt || ""),
    };
  } catch {
    return undefined;
  }
}

function writePetProcess(project, pid) {
  writeJsonAtomic(codebuddyPidPath(project), petProcessRecord(project, pid));
}

function petProcessRecord(project, pid) {
  return {
    name: petProcessName,
    pid,
    project,
    updatedAt: new Date().toISOString(),
  };
}

function isPetProcessCurrent(record, project) {
  return record.name === petProcessName && sameProject(record.project, project) && isRecentTimestamp(record.updatedAt, stalePetProcessMs) && isProcessRunning(record.pid);
}

function isRecentTimestamp(value, maxAgeMs) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && Date.now() - timestamp <= maxAgeMs;
}

function removePetProcess(project) {
  fs.rmSync(codebuddyPidPath(project), { force: true });
}

function acquireStartLock(project) {
  const lockPath = codebuddyStartLockPath(project);
  try {
    createStartLock(lockPath, project);
    return true;
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    if (!isStaleStartLock(project)) return false;
    if (!acquireRecoveryLock(project)) return false;
    try {
      if (!isStaleStartLock(project)) return false;
      releaseStartLock(project);
      try {
        createStartLock(lockPath, project);
        return true;
      } catch (retryError) {
        if (retryError?.code === "EEXIST") return false;
        throw retryError;
      }
    } finally {
      releaseRecoveryLock(project);
    }
  }
}

function createStartLock(lockPath, project) {
  fs.mkdirSync(lockPath, { recursive: false });
  writeJsonAtomic(path.join(lockPath, "owner.json"), petProcessRecord(project, process.pid));
}

function isStaleStartLock(project) {
  const lockPath = codebuddyStartLockPath(project);
  const ownerPath = path.join(lockPath, "owner.json");
  if (!fs.existsSync(ownerPath)) return !isRecentPath(lockPath, staleStartLockMs);

  let owner;
  try {
    owner = readJson(ownerPath);
  } catch {
    return !isRecentPath(ownerPath, staleStartLockMs);
  }
  const pid = Number(owner.pid);
  return owner.name !== petProcessName || !sameProject(String(owner.project || ""), project) || !Number.isInteger(pid) || pid <= 0 || !isProcessRunning(pid);
}

function isRecentPath(filePath, maxAgeMs) {
  try {
    return Date.now() - fs.statSync(filePath).mtimeMs <= maxAgeMs;
  } catch {
    return false;
  }
}

function releaseStartLock(project) {
  fs.rmSync(codebuddyStartLockPath(project), { recursive: true, force: true });
}

function acquireRecoveryLock(project) {
  try {
    fs.mkdirSync(codebuddyRecoveryLockPath(project), { recursive: false });
    return true;
  } catch (error) {
    if (error?.code === "EEXIST") return false;
    throw error;
  }
}

function releaseRecoveryLock(project) {
  fs.rmSync(codebuddyRecoveryLockPath(project), { recursive: true, force: true });
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
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

function codebuddyPidPath(project) {
  return path.join(localPetDir(project), "pet.pid");
}

function codebuddyStartLockPath(project) {
  return path.join(localPetDir(project), "start.lock");
}

function codebuddyRecoveryLockPath(project) {
  return path.join(localPetDir(project), "start-recovery.lock");
}

function resolveProject(args, fallback = ".") {
  const value = optionValue(args, "--project") || fallback;
  return normalizeProjectPath(value);
}

function normalizeProjectPath(value) {
  const resolved = path.resolve(value);
  let realPath = resolved;
  try {
    realPath = fs.realpathSync.native(resolved);
  } catch {}
  return process.platform === "win32" ? realPath.toLowerCase() : realPath;
}

function sameProject(left, right) {
  return normalizeProjectPath(left) === normalizeProjectPath(right);
}

function optionValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : "";
}

function hasFlag(args, name) {
  return args.includes(name);
}

function shouldSkipStart(args) {
  return hasFlag(args, "--no-start") || process.env.CODEBUDDY_PET_NO_START === "1";
}

function shouldSkipInstall(args) {
  return hasFlag(args, "--no-install") || process.env.CODEBUDDY_PET_NO_INSTALL === "1";
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

function writeJsonAtomic(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
  fs.renameSync(tempPath, filePath);
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
