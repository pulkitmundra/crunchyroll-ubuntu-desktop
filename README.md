# Crunchyroll Linux Desktop App (Enhanced Desktop + HTPC Edition)

An unofficial desktop and HTPC client for **Crunchyroll on Linux**, enhanced with full **mouse, trackpad, hover, drag-scrub, live search, and keyboard support** on top of the 10-foot controller/keyboard UI.

> **Disclaimer**: This project is an unofficial, community-maintained client and is **not** affiliated with, endorsed by, or associated with Crunchyroll or Sony Pictures Entertainment. A valid Crunchyroll account is required to stream content.

---

## Key Improvements Over Upstream (`crunchyroll-linux` / `crunchyroll-tizen`)

The upstream project was built purely for TV remote / gamepad / arrow-key navigation and lacked desktop mouse and trackpad ergonomics. This fork adds comprehensive desktop support:

### 1. Video Player (`server/js/core/player.js`, `js/app.js`, `server/css/video.css`, `css/app.css`)
- **Synchronized Auto-Hide HUD & Cursor**: Both the mouse cursor and the top/bottom player HUD bars auto-hide together after 3 seconds of mouse/keyboard inactivity during playback, and wake immediately on mouse movement (`screenX`/`screenY` delta check filters synthetic layout `mousemove` events).
- **Click & Drag Timeline Scrubbing**: Click anywhere on the progress bar or drag the scrubber thumb smoothly across the timeline to seek.
- **Full Mouse Controls**:
  - Click video surface to toggle Play / Pause (`pointer-events` properly layered above the `<video>` element).
  - Double-click video surface to toggle Fullscreen (`electronUtilsRender.toggleFullScreen()`).
  - Click control buttons (`Play/Pause`, `Skip Intro/Credits`, `Next Episode`, `Speed`, `Audio Language`, `Subtitles`).
  - Scroll wheel over the player or settings popup list to scroll audio/subtitle tracks.

### 2. Floating Top Dock, Mini-Player & Smart Auto-PiP (`index.js`, `preload.js`, `js/app.js`, `css/app.css`)
- **Top-Center Floating Dock (`#top-center-dock`)**: Auto-hiding top-center control bar providing one-click mouse buttons for **Back**, **Menu**, **Mini Float (`F9`)**, and **Pin on Top (`F10`)**.
- **Floating Mini-Player Mode (`F9` or `Ctrl + M`)**: Instantly shrinks the window into a compact `560x315` floating player in the bottom-right corner of your screen (and restores back to normal/fullscreen when toggled again).
- **Pin on Top & Smart Auto-PiP (`F10` or `Ctrl + T`)**:
  - When **Pin on Top** is enabled, switching focus away from Crunchyroll (`Alt + Tab` or clicking another app) automatically shrinks Crunchyroll into a pinned floating mini-player so you can keep watching while working.
  - Returning to Crunchyroll via `Alt + Tab` or clicking the Ubuntu Dock icon automatically expands it back to full size in one step, whereas clicking or dragging directly inside the mini-player keeps it compact so you can scrub, pause, or reposition it.
- **Dynamic 1080p Aspect-Ratio Scaling (`updateZoom`)**: Automatically scales the `1920x1080` HTPC UI proportionally (`webContents.setZoomFactor`) to fit any window size down to compact mini-player dimensions.

### 3. Full Mouse & Trackpad Navigation (`js/app.js`, `server/js/main.js`, `server/js/screen/*.js`)
- **Hover-to-Open Left Sidebar (`#menu-screen`)**: Moving the cursor to the left edge or hovering over the sidebar expands it automatically and collapses it when the cursor leaves.
- **Right-Click to Go Back**: Right-clicking anywhere acts as **Back / Escape** for effortless one-handed mouse navigation.
- **Smooth Wheel / Two-Finger Trackpad Scrolling**:
  - Vertical scrolling on Home rows, Browse genre lists, Episode lists, Watchlist/History grids, and Search results.
  - Horizontal scrolling (`Shift + Wheel` or horizontal trackpad swipe) across Home carousels.
  - Bidirectional scroll synchronization with virtualized `document.lazy` lists (including fixing upward/downward re-indexing in Browse genres).
- **Hover Previews**:
  - Hovering over Browse genres updates the background preview and highlights the genre without closing the sidebar.
  - Hovering over Settings categories previews the right-hand options pane immediately.
- **Modal & Exit Confirmation Dialog (`server/js/screen/exit.js`)**:
  - Clicking **YES** / **NO** buttons works directly with the mouse, blocks click-through to elements behind the modal, and closes on `Escape` or backdrop click.

### 4. Keyboard, Search & Playback Fixes
- **Lowercase `'q'` Typing Fix (`server/js/screen/keyboard.js`, `js/keys.js`)**: Pressing lowercase `q` in the search box or login fields types `'q'` normally instead of triggering app exit (`KeyQ` exit shortcut is safely restricted to `Ctrl + Q`).
- **Live Debounced Search (`server/js/screen/search.js`)**: Typing with a physical keyboard triggers live search automatically after 400ms without needing to click the on-screen keyboard's Enter key.
- **Movie Detail & Playback Support (`server/js/screen/home.details.js`)**: Fixed movie (`movie_listing`) play/continue actions when opening movies from the Home screen or Search.
- **X11 / XWayland Windowing (`bin/crunchyroll`, `index.js`)**: Configured with `--ozone-platform=x11` so Chromium's cursor visibility, mini-player bounds, and fullscreen window management work reliably under Ubuntu GNOME Wayland.

---

## Repository Structure

```text
crunchyroll-ubuntu-desktop/
├── index.js                      # Electron main process (window, mini-player, auto-PiP, fullscreen IPC)
├── preload.js                    # Electron preload bridge (pointer/hover telemetry & window IPC)
├── index.html                    # Outer Electron shell
├── package.json                  # Package metadata
├── install.sh                    # Automated installer (downloads Castlabs Widevine runtime & links repo)
├── LICENSE                       # ISC License
├── bin/
│   ├── crunchyroll               # CLI launcher script (~/.local/bin/crunchyroll)
│   └── crunchyroll-linux.desktop # Desktop entry template (~/.local/share/applications/)
├── css/
│   └── app.css                   # Outer shell, top floating dock & cursor/HUD visibility rules
├── js/
│   ├── app.js                    # Renderer bootstrap, floating toolbar, mouse/wheel/hover/scrub handlers
│   └── keys.js                   # Keycode mappings
└── server/
    ├── css/                      # Screen stylesheets (video.css, home.css, browse.css, etc.)
    └── js/
        ├── main.js               # Controller router & global mouse/wheel/hover wiring
        ├── core/                 # Player, Dash/Widevine DRM, Crunchyroll API service, session
        └── screen/               # Screen controllers (home, browse, search, episodes, settings, exit)
```

---

## Fresh System Setup (Ubuntu / Debian / Linux x64)

Because Crunchyroll streams are encrypted with **Google Widevine DRM**, standard stock Electron binaries cannot play videos. This app runs inside the **Castlabs Electron for Content Security (ECS)** runtime (which includes Widevine CDM verification).

### One-Command Setup

Clone this repository and run `install.sh`:

```bash
git clone https://github.com/pulkitmundra/crunchyroll-ubuntu-desktop.git ~/Desktop/prsnl/crunchyroll-ubuntu-desktop
cd ~/Desktop/prsnl/crunchyroll-ubuntu-desktop
chmod +x install.sh
./install.sh
```

What `install.sh` does automatically:
1. Downloads the v1.1.6 AppImage containing the **Castlabs Electron + Widevine** runtime to `~/.local/opt/crunchyroll/Crunchyroll.AppImage` (if not already present).
2. Extracts the runtime into `~/.local/opt/crunchyroll/unpacked/`.
3. Removes the stock `resources/app.asar` bundle and links `~/.local/opt/crunchyroll/unpacked/resources/app` -> this repository (`~/Desktop/prsnl/crunchyroll-ubuntu-desktop`).
   - **Live Editing**: Any change you make to `.js`, `.css`, or `.html` files in this repository takes effect immediately the next time you launch or reload (`Ctrl + R` / `F5`) the app!
4. Symlinks `~/.local/bin/crunchyroll` -> `bin/crunchyroll` and installs the desktop entry in `~/.local/share/applications/crunchyroll-linux.desktop`.

### Launching the App

- From the GNOME Application Grid: search for **Crunchyroll**
- From the terminal:
  ```bash
  crunchyroll
  ```

---

## Keyboard & Mouse Shortcuts

| Action | Mouse / Trackpad | Keyboard |
| :--- | :--- | :--- |
| **Play / Pause** | Single-click video or Play button | `Space` or `Enter` |
| **Toggle Fullscreen** | Double-click video | `F11` |
| **Toggle Mini Float Window** | Click **Mini Float** in top dock | `F9` or `Ctrl + M` |
| **Toggle Pin on Top / Auto-PiP** | Click **Pin on Top** in top dock | `F10` or `Ctrl + T` |
| **Seek Forward / Backward** | Click or drag timeline progress bar | `Left` / `Right` Arrow |
| **Skip Intro / Credits** | Click **Skip** button | `Enter` (when Skip button is shown) |
| **Open Sidebar Menu** | Hover left edge / click **Menu** in top dock | `Left` Arrow from screen edge |
| **Back / Close Modal** | Right-click anywhere / click **Back** in top dock | `Escape` or `Backspace` |
| **Reload App (Ignore Cache)** | - | `F5` or `Ctrl + R` |
| **Quit Application** | Confirm Exit Dialog | `Ctrl + Q` |

---

## Contributing & Contact

Issues, bug reports, and pull requests are welcome!

- **Maintainer**: **Pulkit Mundra**
- **Portfolio**: [pulkit-mundra-portfolio.vercel.app](https://pulkit-mundra-portfolio.vercel.app)
- **GitHub**: [@pulkitmundra](https://github.com/pulkitmundra)
- **LinkedIn**: [linkedin.com/in/pulkit-mundra](https://www.linkedin.com/in/pulkit-mundra/)
- **Email**: [pmundra8@gmail.com](mailto:pmundra8@gmail.com)

---

## Credits & License

- Original Tizen frontend by [jhassan8/crunchyroll-tizen](https://github.com/jhassan8/crunchyroll-tizen)
- Electron Linux wrapper by [aarron-lee/crunchyroll-linux](https://github.com/aarron-lee/crunchyroll-linux)
- Desktop Mouse/Trackpad, Floating Dock & Smart Auto-PiP Edition by [Pulkit Mundra](https://github.com/pulkitmundra)
- License: **ISC** (see `package.json`)
