import { app, BrowserWindow, ipcMain, screen } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { createApiServer } from "./api-server.js";
import { createIslandState } from "./island-state.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const island = createIslandState();
const api = createApiServer({ island });

let mainWindow;

app.setName("Floating Island");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");

app.whenReady().then(async () => {
  createWindow();
  wireIslandUpdates();

  const port = await api.start();
  console.log(`Floating Island API listening on http://127.0.0.1:${port}`);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async () => {
  await api.stop();
});

ipcMain.handle("island:get-state", () => island.getState());
ipcMain.handle("island:command", (_event, command) => island.applyCommand(command));
ipcMain.handle("window:close", () => mainWindow?.close());

function createWindow() {
  const { width, x, y } = screen.getPrimaryDisplay().workArea;
  const windowWidth = 260;
  const windowHeight = 56;

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: Math.round(x + (width - windowWidth) / 2),
    y: y + 18,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setAlwaysOnTop(true, "screen-saver");
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.loadFile(path.join(__dirname, "../public/index.html"));
}

function wireIslandUpdates() {
  island.subscribe((state) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.webContents.send("island:state", state);
    mainWindow.showInactive();
  });
}
