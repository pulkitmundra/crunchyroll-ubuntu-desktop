#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="$HOME/.local/opt/crunchyroll"
APPIMAGE_PATH="$RUNTIME_DIR/Crunchyroll.AppImage"
UNPACKED_DIR="$RUNTIME_DIR/unpacked"
APPIMAGE_URL="https://github.com/aarron-lee/crunchyroll-linux/releases/download/v1.1.6/Crunchyroll-Linux-1.1.6.AppImage"

echo "=== Crunchyroll Linux Desktop Installer ==="

mkdir -p "$RUNTIME_DIR"
mkdir -p "$HOME/.local/bin"
mkdir -p "$HOME/.local/share/icons"
mkdir -p "$HOME/.local/share/applications"

# 1. Download Castlabs Electron Widevine AppImage runtime if missing
if [ ! -f "$APPIMAGE_PATH" ] && [ ! -d "$UNPACKED_DIR" ]; then
  echo "[*] Downloading Castlabs Electron Widevine runtime (Crunchyroll-Linux-1.1.6.AppImage)..."
  curl -fL "$APPIMAGE_URL" -o "$APPIMAGE_PATH"
  chmod +x "$APPIMAGE_PATH"
fi

# 2. Extract AppImage runtime if not yet unpacked
if [ ! -d "$UNPACKED_DIR" ]; then
  echo "[*] Extracting AppImage runtime to $UNPACKED_DIR..."
  TMP_EXTRACT="$(mktemp -d)"
  (
    cd "$TMP_EXTRACT"
    "$APPIMAGE_PATH" --appimage-extract >/dev/null
    mv squashfs-root "$UNPACKED_DIR"
  )
  rmdir "$TMP_EXTRACT"
fi

# 3. Remove stock app.asar (Electron prioritizes app.asar over app/) and symlink resources/app to this repo
rm -f "$UNPACKED_DIR/resources/app.asar"
if [ -d "$UNPACKED_DIR/resources/app" ] && [ ! -L "$UNPACKED_DIR/resources/app" ]; then
  rm -rf "$UNPACKED_DIR/resources/app"
fi
ln -sfn "$REPO_DIR" "$UNPACKED_DIR/resources/app"

# 4. Install icon, launcher script, and desktop entry
if [ -f "$UNPACKED_DIR/usr/share/icons/hicolor/256x256/apps/crunchyroll-linux.png" ]; then
  cp -f "$UNPACKED_DIR/usr/share/icons/hicolor/256x256/apps/crunchyroll-linux.png" "$HOME/.local/share/icons/crunchyroll-linux.png"
fi

chmod +x "$REPO_DIR/bin/crunchyroll"
ln -sfn "$REPO_DIR/bin/crunchyroll" "$HOME/.local/bin/crunchyroll"

sed "s|__HOME__|$HOME|g" "$REPO_DIR/bin/crunchyroll-linux.desktop" > "$HOME/.local/share/applications/crunchyroll-linux.desktop"

echo "[x] Installation complete!"
echo "    - Launch from GNOME App Grid ('Crunchyroll') or run: crunchyroll"
echo "    - App source linked: $UNPACKED_DIR/resources/app -> $REPO_DIR"
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
  echo "    - Note: Add ~/.local/bin to your PATH in ~/.bashrc: export PATH=\"\$HOME/.local/bin:\$PATH\""
fi
