import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, ipcMain } from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const project = resolveProject(process.argv.slice(2));

let windowRef;

await app.whenReady();
createWindow();

app.on("window-all-closed", () => {
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
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  windowRef.setMenuBarVisibility(false);
  windowRef.loadFile(path.join(__dirname, "renderer.html"));
}

function resolveProject(args) {
  const index = args.indexOf("--project");
  const value = index >= 0 ? args[index + 1] : process.cwd();
  return path.resolve(value);
}
