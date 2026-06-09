import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, Menu, ipcMain } from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const project = resolveProject(process.argv.slice(2));
const logPath = path.join(project, ".codebuddy", "codebuddy-pet", "runtime.log");

let windowRef;
let dragOffset;

logRuntime("main:start");

app.whenReady()
  .then(() => {
    logRuntime("app:ready");
    createWindow();
  })
  .catch((error) => {
    logRuntime(`app:ready-error ${error instanceof Error ? error.message : String(error)}`);
  });

app.on("window-all-closed", () => {
  logRuntime("app:window-all-closed");
  app.quit();
});

ipcMain.handle("codebuddy-pet-context", () => ({
  project,
  statePath: path.join(project, ".codebuddy", "codebuddy-pet", "state.json"),
  petDir: path.join(project, ".codebuddy", "codebuddy-pet", "pets", "ikunchick"),
}));

ipcMain.on("codebuddy-pet-drag-start", (_event, point) => {
  if (!windowRef) return;
  const [windowX, windowY] = windowRef.getPosition();
  dragOffset = {
    x: Number(point?.screenX) - windowX,
    y: Number(point?.screenY) - windowY,
  };
});

ipcMain.on("codebuddy-pet-drag-move", (_event, point) => {
  if (!windowRef || !dragOffset) return;
  const nextX = Math.round(Number(point?.screenX) - dragOffset.x);
  const nextY = Math.round(Number(point?.screenY) - dragOffset.y);
  windowRef.setPosition(nextX, nextY, false);
});

ipcMain.on("codebuddy-pet-drag-end", () => {
  dragOffset = undefined;
});

ipcMain.on("codebuddy-pet-show-menu", () => {
  if (!windowRef) return;
  const menu = Menu.buildFromTemplate([
    {
      label: "Close",
      click: () => {
        logRuntime("menu:close");
        app.quit();
      },
    },
  ]);
  menu.popup({ window: windowRef });
});

function createWindow() {
  windowRef = new BrowserWindow({
    width: 240,
    height: 280,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    show: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  windowRef.setMenuBarVisibility(false);
  windowRef.webContents.on("did-fail-load", (_event, code, description) => logRuntime(`window:fail-load ${code} ${description}`));
  windowRef.webContents.on("did-finish-load", () => logRuntime("window:finish-load"));
  windowRef.on("closed", () => logRuntime("window:closed"));
  logRuntime("window:create");
  windowRef.loadFile(path.join(__dirname, "renderer.html"));
}

function resolveProject(args) {
  const index = args.indexOf("--project");
  const value = index >= 0 ? args[index + 1] : process.cwd();
  return path.resolve(value);
}

function logRuntime(message) {
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `${new Date().toISOString()} ${message}\n`, "utf8");
  } catch {}
}
