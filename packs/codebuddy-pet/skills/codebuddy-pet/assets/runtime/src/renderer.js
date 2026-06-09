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
  root.addEventListener("click", () => {
    bubbleVisible = !bubbleVisible;
    renderBubble(readState());
  });
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
  try {
    return JSON.parse(fs.readFileSync(context.statePath, "utf-8"));
  } catch {
    return { phase: "idle", message: "Ready", title: "CodeBuddy", skill: "", tool: "" };
  }
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
