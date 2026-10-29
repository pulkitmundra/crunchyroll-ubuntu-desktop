const { contextBridge, ipcRenderer } = require("electron");

window.addEventListener(
  "pointerdown",
  () => {
    ipcRenderer.send("internalPointerInteraction");
  },
  true
);

window.addEventListener(
  "mousedown",
  () => {
    ipcRenderer.send("internalPointerInteraction");
  },
  true
);

window.addEventListener(
  "wheel",
  () => {
    ipcRenderer.send("internalPointerInteraction");
  },
  { capture: true, passive: true }
);

let lastHoverSend = 0;
function onPointerHover() {
  const now = Date.now();
  if (now - lastHoverSend > 80) {
    lastHoverSend = now;
    ipcRenderer.send("internalPointerHover", true);
  }
}

window.addEventListener("pointerenter", () => {
  ipcRenderer.send("internalPointerHover", true);
}, true);

window.addEventListener("pointermove", onPointerHover, { capture: true, passive: true });
window.addEventListener("mousemove", onPointerHover, { capture: true, passive: true });

window.addEventListener("pointerleave", (e) => {
  if (!e.relatedTarget) {
    ipcRenderer.send("internalPointerHover", false);
  }
}, true);

window.addEventListener("mouseleave", (e) => {
  if (!e.relatedTarget) {
    ipcRenderer.send("internalPointerHover", false);
  }
}, true);

contextBridge.exposeInMainWorld("electronUtilsRender", {
  gamepadButtonPress: (buttonName) =>
    ipcRenderer.send("gamepadButtonPress", buttonName),
  exitApp: () => ipcRenderer.send("exitApp"),
  toggleMiniPlayer: () => ipcRenderer.invoke("toggleMiniPlayer"),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("toggleAlwaysOnTop"),
  toggleFullScreen: () => ipcRenderer.invoke("toggleFullScreen"),
  onWindowModeChanged: (callback) => {
    if (typeof callback === "function") {
      ipcRenderer.on("windowModeChanged", (_, state) => callback(state));
    }
  },
});
