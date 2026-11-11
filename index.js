const electron = require("electron");
const { app, BrowserWindow, ipcMain, screen, clipboard } = electron;
const path = require("path");
const fs = require("fs");
const { fileURLToPath } = require("url");

const isWaylandSession =
  Boolean(process.env.WAYLAND_DISPLAY) ||
  String(process.env.XDG_SESSION_TYPE || "").toLowerCase() === "wayland";

let mainWindow = null;
let isMiniPlayer = false;
let isPinned = false;
let currentWindowOpacity = 1;
let translucentFullscreenBypass = false;
let translucentFsTimer = null;
let savedBounds = null;
let lastFloatingBounds = null;
let wasFullScreenBeforeMini = true;
let wasMaximizedBeforeMini = false;
let lastShrinkTime = 0;
let isTransitioning = false;

function clearTranslucentFsTimer() {
  if (translucentFsTimer) {
    clearTimeout(translucentFsTimer);
    translucentFsTimer = null;
  }
}

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
    isFullScreen: win.isFullScreen() || translucentFullscreenBypass,
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

function clampBoundsToWorkArea(bounds, minWidth = 320, minHeight = 180) {
  const primaryWa = screen.getPrimaryDisplay().workArea;
  if (
    !bounds ||
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    return {
      x: primaryWa.x,
      y: primaryWa.y,
      width: Math.min(1280, primaryWa.width),
      height: Math.min(720, primaryWa.height),
    };
  }
  const rawRect = {
    x: Number.isFinite(bounds.x) ? Math.round(bounds.x) : primaryWa.x,
    y: Number.isFinite(bounds.y) ? Math.round(bounds.y) : primaryWa.y,
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
  };
  const display = screen.getDisplayMatching(rawRect) || screen.getPrimaryDisplay();
  const wa = display.workArea;
  const width = Math.max(
    Math.min(minWidth, wa.width),
    Math.min(rawRect.width, wa.width)
  );
  const height = Math.max(
    Math.min(minHeight, wa.height),
    Math.min(rawRect.height, wa.height)
  );
  const maxX = wa.x + Math.max(0, wa.width - width);
  const maxY = wa.y + Math.max(0, wa.height - height);
  const x = Math.min(Math.max(rawRect.x, wa.x), maxX);
  const y = Math.min(Math.max(rawRect.y, wa.y), maxY);
  return { x, y, width, height };
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
  return clampBoundsToWorkArea(
    {
      x: workArea.x + workArea.width - width - margin,
      y: workArea.y + workArea.height - height - margin,
      width,
      height,
    },
    280,
    160
  );
}

function isValidMiniBounds(b) {
  return Boolean(
    b &&
      Number.isFinite(b.x) &&
      Number.isFinite(b.y) &&
      Number.isFinite(b.width) &&
      Number.isFinite(b.height) &&
      b.width >= 280 &&
      b.width <= 1400 &&
      b.height >= 160 &&
      b.height <= 900
  );
}

function isValidNormalBounds(b) {
  return Boolean(
    b &&
      Number.isFinite(b.x) &&
      Number.isFinite(b.y) &&
      Number.isFinite(b.width) &&
      Number.isFinite(b.height) &&
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
    win.setBounds(clampBoundsToWorkArea(restoreBounds, 280, 160));
  }
  if (!win.isAlwaysOnTop()) {
    applyAlwaysOnTop(win, true);
  }
  updateZoom(win);
}

function shrinkToFloatingWindow(win, targetWidth = 560, targetHeight = 315) {
  if (!win || win.isDestroyed()) return;
  clearTranslucentFsTimer();
  isTransitioning = true;
  lastShrinkTime = Date.now();

  wasFullScreenBeforeMini = win.isFullScreen() || translucentFullscreenBypass;
  translucentFullscreenBypass = false;
  wasMaximizedBeforeMini = !wasFullScreenBeforeMini && win.isMaximized();
  if (!wasFullScreenBeforeMini && !wasMaximizedBeforeMini) {
    const cur = win.getBounds();
    if (isValidNormalBounds(cur)) {
      savedBounds = {
        x: cur.x,
        y: cur.y,
        width: cur.width,
        height: cur.height,
      };
    }
  }

  const restoreBounds = clampBoundsToWorkArea(
    isValidMiniBounds(lastFloatingBounds)
      ? {
          x: lastFloatingBounds.x,
          y: lastFloatingBounds.y,
          width: lastFloatingBounds.width || targetWidth,
          height: lastFloatingBounds.height || targetHeight,
        }
      : getDefaultMiniBounds(win, targetWidth, targetHeight),
    280,
    160
  );

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
  clearTranslucentFsTimer();
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
    if (currentWindowOpacity < 0.999) {
      translucentFullscreenBypass = true;
      win.setBounds(getFullWorkAreaBounds(win));
    } else {
      translucentFullscreenBypass = false;
      win.setFullScreen(true);
    }
  } else if (wasMaximizedBeforeMini && !keepPinned) {
    win.maximize();
  } else if (keepPinned || wasMaximizedBeforeMini) {
    win.setBounds(getFullWorkAreaBounds(win));
  } else if (isValidNormalBounds(savedBounds)) {
    win.setBounds(clampBoundsToWorkArea(savedBounds, 960, 540));
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
        if (currentWindowOpacity < 0.999) {
          translucentFullscreenBypass = true;
          win.setBounds(getFullWorkAreaBounds(win));
        } else {
          translucentFullscreenBypass = false;
          win.setFullScreen(true);
        }
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
    isFullScreen: !isMiniPlayer && (win.isFullScreen() || translucentFullscreenBypass),
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
    isFullScreen: !isMiniPlayer && (win.isFullScreen() || translucentFullscreenBypass),
    isCompact: isMiniPlayer || b.width <= 720 || b.height <= 420,
    scale: Math.max(0.15, Math.min(b.width / 1920, b.height / 1080)),
  };
}

function toggleFullScreenMode(win) {
  if (!win || win.isDestroyed()) return;
  clearTranslucentFsTimer();
  isTransitioning = true;
  lastShrinkTime = Date.now();
  if (isMiniPlayer) {
    wasFullScreenBeforeMini = true;
    expandFromFloatingToFull(win, isPinned);
  } else if (win.isFullScreen() || translucentFullscreenBypass) {
    wasFullScreenBeforeMini = false;
    translucentFullscreenBypass = false;
    if (win.isFullScreen()) {
      win.setFullScreen(false);
    }
    const targetNormal = clampBoundsToWorkArea(
      isValidNormalBounds(savedBounds)
        ? savedBounds
        : getCenteredNormalBounds(win, 1280, 720),
      960,
      540
    );
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
          width: cur.width,
          height: cur.height,
        };
      }
    }
    wasFullScreenBeforeMini = true;
    if (currentWindowOpacity < 0.999) {
      translucentFullscreenBypass = true;
      win.setBounds(getFullWorkAreaBounds(win));
    } else {
      win.setFullScreen(true);
    }
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
    isFullScreen: win.isFullScreen() || translucentFullscreenBypass,
    isCompact: isMiniPlayer || win.getContentBounds().width < 1000,
  };
}

function createWindow() {
  const startFullScreen = process.env.FULL_SCREEN !== "0";
  let hasInitializedFullscreen = false;
  isMiniPlayer = false;
  isPinned = false;
  currentWindowOpacity = 1;
  translucentFullscreenBypass = false;
  clearTranslucentFsTimer();
  wasFullScreenBeforeMini = startFullScreen;
  wasMaximizedBeforeMini = false;
  lastFloatingBounds = getDefaultMiniBounds(null, 560, 315);
  savedBounds = getCenteredNormalBounds(null, 1280, 720);

  const win = new BrowserWindow({
    fullscreen: false,
    autoHideMenuBar: true,
    transparent: true,
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

  mainWindow = win;
  win.on("closed", () => {
    clearTranslucentFsTimer();
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  const userAgent =
    "Mozilla/5.0 (SMART-TV; LINUX; Tizen 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/5.0 TV Safari/537.36";

  win.webContents.setUserAgent(userAgent);

  // Security lockdown: deny external popup windows and restrict top-level navigation to canonical local index.html
  const localIndexFile = path.resolve(__dirname, "index.html");
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event, targetUrl) => {
    try {
      if (!targetUrl || fileURLToPath(targetUrl) !== localIndexFile) {
        event.preventDefault();
      }
    } catch (_) {
      event.preventDefault();
    }
  });

  win.loadFile(localIndexFile, {
    userAgent,
  });

  win.webContents.on("did-finish-load", () => {
    if (!hasInitializedFullscreen) {
      hasInitializedFullscreen = true;
      if (startFullScreen && !isMiniPlayer && !win.isFullScreen()) {
        if (currentWindowOpacity < 0.999) {
          translucentFullscreenBypass = true;
          win.setBounds(getFullWorkAreaBounds(win));
        } else {
          win.setFullScreen(true);
        }
      }
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
      const restoreBounds = clampBoundsToWorkArea(
        isValidMiniBounds(lastFloatingBounds)
          ? lastFloatingBounds
          : getDefaultMiniBounds(win, 560, 315),
        280,
        160
      );
      enforceMiniWindowDecoratedState(win, restoreBounds);
    }
  });

  win.on("resize", () => {
    updateZoom(win);
    if (
      !isTransitioning &&
      !win.isMaximized() &&
      !win.isFullScreen() &&
      !translucentFullscreenBypass
    ) {
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
    if (
      !isTransitioning &&
      !win.isMaximized() &&
      !win.isFullScreen() &&
      !translucentFullscreenBypass
    ) {
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
          width: b.width,
          height: b.height,
        };
      }
    }
  });

  // When switching to another app (Alt+Tab or clicking another window) while Pinned on Top:
  // Shrink to a floating window in 1 step and keep it in front.
  win.on("blur", () => {
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
}

const ALLOWED_EXTERNAL_HOSTS = new Set([
  "github.com",
  "buymeacoffee.com",
  "www.buymeacoffee.com",
  "pulkit-mundra-portfolio.vercel.app",
  "www.flaticon.com",
]);

function resolveSenderWindow(event) {
  if (!event || !event.sender || event.sender.isDestroyed()) return null;
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (!win || win.isDestroyed() || event.sender !== win.webContents) {
    return null;
  }
  return win;
}

ipcMain.handle("toggleMiniPlayer", (event) => {
  const win = resolveSenderWindow(event);
  if (!win) return null;
  return toggleMiniPlayerMode(win);
});

ipcMain.handle("toggleAlwaysOnTop", (event) => {
  const win = resolveSenderWindow(event);
  if (!win) return null;
  return togglePinMode(win);
});

ipcMain.handle("toggleFullScreen", (event) => {
  const win = resolveSenderWindow(event);
  if (!win) return null;
  return toggleFullScreenMode(win);
});

ipcMain.handle("setWindowOpacity", (event, rawValue) => {
  const win = resolveSenderWindow(event);
  if (!win) return null;
  const num = Number(rawValue);
  if (!Number.isFinite(num)) return { opacity: currentWindowOpacity };
  const clamped = Math.max(0.2, Math.min(1, Math.round(num * 100) / 100));
  currentWindowOpacity = clamped;
  try {
    if (clamped < 0.999 && win.isFullScreen()) {
      translucentFullscreenBypass = true;
      isTransitioning = true;
      clearTranslucentFsTimer();
      win.setFullScreen(false);
      translucentFsTimer = setTimeout(() => {
        translucentFsTimer = null;
        if (!win.isDestroyed() && !isMiniPlayer && currentWindowOpacity < 0.999) {
          win.setBounds(getFullWorkAreaBounds(win));
          updateZoom(win);
        }
        isTransitioning = false;
      }, 55);
    } else if (clamped >= 0.999 && translucentFullscreenBypass) {
      translucentFullscreenBypass = false;
      if (!isMiniPlayer && !win.isFullScreen()) {
        isTransitioning = true;
        clearTranslucentFsTimer();
        win.setFullScreen(true);
        translucentFsTimer = setTimeout(() => {
          translucentFsTimer = null;
          if (!win.isDestroyed()) {
            updateZoom(win);
          }
          isTransitioning = false;
        }, 55);
      }
    }
    if (!isWaylandSession && typeof win.setOpacity === "function") {
      win.setOpacity(clamped);
      return { opacity: currentWindowOpacity, nativeHandled: true };
    }
    if (typeof win.setOpacity === "function" && typeof win.getOpacity === "function" && win.getOpacity() !== 1) {
      win.setOpacity(1);
    }
  } catch (_) {}
  return { opacity: currentWindowOpacity, nativeHandled: false };
});

ipcMain.handle("getWindowOpacity", (event) => {
  const win = resolveSenderWindow(event);
  if (!win) return { opacity: 1 };
  return { opacity: currentWindowOpacity };
});

ipcMain.handle("captureScreenshot", async (event, meta) => {
  const win = resolveSenderWindow(event);
  if (!win) {
    return { ok: false, error: "Window unavailable" };
  }
  try {
    const image = await win.webContents.capturePage();
    const picturesDir = path.join(app.getPath("pictures"), "Crunchyroll");
    fs.mkdirSync(picturesDir, { recursive: true });
    const rawLabel =
      meta && typeof meta.label === "string" && meta.label.trim()
        ? meta.label.trim()
        : "Frame";
    const safeLabel =
      rawLabel
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 60) || "Frame";
    const now = new Date();
    const pad = (n) => (n < 10 ? "0" + n : "" + n);
    const stamp =
      now.getFullYear() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      "_" +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds());
    const fileName = `Crunchyroll_${safeLabel}_${stamp}.png`;
    const filePath = path.join(picturesDir, fileName);
    fs.writeFileSync(filePath, image.toPNG());
    try {
      if (clipboard && typeof clipboard.writeImage === "function") {
        clipboard.writeImage(image);
      }
    } catch (_) {}
    return {
      ok: true,
      fileName,
      filePath,
      displayPath: `~/Pictures/Crunchyroll/${fileName}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err && err.message ? err.message : "Capture failed",
    };
  }
});

ipcMain.on("openExternal", (event, url) => {
  const win = resolveSenderWindow(event);
  if (!win || typeof url !== "string") return;
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol === "https:" &&
      ALLOWED_EXTERNAL_HOSTS.has(parsed.hostname.toLowerCase())
    ) {
      const targetHref = parsed.toString();
      if (!win.isDestroyed() && !isMiniPlayer) {
        if (isPinned && !isMiniPlayer) {
          isPinned = false;
          applyAlwaysOnTop(win, false);
          notifyMode(win);
        } else if (win.isAlwaysOnTop()) {
          applyAlwaysOnTop(win, false);
        }
        if (win.isFullScreen() || translucentFullscreenBypass) {
          clearTranslucentFsTimer();
          wasFullScreenBeforeMini = false;
          translucentFullscreenBypass = false;
          if (win.isFullScreen()) {
            win.setFullScreen(false);
          }
          const normalBounds = clampBoundsToWorkArea(
            isValidNormalBounds(savedBounds)
              ? savedBounds
              : getCenteredNormalBounds(win, 1280, 720),
            960,
            540
          );
          setTimeout(() => {
            if (!win.isDestroyed()) {
              win.setBounds(normalBounds);
              updateZoom(win);
            }
          }, 55);
        }
      }
      const { execFile } = require("child_process");
      const cleanEnv = Object.assign({}, process.env, { GDK_BACKEND: "x11" });
      delete cleanEnv.LD_LIBRARY_PATH;
      const launchWithDesktopPortal = () => {
        if (electron.shell && typeof electron.shell.openExternal === "function") {
          electron.shell.openExternal(targetHref).catch(() => {
            execFile("xdg-open", [targetHref], { env: cleanEnv }, () => {});
          });
        } else {
          execFile("xdg-open", [targetHref], { env: cleanEnv }, () => {});
        }
      };
      if (process.env.SNAP) {
        launchWithDesktopPortal();
        return;
      }
      const pyLaunch = [
        "import os, sys, time, gi",
        "gi.require_version('Gdk', '3.0')",
        "from gi.repository import Gdk, Gio",
        "u = sys.argv[1]",
        "d = Gdk.Display.get_default()",
        "ctx = d.get_app_launch_context()",
        "ctx.set_timestamp(int(time.monotonic() * 1000) & 0xFFFFFFFF)",
        "app = Gio.AppInfo.get_default_for_type('x-scheme-handler/https', False)",
        "tok = ctx.get_startup_notify_id(app, [])",
        "d.sync()",
        "os.environ['DESKTOP_STARTUP_ID'] = tok",
        "os.environ['XDG_ACTIVATION_TOKEN'] = tok",
        "app.launch_uris([u], ctx)",
        "d.sync()",
      ].join("; ");
      execFile(
        "/usr/bin/python3",
        ["-c", pyLaunch, targetHref],
        { env: cleanEnv },
        (err) => {
          if (err) {
            execFile("xdg-open", [targetHref], { env: cleanEnv }, (err2) => {
              if (
                err2 &&
                electron.shell &&
                typeof electron.shell.openExternal === "function"
              ) {
                electron.shell.openExternal(targetHref).catch(() => {});
              }
            });
          }
        }
      );
    }
  } catch (_) {}
});

ipcMain.on("gamepadButtonPress", (event, buttonName) => {
  const win = resolveSenderWindow(event);
  if (!win) return;
  handleGamepadButtonPress(win, buttonName);
});

ipcMain.on("exitApp", (event) => {
  const win = resolveSenderWindow(event);
  if (!win) return;
  app.quit();
});

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
