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

const command = process.argv[2] || "statusline";

if (command === "statusline") {
  const input = await readStdin();
  renderStatusLine(input);
} else if (["init", "show", "hide", "uninstall"].includes(command)) {
  runProjectCommand(command, process.argv.slice(3));
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
  const project = basename(cwd);
  const model = data.model?.display_name || data.model?.id || "CodeBuddy";
  const session = shortSession(data.session_id);
  const git = gitInfo(cwd);
  const duration = formatDuration(data.cost?.total_duration_ms);
  const cost = formatCost(data.cost?.total_cost_usd);
  const diff = formatDiff(data.cost?.total_lines_added, data.cost?.total_lines_removed);
  const version = data.version ? `v${data.version}` : "";

  const parts = [
    `${ANSI.bold}${ANSI.cyan}CB HUD${ANSI.reset}`,
    `${ANSI.green}${model}${ANSI.reset}`,
    `${ANSI.blue}${project}${ANSI.reset}`,
    session ? `${ANSI.dim}#${session}${ANSI.reset}` : "",
    git,
    duration,
    cost,
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
    state.enabled = false;
    writeJson(settingsPath, settings);
    writeJson(statePath, state);
    console.log(`CB HUD hidden: ${settingsPath}`);
    return;
  }

  const settings = readJson(settingsPath);
  if (isCbHudStatusLine(settings.statusLine)) delete settings.statusLine;
  writeJson(settingsPath, settings);
  fs.rmSync(stateDir, { recursive: true, force: true });
  console.log(`CB HUD uninstalled: ${settingsPath}`);
}

function resolveProject(argv) {
  const index = argv.indexOf("--project");
  const value = index >= 0 ? argv[index + 1] : ".";
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
