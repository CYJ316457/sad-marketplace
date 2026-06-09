import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, ipcMain } from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const project = resolveProject(process.argv.slice(2));
const logPath = path.join(project, ".codebuddy", "codebuddy-pet", "runtime.log");

let windowRef;

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

function createWindow() {
  windowRef = new BrowserWindow({
    width: 220,
    height: 220,
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
