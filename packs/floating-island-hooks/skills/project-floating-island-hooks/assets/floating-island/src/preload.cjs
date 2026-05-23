const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("floatingIsland", {
  getState: () => ipcRenderer.invoke("island:get-state"),
  sendCommand: (command) => ipcRenderer.invoke("island:command", command),
  close: () => ipcRenderer.invoke("window:close"),
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("island:state", listener);
    return () => ipcRenderer.off("island:state", listener);
  }
});
