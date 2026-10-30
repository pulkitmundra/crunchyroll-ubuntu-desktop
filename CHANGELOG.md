# Changelog

All notable changes to **Crunchyroll Ubuntu Desktop** are documented in this file.

## [v1.0.2] - 2026-10-30

### Fixed
- **Stuck Title & Bottom Bar After Resizing PiP Window on XWayland (`server/js/screen/video.js`):**
  - Fixed a bug under GNOME Wayland / XWayland (`xwayland-keyboard`) where resizing the floating PiP window could leave a function key (`F4`, `keyCode: 115`) stuck in a synthetic auto-repeat `keydown` loop (`~30ms` interval) until another window was clicked.
  - Updated `video.keyDown` to ignore all function keys `F1-F12` (`keyCode 112-123`) in addition to modifier keys, and added a `default: osd = false` branch so unhandled or stuck keys never reset `window.lastUserActivityAt` or wake up `#osd`.

---

## [v1.0.1] - 2026-10-30

### Fixed
- **PiP & Fullscreen OSD / Title & Bottom Bar Auto-Hide (`server/js/main.js`, `server/js/screen/video.js`, `js/app.js`):**
  - Fixed a state priority bug in `main.resolveState()` where a previously hovered `#menu-screen` inside a hidden `#home-screen` could override `main.state` to `"menu-screen"` during video playback, preventing `video.hideOSD()` and `hide-cursor` from firing.
  - Added immediate overlay/OSD dismissal (`forceHideAllOverlays()`) on `window.blur` (`Alt+Tab` into PiP), `document.mouseleave` (cursor leaving the PiP or Fullscreen window), and window mode transitions (`F9` / `F10`).
  - Added a self-healing playback watchdog inside `video.setPlayingTime()` (`timeupdate`) that automatically hides `#osd` and `#top-center-dock` after `2.2s` of pointer/keyboard inactivity (`4.2s` when the speed selector is open), guaranteeing the title and bottom progress bar never get stuck on screen.
  - Extended post-resize/zoom synthetic `mousemove` suppression to `650ms` to cover multi-stage `setZoomFactor` updates during PiP window transitions, and shortened the compact PiP idle OSD timeout to `1400ms`.
- **Top Center Dock Stuck `:hover` State on X11/XWayland (`css/app.css`):**
  - Scoped `#top-center-dock:hover` rules to `body:not(.hide-cursor)` and added explicit `opacity: 0 !important; pointer-events: none !important` rules when `body.hide-cursor` is active so X11 window teleportation cannot leave the top dock stuck visible.
- **Progress Bar Scrubbing State Resolution (`js/app.js`):**
  - Ensured `mousedown` resolves `main.state` before checking `video.id` when scrubbing the progress bar.

---

## [v1.0.0] - 2026-10-30

### Added
- **Smart Auto-PiP on `Alt+Tab` (`F10` / `Ctrl+T`):**
  - Automatically shrinks into a `560x315` always-on-top floating Picture-in-Picture window in the bottom-right corner when switching to another app, and expands back to Fullscreen when returning via `Alt+Tab` or the Ubuntu dock icon.
- **Manual Floating Mini-Player (`F9` / `Ctrl+M`):**
  - Toggleable `560x315` floating window mode with persistent drag/resize position memory across transitions.
- **Top-Center Auto-Hide Handle & Floating Pill (`#top-center-dock`):**
  - Compact orange handle at the top-center of the window that expands on hover to provide 1-click access to `Mini Float (F9)` and `Pin on Top (F10)`.
- **Full Mouse & Trackpad Navigation:**
  - Smooth 2D wheel/trackpad scrolling across carousels, season/episode lists, and settings menus.
  - Click-and-drag video progress bar scrubbing, single-click Play/Pause, double-click Fullscreen (`F11`), and right-click Back (`Esc`).
- **One-Command Ubuntu 24.04+ Setup (`setup-ubuntu.sh`):**
  - Automated installation of Castlabs Electron (Widevine CDM), AppArmor userns profile configuration, and desktop launcher integration.
