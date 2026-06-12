const { ipcRenderer } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const canvas = document.getElementById("sprite");
const context2d = canvas.getContext("2d");
const bubble = document.getElementById("bubble");
const root = document.getElementById("pet-root");

let context;
let petConfig;
let spritesheet;
let activeState = { phase: "idle", message: "Ready", title: "CodeBuddy", skill: "", tool: "" };
let activeAnimation = "idle";
let animationStartedAt = 0;
let temporaryAnimation;
let bubbleVisible = true;
let lastStateText = "";
let reactionTimer;
let pointerDown;
let isDragging = false;
let suppressNextClick = false;
let lastMenuAt = 0;

init();

async function init() {
  context = await ipcRenderer.invoke("codebuddy-pet-context");
  petConfig = readPetConfig();
  setupCanvas();
  await loadSpritesheet();
  canvas.addEventListener("click", reactToPetClick);
  bubble.addEventListener("click", toggleBubble);
  bindPointerInteractions(root);
  bindPointerInteractions(canvas);
  bindPointerInteractions(bubble);
  window.addEventListener("pointermove", movePotentialDrag);
  window.addEventListener("pointerup", stopPotentialDrag);
  window.addEventListener("pointercancel", stopPotentialDrag);
  setInterval(tick, 250);
  tick();
  requestAnimationFrame(drawLoop);
}

function tick() {
  const state = readState();
  const text = JSON.stringify(state);
  if (text === lastStateText) return;
  lastStateText = text;
  activeState = state;
  setAnimation(state.phase || "idle");
  renderBubble(state);
}

function reactToPetClick(event) {
  if (suppressNextClick) { suppressNextClick = false; return; }
  event.stopPropagation();
  bubbleVisible = true;
  playTemporaryAnimation("tap");
  bubble.classList.add("react");
  renderBubble({ ...readState(), message: randomReaction() });
  clearTimeout(reactionTimer);
  reactionTimer = setTimeout(() => {
    bubble.classList.remove("react");
    renderBubble(readState());
  }, animationDuration("tap"));
}

function toggleBubble(event) {
  if (suppressNextClick) { suppressNextClick = false; return; }
  event.stopPropagation();
  bubbleVisible = !bubbleVisible;
  renderBubble(readState());
}

function bindPointerInteractions(element) {
  element.addEventListener("contextmenu", showContextMenu);
  element.addEventListener("pointerdown", startPotentialDrag);
}

function showContextMenu(event) {
  event.preventDefault();
  event.stopPropagation();
  if (event.type === "contextmenu" && Date.now() - lastMenuAt < 300) return;
  lastMenuAt = Date.now();
  stopPotentialDrag(event);
  ipcRenderer.send("codebuddy-pet-show-menu");
}

function startPotentialDrag(event) {
  if (event.button === 2) {
    showContextMenu(event);
    return;
  }
  if (event.button !== 0) return;
  event.stopPropagation();
  event.currentTarget?.setPointerCapture?.(event.pointerId);
  pointerDown = {
    id: event.pointerId,
    target: event.currentTarget,
    screenX: event.screenX,
    screenY: event.screenY,
  };
}

function movePotentialDrag(event) {
  if (!pointerDown) return;
  const movedX = event.screenX - pointerDown.screenX;
  const movedY = event.screenY - pointerDown.screenY;
  if (!isDragging && Math.hypot(movedX, movedY) < 4) return;

  if (!isDragging) {
    isDragging = true;
    suppressNextClick = true;
    root.classList.add("dragging");
    ipcRenderer.send("codebuddy-pet-drag-start", { screenX: pointerDown.screenX, screenY: pointerDown.screenY });
  }

  ipcRenderer.send("codebuddy-pet-drag-move", { screenX: event.screenX, screenY: event.screenY });
}

function stopPotentialDrag(event) {
  if (pointerDown?.target && pointerDown.id !== undefined) {
    pointerDown.target.releasePointerCapture?.(pointerDown.id);
  }
  pointerDown = undefined;
  if (!isDragging) return;
  event?.stopPropagation?.();
  suppressNextClick = true;
  isDragging = false;
  root.classList.remove("dragging");
  ipcRenderer.send("codebuddy-pet-drag-end");
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(context.statePath, "utf-8"));
  } catch {
    return { phase: "idle", message: "Ready", title: "CodeBuddy", skill: "", tool: "" };
  }
}

function readPetConfig() {
  try {
    return JSON.parse(fs.readFileSync(path.join(context.petDir, "pet.json"), "utf-8"));
  } catch {
    return {
      spritesheetPath: "spritesheet.webp",
      frameWidth: 192,
      frameHeight: 208,
      columns: 8,
      fps: 8,
      animations: { idle: [0] },
    };
  }
}

function setupCanvas() {
  canvas.width = petConfig.frameWidth || 192;
  canvas.height = petConfig.frameHeight || 208;
  context2d.imageSmoothingEnabled = false;
}

function loadSpritesheet() {
  return new Promise((resolve, reject) => {
    spritesheet = new Image();
    spritesheet.onload = resolve;
    spritesheet.onerror = reject;
    spritesheet.src = pathToFileUrl(path.join(context.petDir, petConfig.spritesheetPath || "spritesheet.webp"));
  });
}

function drawLoop(timestamp) {
  drawFrame(timestamp);
  requestAnimationFrame(drawLoop);
}

function drawFrame(timestamp) {
  const animation = currentAnimation(timestamp);
  const frames = framesFor(animation);
  const fps = Math.max(1, petConfig.fps || 8);
  const frameIndex = frames[Math.floor((timestamp - animationStartedAt) / (1000 / fps)) % frames.length];
  const columns = petConfig.columns || 1;
  const frameWidth = petConfig.frameWidth || canvas.width;
  const frameHeight = petConfig.frameHeight || canvas.height;
  const sourceX = (frameIndex % columns) * frameWidth;
  const sourceY = Math.floor(frameIndex / columns) * frameHeight;

  context2d.clearRect(0, 0, canvas.width, canvas.height);
  context2d.drawImage(spritesheet, sourceX, sourceY, frameWidth, frameHeight, 0, 0, canvas.width, canvas.height);
}

function currentAnimation(timestamp) {
  if (temporaryAnimation && timestamp < temporaryAnimation.until) return temporaryAnimation.name;
  if (temporaryAnimation) {
    temporaryAnimation = undefined;
    setAnimation(activeState.phase || "idle", timestamp);
  }
  return activeAnimation;
}

function setAnimation(name, timestamp = performance.now()) {
  const next = framesFor(name).length ? name : "idle";
  if (next === activeAnimation && !temporaryAnimation) return;
  activeAnimation = next;
  animationStartedAt = timestamp;
}

function playTemporaryAnimation(name) {
  const now = performance.now();
  temporaryAnimation = {
    name: framesFor(name).length ? name : "idle",
    until: now + animationDuration(name),
  };
  animationStartedAt = now;
}

function animationDuration(name) {
  const fps = Math.max(1, petConfig.fps || 8);
  return Math.max(600, Math.ceil((framesFor(name).length / fps) * 1000));
}

function framesFor(name) {
  return petConfig.animations?.[name] || petConfig.animations?.idle || [0];
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

function randomReaction() {
  const reactions = ["Hey!", "Still here", "Watching the task", "Tap tap", "Ready when you are"];
  return reactions[Math.floor(Math.random() * reactions.length)];
}

function pathToFileUrl(filePath) {
  return `file:///${filePath.replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1:")}`;
}
