const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronUtilsRender", {
  gamepadButtonPress: (buttonName) =>
    ipcRenderer.send("gamepadButtonPress", buttonName),
  exitApp: () => ipcRenderer.send("exitApp"),
  toggleMiniPlayer: () => ipcRenderer.invoke("toggleMiniPlayer"),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("toggleAlwaysOnTop"),
  toggleFullScreen: () => ipcRenderer.invoke("toggleFullScreen"),
  setWindowOpacity: (opacity) => ipcRenderer.invoke("setWindowOpacity", opacity),
  getWindowOpacity: () => ipcRenderer.invoke("getWindowOpacity"),
  captureScreenshot: (meta) => ipcRenderer.invoke("captureScreenshot", meta),
  openExternal: (url) => ipcRenderer.send("openExternal", url),
  onWindowModeChanged: (callback) => {
    if (typeof callback === "function") {
      ipcRenderer.on("windowModeChanged", (_, state) => callback(state));
    }
  },
});
