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
  const isCompact = isMiniPlayer || bounds.width < 1000;
  win.webContents.send("windowModeChanged", {
    isMiniPlayer,
    isPinned,
    isFullScreen: win.isFullScreen(),
    isCompact,
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
    b.width >= 300 &&
    b.width <= 950 &&
    b.height >= 170 &&
    b.height <= 650
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

function isCursorActivelyOnMiniWindow(win) {
  if (!win || win.isDestroyed()) return false;
  const cursor = screen.getCursorScreenPoint();
  if (
    cursorAtBlur &&
    cursor.x === cursorAtBlur.x &&
    cursor.y === cursorAtBlur.y
  ) {
    // XWayland pointer has not moved onto the mini-player since blur
    return false;
  }
  const b = win.getBounds();
  const frameTop = 55;
  const frameSide = 18;
  return (
    cursor.x >= b.x - frameSide &&
    cursor.x <= b.x + b.width + frameSide &&
    cursor.y >= b.y - frameTop &&
    cursor.y <= b.y + b.height + frameSide
  );
}

function applyAlwaysOnTop(win, enable) {
  if (!win || win.isDestroyed()) return;
  win.setAlwaysOnTop(enable, "screen-saver");
  win.setVisibleOnAllWorkspaces(enable, { visibleOnFullScreen: true });
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
      if (win.isFullScreen()) {
        win.setFullScreen(false);
      }
      if (win.isMaximized()) {
        win.unmaximize();
      }
      win.setBounds(restoreBounds);
      if (!win.isAlwaysOnTop()) {
        applyAlwaysOnTop(win, true);
      }
      cursorAtBlur = screen.getCursorScreenPoint();
      updateZoom(win);
      setTimeout(() => {
        if (!win.isDestroyed() && isMiniPlayer) {
          if (win.getBounds().width > 950) {
            win.setBounds(restoreBounds);
          }
          cursorAtBlur = screen.getCursorScreenPoint();
          updateZoom(win);
        }
        isTransitioning = false;
      }, 110);
    }, 45);
  } else {
    win.setBounds(restoreBounds);
    if (!win.isAlwaysOnTop()) {
      applyAlwaysOnTop(win, true);
    }
    cursorAtBlur = screen.getCursorScreenPoint();
    updateZoom(win);
    setTimeout(() => {
      if (!win.isDestroyed() && isMiniPlayer) {
        cursorAtBlur = screen.getCursorScreenPoint();
        updateZoom(win);
      }
      isTransitioning = false;
    }, 80);
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
  }, 80);
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
  return {
    isMiniPlayer,
    isPinned,
    isFullScreen: win.isFullScreen(),
    isCompact: isMiniPlayer,
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
  return {
    isMiniPlayer,
    isPinned,
    isFullScreen: win.isFullScreen(),
    isCompact: isMiniPlayer || win.getContentBounds().width < 1000,
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

  win.on("resize", () => {
    if (!isTransitioning && focusRestoreTimer) {
      clearTimeout(focusRestoreTimer);
      focusRestoreTimer = null;
    }
    updateZoom(win);
    if (!isTransitioning && !win.isMaximized() && !win.isFullScreen()) {
      const b = win.getBounds();
      if (isMiniPlayer) {
        // Only update width/height if the user explicitly resized the mini-player by a large drag
        // (ignores X11 client-vs-frame 31x42px decoration offset so mini-player never shrinks)
        const baseW = (lastFloatingBounds && lastFloatingBounds.width) || 560;
        const baseH = (lastFloatingBounds && lastFloatingBounds.height) || 315;
        if (
          isValidMiniBounds(b) &&
          (Math.abs(b.width - baseW) > 50 || Math.abs(b.height - baseH) > 55)
        ) {
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
        // Preserve fixed mini-player width & height so X11 frame offset never shrinks the window
        lastFloatingBounds = {
          x: b.x,
          y: b.y,
          width: (lastFloatingBounds && lastFloatingBounds.width) || 560,
          height: (lastFloatingBounds && lastFloatingBounds.height) || 315,
        };
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
  // Shrink to a floating window in 1 synchronous step and keep it in front.
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

  // When returning to Crunchyroll via Alt+Tab or clicking the app icon on the Ubuntu Nav Bar:
  // Expand back to full screen immediately in 1 step, unless the user clicked/dragged the mini window.
  win.on("focus", () => {
    if (focusRestoreTimer) {
      clearTimeout(focusRestoreTimer);
      focusRestoreTimer = null;
    }
    const now = Date.now();
    if (!isPinned || win.isDestroyed() || isTransitioning) return;
    if (now - lastShrinkTime < 420) return;
    if (!isMiniPlayer) return;

    const clickedInsideContent = now - lastInternalPointerTime < 350;
    const cursorOnMiniOrTitleBar = isCursorActivelyOnMiniWindow(win);

    // If the user clicked inside the mini window or tapped/dragged its top titlebar/borders,
    // keep it as the small floating window so they can interact or drag it around.
    if (clickedInsideContent || cursorOnMiniOrTitleBar) {
      return;
    }

    // Otherwise focus came from Alt+Tab or clicking the icon on the Ubuntu Nav Bar:
    // Expand immediately in 1 single step.
    expandFromFloatingToFull(win, true);
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

  ipcMain.on("internalPointerInteraction", () => {
    lastInternalPointerTime = Date.now();
    lastHoverTime = Date.now();
    isHoveringWindow = true;
    if (focusRestoreTimer) {
      clearTimeout(focusRestoreTimer);
      focusRestoreTimer = null;
    }
  });

  ipcMain.on("internalPointerHover", (_, hovering) => {
    isHoveringWindow = Boolean(hovering);
    if (hovering) {
      lastHoverTime = Date.now();
    }
  });

  ipcMain.handle("toggleMiniPlayer", () => toggleMiniPlayerMode(win));
  ipcMain.handle("toggleAlwaysOnTop", () => togglePinMode(win));
  ipcMain.handle("toggleFullScreen", () => toggleFullScreenMode(win));

  ipcMain.on("gamepadButtonPress", (_, buttonName) => {
    handleGamepadButtonPress(win, buttonName);
  });
  ipcMain.on("exitApp", () => {
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
    mainWindow.webContents.sendInputEvent({ type: "keyUp", keyCode: "space" });
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
