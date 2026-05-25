#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
};

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const command = process.argv[2] || "statusline";

if (command === "statusline") {
  const input = await readStdin();
  renderStatusLine(input);
} else if (["init", "show", "hide", "uninstall"].includes(command)) {
  runProjectCommand(command, process.argv.slice(3));
} else if (command === "hook") {
  const input = await readStdin();
  runHook(process.argv[3], process.argv.slice(4), input);
} else {
  console.error(`Unknown cb-hud command: ${command}`);
  process.exit(1);
}

async function readStdin() {
  let data = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

function renderStatusLine(rawInput) {
  const data = parseJson(rawInput);
  const cwd = data.workspace?.current_dir || data.cwd || process.cwd();
  const activity = readActivityState(cwd);
  const project = basename(cwd);
  const model = data.model?.display_name || data.model?.id || "CodeBuddy";
  const session = shortSession(data.session_id);
  const git = gitInfo(cwd);
  const duration = formatDuration(data.cost?.total_duration_ms);
  const cost = formatCost(data.cost?.total_cost_usd);
  const tokens = formatTokens(data);
  const diff = formatDiff(data.cost?.total_lines_added, data.cost?.total_lines_removed);
  const version = data.version ? `v${data.version}` : "";

  const parts = [
    hudTitle(activity),
    activityLine(activity),
    `${ANSI.green}🤖 ${model}${ANSI.reset}`,
    `${ANSI.blue}📁 ${project}${ANSI.reset}`,
    session ? `${ANSI.dim}#${session}${ANSI.reset}` : "",
    git,
    duration,
    cost,
    tokens,
    diff,
    version ? `${ANSI.dim}${version}${ANSI.reset}` : "",
  ].filter(Boolean);

  console.log(parts.join(`${ANSI.dim} | ${ANSI.reset}`));
}

function runProjectCommand(action, argv) {
  const project = resolveProject(argv);
  const settingsPath = path.join(project, ".codebuddy", "settings.json");
  const stateDir = path.join(project, ".codebuddy", "cb-hud");
  const statePath = path.join(stateDir, "state.json");
  const scriptPath = fileURLToPath(import.meta.url);
  const commandLine = `node "${scriptPath}" statusline`;

  if (action === "init" || action === "show") {
    const settings = readJson(settingsPath);
    const state = readJson(statePath);
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.mkdirSync(stateDir, { recursive: true });
    if (settings.statusLine && !isCbHudStatusLine(settings.statusLine)) {
      state.previousStatusLine = settings.statusLine;
    }
    settings.statusLine = {
      type: "command",
      command: commandLine,
      padding: 0,
    };
    settings.hooks = mergeCbHudHooks(settings.hooks || {}, scriptPath, project);
    state.enabled = true;
    state.command = commandLine;
    writeJson(settingsPath, settings);
    writeJson(statePath, state);
    console.log(`CB HUD enabled: ${settingsPath}`);
    return;
  }

  if (action === "hide") {
    const settings = readJson(settingsPath);
    fs.mkdirSync(stateDir, { recursive: true });
    const state = readJson(statePath);
    if (settings.statusLine) state.hiddenStatusLine = settings.statusLine;
    if (isCbHudStatusLine(settings.statusLine)) delete settings.statusLine;
    settings.hooks = removeCbHudHooks(settings.hooks || {});
    state.enabled = false;
    writeJson(settingsPath, settings);
    writeJson(statePath, state);
    console.log(`CB HUD hidden: ${settingsPath}`);
    return;
  }

  const settings = readJson(settingsPath);
  if (isCbHudStatusLine(settings.statusLine)) delete settings.statusLine;
  settings.hooks = removeCbHudHooks(settings.hooks || {});
  writeJson(settingsPath, settings);
  fs.rmSync(stateDir, { recursive: true, force: true });
  console.log(`CB HUD uninstalled: ${settingsPath}`);
}

function runHook(eventName, argv, rawInput) {
  const data = parseJson(rawInput);
  const project = resolveProject(argv, data.cwd || data.workspace?.current_dir);
  const stateDir = path.join(project, ".codebuddy", "cb-hud");
  const statePath = path.join(stateDir, "state.json");
  const state = readJson(statePath);
  const activity = state.activity || {};
  const event = eventName || data.hook_event_name || "Status";
  const now = new Date().toISOString();

  if (event === "UserPromptSubmit") {
    activity.state = "thinking";
    activity.currentTool = undefined;
  } else if (event === "PreToolUse") {
    activity.state = "tool";
    activity.currentTool = data.tool_name || data.tool?.name || data.matcher || "tool";
    activity.lastTool = activity.currentTool;
  } else if (event === "PostToolUse" || event === "PostToolUseFailure") {
    activity.state = event === "PostToolUseFailure" ? "tool-error" : "thinking";
    activity.lastTool = data.tool_name || activity.currentTool || activity.lastTool;
    activity.currentTool = undefined;
  } else if (event === "Stop" || event === "SessionEnd") {
    activity.state = "done";
    activity.currentTool = undefined;
  } else if (event === "SessionStart") {
    activity.state = "idle";
    activity.currentTool = undefined;
  }

  activity.lastEvent = event;
  activity.updatedAt = now;
  activity.lastSkill = inferSkill(data) || activity.lastSkill;
  state.activity = activity;
  writeJson(statePath, state);
}

function resolveProject(argv, fallback = ".") {
  const index = argv.indexOf("--project");
  const value = index >= 0 ? argv[index + 1] : fallback;
  return path.resolve(value || ".");
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

function isCbHudStatusLine(statusLine) {
  return typeof statusLine?.command === "string" && statusLine.command.includes("cb-hud.js");
}

function mergeCbHudHooks(hooks, scriptPath, project) {
  const commandFor = (event) => `node "${scriptPath}" hook ${event} --project "${project}"`;
  const next = removeCbHudHooks(hooks);
  const definitions = {
    SessionStart: [{ hooks: [hookCommand(commandFor("SessionStart"))] }],
    UserPromptSubmit: [{ hooks: [hookCommand(commandFor("UserPromptSubmit"))] }],
    PreToolUse: [{ matcher: "*", hooks: [hookCommand(commandFor("PreToolUse"))] }],
    PostToolUse: [{ matcher: "*", hooks: [hookCommand(commandFor("PostToolUse"))] }],
    PostToolUseFailure: [{ matcher: "*", hooks: [hookCommand(commandFor("PostToolUseFailure"))] }],
    Stop: [{ hooks: [hookCommand(commandFor("Stop"))] }],
    SessionEnd: [{ hooks: [hookCommand(commandFor("SessionEnd"))] }],
  };

  for (const [event, groups] of Object.entries(definitions)) {
    next[event] = [...(next[event] || []), ...groups];
  }
  return next;
}

function removeCbHudHooks(hooks) {
  const next = {};
  for (const [event, groups] of Object.entries(hooks || {})) {
    const remaining = (groups || [])
      .map((group) => ({
        ...group,
        hooks: (group.hooks || []).filter((hook) => {
          return !String(hook.command || "").includes("cb-hud.js");
        }),
      }))
      .filter((group) => group.hooks.length);
    if (remaining.length) next[event] = remaining;
  }
  return next;
}

function hookCommand(commandLine) {
  return {
    type: "command",
    command: commandLine,
    timeout: 2,
  };
}

function readActivityState(cwd) {
  const state = readJson(path.join(cwd, ".codebuddy", "cb-hud", "state.json"));
  return state.activity || {};
}

function activityLine(activity) {
  const state = activity.state || "idle";
  const status = statusBadge(state);
  const tool = activity.currentTool
    ? `${ANSI.bold}${ANSI.yellow}🔧 TOOL ${activity.currentTool}${ANSI.reset}`
    : activity.lastTool
      ? `${ANSI.yellow}🛠 LAST ${activity.lastTool}${ANSI.reset}`
      : "";
  const skill = activity.lastSkill ? `${ANSI.magenta}🧩 ${activity.lastSkill}${ANSI.reset}` : "";
  return [status, tool, skill].filter(Boolean).join(" ");
}

function hudTitle(activity) {
  const state = activity.state || "idle";
  const emoji = state === "tool-error" ? "🔴" : state === "tool" ? "🔧" : state === "thinking" ? "🟡" : state === "done" ? "✅" : "🟢";
  return `${ANSI.bold}${ANSI.cyan}${emoji} CB HUD${ANSI.reset}`;
}

function statusBadge(state) {
  if (state === "tool") return `${ANSI.bold}${ANSI.yellow}${spinnerFrame()} TOOL${ANSI.reset}`;
  if (state === "thinking") return `${ANSI.yellow}${spinnerFrame()} THINKING${ANSI.reset}`;
  if (state === "tool-error") return `${ANSI.bold}${ANSI.red}🔴 TOOL ERROR${ANSI.reset}`;
  if (state === "done") return `${ANSI.green}✅ DONE${ANSI.reset}`;
  return `${ANSI.green}🟢 IDLE${ANSI.reset}`;
}

function spinnerFrame(now = Date.now()) {
  return SPINNER[Math.floor(now / 200) % SPINNER.length];
}

function inferSkill(data) {
  const values = [
    data.skill_name,
    data.skillName,
    data.command_name,
    data.commandName,
    data.source,
    data.matcher,
  ].filter(Boolean);
  return values.length ? String(values[0]) : "";
}

function parseJson(rawInput) {
  if (!rawInput.trim()) return {};
  try {
    return JSON.parse(rawInput);
  } catch {
    return {};
  }
}

function basename(value) {
  return path.basename(String(value).replace(/[/\\]+$/, "")) || String(value);
}

function shortSession(value) {
  return value ? String(value).slice(0, 8) : "";
}

function formatDuration(ms) {
  const value = Number(ms);
  if (!Number.isFinite(value) || value <= 0) return "";
  const totalSeconds = Math.round(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${ANSI.yellow}${minutes}m${seconds}s${ANSI.reset}`;
}

function formatCost(value) {
  const cost = Number(value);
  if (!Number.isFinite(cost) || cost <= 0) return "";
  return `${ANSI.magenta}$${cost.toFixed(4)}${ANSI.reset}`;
}

function formatTokens(data) {
  const input = firstNumber(
    data.cost?.total_input_tokens,
    data.cost?.input_tokens,
    data.usage?.total_input_tokens,
    data.usage?.input_tokens,
    data.usage?.prompt_tokens,
    data.total_input_tokens,
    data.input_tokens,
    data.prompt_tokens,
  );
  const output = firstNumber(
    data.cost?.total_output_tokens,
    data.cost?.output_tokens,
    data.usage?.total_output_tokens,
    data.usage?.output_tokens,
    data.usage?.completion_tokens,
    data.total_output_tokens,
    data.output_tokens,
    data.completion_tokens,
  );
  const parts = [
    input > 0 ? `⬆ ${formatTokenCount(input)} tok` : "",
    output > 0 ? `⬇ ${formatTokenCount(output)} tok` : "",
  ].filter(Boolean);
  return parts.length ? `${ANSI.cyan}${parts.join(" ")}${ANSI.reset}` : "";
}

function firstNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return 0;
}

function formatTokenCount(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
}

function formatDiff(added, removed) {
  const plus = Number(added) || 0;
  const minus = Number(removed) || 0;
  if (!plus && !minus) return "";
  return `${ANSI.green}+${plus}${ANSI.reset} ${ANSI.red}-${minus}${ANSI.reset}`;
}

function gitInfo(cwd) {
  try {
    const branch = execFileSync("git", ["-C", cwd, "branch", "--show-current"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!branch) return "";
    const status = execFileSync("git", ["-C", cwd, "status", "--porcelain"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return `${ANSI.cyan}${branch}${status ? "*" : ""}${ANSI.reset}`;
  } catch {
    return "";
  }
}
