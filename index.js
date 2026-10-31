const electron = require("electron");
const { app, BrowserWindow, ipcMain, screen } = electron;
const path = require("path");

let isMiniPlayer = false;
let isPinned = false;
let savedBounds = null;
let lastFloatingBounds = null;
let wasFullScreenBeforeMini = true;
let wasMaximizedBeforeMini = false;
let lastInternalPointerTime = 0;
let lastHoverTime = 0;
let isHoveringWindow = false;
let cursorAtBlur = null;
let lastShrinkTime = 0;
let focusRestoreTimer = null;
let isTransitioning = false;

function updateZoom(win) {
  if (!win || win.isDestroyed()) return;
  const bounds = win.getContentBounds();
  if (bounds.width > 0 && bounds.height > 0) {
    const scale = Math.min(bounds.width / 1920, bounds.height / 1080);
    win.webContents.setZoomFactor(Math.max(0.15, scale));
  }
  notifyMode(win);
}

function notifyMode(win) {
  if (!win || win.isDestroyed()) return;
  const bounds = win.getContentBounds();
  const scale =
    bounds.width > 0 && bounds.height > 0
      ? Math.max(0.15, Math.min(bounds.width / 1920, bounds.height / 1080))
      : 1;
  const isCompact = isMiniPlayer || bounds.width <= 720 || bounds.height <= 420;
  win.webContents.send("windowModeChanged", {
    isMiniPlayer,
    isPinned,
    isFullScreen: win.isFullScreen(),
    isCompact,
    scale,
  });
}

function getFullWorkAreaBounds(win) {
  const display =
    win && !win.isDestroyed()
      ? screen.getDisplayMatching(win.getBounds())
      : screen.getPrimaryDisplay();
  const wa = display.workArea;
  return {
    x: wa.x,
    y: wa.y,
    width: wa.width,
    height: wa.height,
  };
}

function getCenteredNormalBounds(win, width = 1280, height = 720) {
  const display =
    win && !win.isDestroyed()
      ? screen.getDisplayMatching(win.getBounds())
      : screen.getPrimaryDisplay();
  const wa = display.workArea;
  const w = Math.min(width, wa.width);
  const h = Math.min(height, wa.height);
  return {
    x: wa.x + Math.round((wa.width - w) / 2),
    y: wa.y + Math.round((wa.height - h) / 2),
    width: w,
    height: h,
  };
}

function getDefaultMiniBounds(win, width = 560, height = 315) {
  const display =
    win && !win.isDestroyed()
      ? screen.getDisplayMatching(win.getBounds())
      : screen.getPrimaryDisplay();
  const workArea = display.workArea;
  const margin = 24;
  return {
    x: workArea.x + workArea.width - width - margin,
    y: workArea.y + workArea.height - height - margin,
    width,
    height,
  };
}

function isValidMiniBounds(b) {
  return (
    b &&
    typeof b.width === "number" &&
    typeof b.height === "number" &&
    b.width >= 280 &&
    b.width <= 1400 &&
    b.height >= 160 &&
    b.height <= 900
  );
}

function isValidNormalBounds(b) {
  return (
    b &&
    typeof b.width === "number" &&
    typeof b.height === "number" &&
    b.width >= 960 &&
    b.height >= 540
  );
}

function applyAlwaysOnTop(win, enable) {
  if (!win || win.isDestroyed()) return;
  win.setAlwaysOnTop(enable, "screen-saver");
  win.setVisibleOnAllWorkspaces(enable, { visibleOnFullScreen: true });
}

function enforceMiniWindowDecoratedState(win, restoreBounds) {
  if (!win || win.isDestroyed() || !isMiniPlayer) return;
  if (win.isFullScreen()) {
    win.setFullScreen(false);
  }
  if (win.isMaximized()) {
    win.unmaximize();
  }
  win.setFullScreenable(true);
  win.setResizable(true);
  if (typeof win.setMovable === "function") {
    win.setMovable(true);
  }
  win.setMinimumSize(320, 180);
  if (restoreBounds) {
    win.setBounds(restoreBounds);
  }
  if (!win.isAlwaysOnTop()) {
    applyAlwaysOnTop(win, true);
  }
  updateZoom(win);
}

function shrinkToFloatingWindow(win, targetWidth = 560, targetHeight = 315) {
  if (!win || win.isDestroyed()) return;
  isTransitioning = true;
  lastShrinkTime = Date.now();
  isHoveringWindow = false;

  wasFullScreenBeforeMini = win.isFullScreen();
  wasMaximizedBeforeMini = !wasFullScreenBeforeMini && win.isMaximized();
  if (!wasFullScreenBeforeMini && !wasMaximizedBeforeMini) {
    const cur = win.getBounds();
    if (isValidNormalBounds(cur)) {
      savedBounds = {
        x: cur.x,
        y: cur.y,
        width: Math.max(1280, cur.width),
        height: Math.max(720, cur.height),
      };
    }
  }

  const restoreBounds = isValidMiniBounds(lastFloatingBounds)
    ? {
        x: lastFloatingBounds.x,
        y: lastFloatingBounds.y,
        width: lastFloatingBounds.width || targetWidth,
        height: lastFloatingBounds.height || targetHeight,
      }
    : getDefaultMiniBounds(win, targetWidth, targetHeight);

  if (win.isFullScreen() || win.isMaximized()) {
    if (win.isFullScreen()) {
      win.setFullScreen(false);
    }
    if (win.isMaximized()) {
      win.unmaximize();
    }
    setTimeout(() => {
      if (win.isDestroyed() || !isMiniPlayer) return;
      enforceMiniWindowDecoratedState(win, restoreBounds);
      setTimeout(() => {
        if (!win.isDestroyed() && isMiniPlayer) {
          enforceMiniWindowDecoratedState(
            win,
            win.getBounds().width > 1400 || win.isFullScreen()
              ? restoreBounds
              : null
          );
        }
        isTransitioning = false;
      }, 140);
    }, 65);
  } else {
    enforceMiniWindowDecoratedState(win, restoreBounds);
    setTimeout(() => {
      if (!win.isDestroyed() && isMiniPlayer) {
        enforceMiniWindowDecoratedState(win, null);
      }
      isTransitioning = false;
    }, 90);
  }
}

function expandFromFloatingToFull(win, keepPinned = true) {
  if (!win || win.isDestroyed()) return;
  isTransitioning = true;
  isMiniPlayer = false;
  isPinned = keepPinned;

  if (!keepPinned) {
    applyAlwaysOnTop(win, false);
  }

  if (win.isMaximized() && (wasFullScreenBeforeMini || keepPinned)) {
    win.unmaximize();
  }

  win.setResizable(true);
  if (typeof win.setMovable === "function") {
    win.setMovable(true);
  }

  if (wasFullScreenBeforeMini) {
    win.setFullScreen(true);
  } else if (wasMaximizedBeforeMini && !keepPinned) {
    win.maximize();
  } else if (keepPinned || wasMaximizedBeforeMini) {
    win.setBounds(getFullWorkAreaBounds(win));
  } else if (isValidNormalBounds(savedBounds)) {
    win.setBounds(savedBounds);
  } else {
    win.setBounds(getFullWorkAreaBounds(win));
  }

  if (keepPinned && !win.isAlwaysOnTop()) {
    applyAlwaysOnTop(win, true);
  }
  updateZoom(win);

  setTimeout(() => {
    if (!win.isDestroyed()) {
      if (wasFullScreenBeforeMini && !win.isFullScreen() && !isMiniPlayer) {
        win.setFullScreen(true);
      }
      updateZoom(win);
    }
    isTransitioning = false;
  }, 90);
}

function toggleMiniPlayerMode(win) {
  if (!win || win.isDestroyed()) return;
  if (!isMiniPlayer) {
    isMiniPlayer = true;
    isPinned = true;
    shrinkToFloatingWindow(win, 560, 315);
  } else {
    expandFromFloatingToFull(win, false);
  }
  const b = win.getContentBounds();
  return {
    isMiniPlayer,
    isPinned,
    isFullScreen: win.isFullScreen(),
    isCompact: isMiniPlayer || b.width <= 720 || b.height <= 420,
    scale: isMiniPlayer ? 560 / 1920 : Math.max(0.15, Math.min(b.width / 1920, b.height / 1080)),
  };
}

function togglePinMode(win) {
  if (!win || win.isDestroyed()) return;
  isPinned = !isPinned;
  if (!isPinned) {
    isMiniPlayer = false;
    applyAlwaysOnTop(win, false);
  } else {
    if (win.isMaximized() && !win.isFullScreen()) {
      isTransitioning = true;
      win.unmaximize();
      win.setBounds(getFullWorkAreaBounds(win));
      setTimeout(() => {
        isTransitioning = false;
        updateZoom(win);
      }, 60);
    }
    applyAlwaysOnTop(win, true);
  }
  notifyMode(win);
  const b = win.getContentBounds();
  return {
    isMiniPlayer,
    isPinned,
    isFullScreen: win.isFullScreen(),
    isCompact: isMiniPlayer || b.width <= 720 || b.height <= 420,
    scale: Math.max(0.15, Math.min(b.width / 1920, b.height / 1080)),
  };
}

function toggleFullScreenMode(win) {
  if (!win || win.isDestroyed()) return;
  isTransitioning = true;
  lastShrinkTime = Date.now();
  if (isMiniPlayer) {
    wasFullScreenBeforeMini = true;
    expandFromFloatingToFull(win, isPinned);
  } else if (win.isFullScreen()) {
    wasFullScreenBeforeMini = false;
    win.setFullScreen(false);
    const targetNormal = isValidNormalBounds(savedBounds)
      ? savedBounds
      : getCenteredNormalBounds(win, 1280, 720);
    setTimeout(() => {
      if (!win.isDestroyed() && !isMiniPlayer) {
        if (!win.isMaximized()) {
          win.setBounds(targetNormal);
        }
        updateZoom(win);
      }
      isTransitioning = false;
    }, 55);
  } else {
    if (!win.isMaximized()) {
      const cur = win.getBounds();
      if (isValidNormalBounds(cur)) {
        savedBounds = {
          x: cur.x,
          y: cur.y,
          width: Math.max(1280, cur.width),
          height: Math.max(720, cur.height),
        };
      }
    }
    wasFullScreenBeforeMini = true;
    win.setFullScreen(true);
    setTimeout(() => {
      if (!win.isDestroyed()) {
        updateZoom(win);
      }
      isTransitioning = false;
    }, 60);
  }
  return {
    isMiniPlayer,
    isPinned,
    isFullScreen: win.isFullScreen(),
    isCompact: isMiniPlayer || win.getContentBounds().width < 1000,
  };
}

function createWindow() {
  let startFullScreen = process.env.FULL_SCREEN !== "0";
  wasFullScreenBeforeMini = startFullScreen;
  lastFloatingBounds = getDefaultMiniBounds(null, 560, 315);
  savedBounds = getCenteredNormalBounds(null, 1280, 720);

  const win = new BrowserWindow({
    fullscreen: false,
    autoHideMenuBar: true,
    width: 1280,
    height: 720,
    minWidth: 320,
    minHeight: 180,
    resizable: true,
    maximizable: true,
    webPreferences: {
      nodeIntegration: false,
      webSecurity: false,
      contextIsolation: true,
      preload: path.join(__dirname, "./preload.js"),
    },
  });

  if (startFullScreen) {
    setTimeout(() => {
      if (!win.isDestroyed() && !isMiniPlayer) {
        win.setFullScreen(true);
        updateZoom(win);
      }
    }, 100);
  }

  const userAgent =
    "Mozilla/5.0 (SMART-TV; LINUX; Tizen 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/5.0 TV Safari/537.36";

  win.webContents.setUserAgent(userAgent);

  // Security lockdown: deny external popup windows and restrict top-level navigation to local index.html
  const localIndexFile = path.join(__dirname, "./index.html");
  const allowedFileUrlPrefix = `file://${localIndexFile}`;
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event, targetUrl) => {
    if (!targetUrl || !targetUrl.startsWith(allowedFileUrlPrefix)) {
      event.preventDefault();
    }
  });

  win.loadFile(localIndexFile, {
    userAgent,
  });

  win.webContents.on("did-finish-load", () => {
    if (startFullScreen && !isMiniPlayer && !win.isFullScreen()) {
      win.setFullScreen(true);
    }
    updateZoom(win);
    notifyMode(win);
  });

  win.on("maximize", () => {
    if (isTransitioning) {
      updateZoom(win);
      return;
    }
    if (isMiniPlayer) {
      // User clicked Maximize [ ] beside X on the mini-player titlebar (or double-tapped its top bar):
      // Expand cleanly to Fullscreen / Full Work Area without leaving XWayland in maximized state
      expandFromFloatingToFull(win, isPinned);
      return;
    }
    wasMaximizedBeforeMini = true;
    if (isPinned) {
      isTransitioning = true;
      win.unmaximize();
      win.setBounds(getFullWorkAreaBounds(win));
      applyAlwaysOnTop(win, true);
      setTimeout(() => {
        isTransitioning = false;
        updateZoom(win);
      }, 60);
      return;
    }
    updateZoom(win);
  });

  win.on("unmaximize", () => {
    if (!isTransitioning) {
      wasMaximizedBeforeMini = false;
    }
    updateZoom(win);
  });

  win.on("enter-full-screen", () => {
    if (isMiniPlayer && !win.isDestroyed()) {
      const restoreBounds = isValidMiniBounds(lastFloatingBounds)
        ? lastFloatingBounds
        : getDefaultMiniBounds(win, 560, 315);
      enforceMiniWindowDecoratedState(win, restoreBounds);
    }
  });

  win.on("resize", () => {
    if (!isTransitioning && focusRestoreTimer) {
      clearTimeout(focusRestoreTimer);
      focusRestoreTimer = null;
    }
    updateZoom(win);
    if (!isTransitioning && !win.isMaximized() && !win.isFullScreen()) {
      const b = win.getBounds();
      if (isMiniPlayer) {
        if (Date.now() - lastShrinkTime > 380 && isValidMiniBounds(b)) {
          lastFloatingBounds = {
            x: b.x,
            y: b.y,
            width: b.width,
            height: b.height,
          };
        }
      } else if (isValidNormalBounds(b)) {
        savedBounds = {
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
        };
      }
    }
  });

  win.on("move", () => {
    if (!isTransitioning && focusRestoreTimer) {
      clearTimeout(focusRestoreTimer);
      focusRestoreTimer = null;
    }
    if (!isTransitioning && !win.isMaximized() && !win.isFullScreen()) {
      const b = win.getBounds();
      if (isMiniPlayer) {
        if (Date.now() - lastShrinkTime > 380) {
          lastFloatingBounds = {
            x: b.x,
            y: b.y,
            width: isValidMiniBounds(b)
              ? b.width
              : (lastFloatingBounds && lastFloatingBounds.width) || 560,
            height: isValidMiniBounds(b)
              ? b.height
              : (lastFloatingBounds && lastFloatingBounds.height) || 315,
          };
        }
      } else if (isValidNormalBounds(b)) {
        savedBounds = {
          x: b.x,
          y: b.y,
          width: (savedBounds && savedBounds.width) || 1280,
          height: (savedBounds && savedBounds.height) || 720,
        };
      }
    }
  });

  // When switching to another app (Alt+Tab or clicking another window) while Pinned on Top:
  // Shrink to a floating window in 1 step and keep it in front.
  win.on("blur", () => {
    if (focusRestoreTimer) {
      clearTimeout(focusRestoreTimer);
      focusRestoreTimer = null;
    }
    isHoveringWindow = false;
    cursorAtBlur = screen.getCursorScreenPoint();
    if (!isPinned || win.isDestroyed()) return;
    if (isMiniPlayer) {
      if (!win.isAlwaysOnTop()) {
        applyAlwaysOnTop(win, true);
      }
      return;
    }
    if (Date.now() - lastShrinkTime < 250) return;

    isMiniPlayer = true;
    shrinkToFloatingWindow(win, 560, 315);
  });

  // When focusing the Mini Player (e.g. clicking its titlebar to drag, grabbing its border to resize,
  // or clicking inside the player): keep it in Mini Player mode and ensure it is movable & resizable.
  // Users can expand to Fullscreen anytime via Maximize [ ], double-clicking the video/titlebar, F9, or F11.
  win.on("focus", () => {
    if (focusRestoreTimer) {
      clearTimeout(focusRestoreTimer);
      focusRestoreTimer = null;
    }
    if (win.isDestroyed() || isTransitioning) return;
    if (isMiniPlayer) {
      enforceMiniWindowDecoratedState(win, null);
    }
  });

  win.webContents.on("before-input-event", (event, input) => {
    if (input.type === "keyDown") {
      if (input.key === "F9" || (input.control && input.key.toLowerCase() === "m")) {
        event.preventDefault();
        toggleMiniPlayerMode(win);
      } else if (input.key === "F10" || (input.control && input.key.toLowerCase() === "t")) {
        event.preventDefault();
        togglePinMode(win);
      } else if (input.key === "F11") {
        event.preventDefault();
        toggleFullScreenMode(win);
      } else if (input.key === "F5" || (input.control && input.key.toLowerCase() === "r")) {
        event.preventDefault();
        win.webContents.reloadIgnoringCache();
      }
    }
  });

  const ALLOWED_EXTERNAL_HOSTS = new Set([
    "github.com",
    "pulkit-mundra-portfolio.vercel.app",
    "www.flaticon.com",
  ]);

  function isTrustedSender(event) {
    return Boolean(
      event &&
        !win.isDestroyed() &&
        event.sender === win.webContents
    );
  }

  ipcMain.on("internalPointerInteraction", (event) => {
    if (!isTrustedSender(event)) return;
    lastInternalPointerTime = Date.now();
    lastHoverTime = Date.now();
    isHoveringWindow = true;
    if (focusRestoreTimer) {
      clearTimeout(focusRestoreTimer);
      focusRestoreTimer = null;
    }
  });

  ipcMain.on("internalPointerHover", (event, hovering) => {
    if (!isTrustedSender(event)) return;
    isHoveringWindow = Boolean(hovering);
    if (hovering) {
      lastHoverTime = Date.now();
    }
  });

  ipcMain.handle("toggleMiniPlayer", (event) => {
    if (!isTrustedSender(event)) return null;
    return toggleMiniPlayerMode(win);
  });
  ipcMain.handle("toggleAlwaysOnTop", (event) => {
    if (!isTrustedSender(event)) return null;
    return togglePinMode(win);
  });
  ipcMain.handle("toggleFullScreen", (event) => {
    if (!isTrustedSender(event)) return null;
    return toggleFullScreenMode(win);
  });

  ipcMain.on("openExternal", (event, url) => {
    if (!isTrustedSender(event) || typeof url !== "string") return;
    try {
      const parsed = new URL(url);
      if (
        parsed.protocol === "https:" &&
        ALLOWED_EXTERNAL_HOSTS.has(parsed.hostname.toLowerCase()) &&
        electron.shell &&
        typeof electron.shell.openExternal === "function"
      ) {
        electron.shell.openExternal(parsed.toString());
      }
    } catch (_) {}
  });

  ipcMain.on("gamepadButtonPress", (event, buttonName) => {
    if (!isTrustedSender(event)) return;
    handleGamepadButtonPress(win, buttonName);
  });
  ipcMain.on("exitApp", (event) => {
    if (!isTrustedSender(event)) return;
    app.quit();
  });
}

app.whenReady().then(async () => {
  if (electron.components) {
    await electron.components.whenReady();
  }
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

const ALLOWED_GAMEPAD_BUTTONS = new Set([
  "bButton",
  "aButton",
  "dPadDown",
  "dPadUp",
  "dPadLeft",
  "dPadRight",
  "up",
  "down",
]);

function handleGamepadButtonPress(mainWindow, buttonName) {
  if (
    !mainWindow ||
    mainWindow.isDestroyed() ||
    typeof buttonName !== "string" ||
    !ALLOWED_GAMEPAD_BUTTONS.has(buttonName)
  ) {
    return;
  }
  if (buttonName === "bButton") {
    mainWindow.webContents.sendInputEvent({
      type: "keyDown",
      keyCode: "escape",
    });
    mainWindow.webContents.sendInputEvent({ type: "keyUp", keyCode: "escape" });
  } else if (buttonName === "aButton") {
    mainWindow.webContents.sendInputEvent({
      type: "keyDown",
      keyCode: "enter",
    });
    mainWindow.webContents.sendInputEvent({ type: "keyUp", keyCode: "enter" });
  } else if (buttonName === "dPadDown" || buttonName === "down") {
    mainWindow.webContents.sendInputEvent({
      type: "keyDown",
      keyCode: "down",
    });
    mainWindow.webContents.sendInputEvent({ type: "keyUp", keyCode: "down" });
  } else if (buttonName === "dPadUp" || buttonName === "up") {
    mainWindow.webContents.sendInputEvent({
      type: "keyDown",
      keyCode: "up",
    });
    mainWindow.webContents.sendInputEvent({
      type: "keyUp",
      keyCode: "up",
    });
  } else if (buttonName === "dPadLeft") {
    mainWindow.webContents.sendInputEvent({
      type: "keyDown",
      keyCode: "left",
    });
    mainWindow.webContents.sendInputEvent({ type: "keyUp", keyCode: "left" });
  } else if (buttonName === "dPadRight") {
    mainWindow.webContents.sendInputEvent({
      type: "keyDown",
      keyCode: "right",
    });
    mainWindow.webContents.sendInputEvent({ type: "keyUp", keyCode: "right" });
  }
}
