var app = {
  state: false,
};

function sendKey(keyCode) {
  if (typeof main !== "undefined" && main.keyDown) {
    main.keyDown({
      keyCode: keyCode,
      preventDefault: function () {},
      stopPropagation: function () {},
    });
  }
}

function setupFloatingToolbar() {
  var dock = document.createElement("div");
  dock.id = "top-center-dock";
  dock.innerHTML =
    '<div id="dock-handle" title="Hover here for window controls"></div>' +
    '<div id="floating-toolbar">' +
    '<button id="btn-nav-menu" tabindex="-1" class="floating-btn" title="Toggle Menu">' +
    '<i class="fa-solid fa-bars"></i><span>Menu</span>' +
    "</button>" +
    '<span class="floating-divider" aria-hidden="true"></span>' +
    '<button id="btn-mini-float" tabindex="-1" class="floating-btn" title="Mini Floating Player (F9 or Ctrl+M)">' +
    '<i class="fa-solid fa-clone"></i><span id="lbl-mini-float">Mini Float</span><kbd class="floating-kbd">F9</kbd>' +
    "</button>" +
    '<button id="btn-pin-top" tabindex="-1" class="floating-btn" title="Smart Auto-PiP Pin on Top (F10 or Ctrl+T)">' +
    '<i class="fa-solid fa-thumbtack"></i><span id="lbl-pin-top">Pin on Top</span><kbd class="floating-kbd">F10</kbd>' +
    "</button>" +
    "</div>";
  document.body.appendChild(dock);

  var screenBackBtn = document.createElement("button");
  screenBackBtn.id = "screen-back-btn";
  screenBackBtn.type = "button";
  screenBackBtn.tabIndex = -1;
  screenBackBtn.title = "Go Back (Backspace or Esc)";
  screenBackBtn.innerHTML =
    '<i class="fa-solid fa-arrow-left"></i><span id="screen-back-label">Back</span>';
  document.body.appendChild(screenBackBtn);

  function goHomeFromSubscreen() {
    if (typeof menu !== "undefined" && document.getElementById(menu.id)) {
      var allMenuOptions = $("#menu-screen .option");
      if (allMenuOptions.length > 2) {
        allMenuOptions.removeClass("focus");
        allMenuOptions.eq(2).addClass("focus");
        menu.keyDown({ keyCode: tvKey.KEY_ENTER });
        return true;
      }
    }
    return false;
  }

  function refreshSlickLayouts() {
    var hRows = document.querySelectorAll(
      "#home-screen .row-content, #mylist-screen .row-content"
    );
    for (var i = 0; i < hRows.length; i++) {
      var el = hRows[i];
      if (el && el.slick && el.offsetParent !== null) {
        var tr = el.querySelector(".slick-track");
        var savedX = tr && typeof tr._posX === "number" ? tr._posX : null;
        var savedSlide = el.slick.currentSlide || 0;
        el.slick.setPosition();
        el.slick.currentSlide = savedSlide;
        if (tr && savedX !== null && savedX > 0) {
          tr._posX = savedX;
          tr.style.transition = "none";
          tr.style.transform = "translate3d(" + -savedX + "px, 0px, 0px)";
        }
      }
    }
    var vLists = document.querySelectorAll(
      "#home-screen .rows, .episodes .episodes-list"
    );
    for (var j = 0; j < vLists.length; j++) {
      var vEl = vLists[j];
      if (vEl && vEl.slick && vEl.offsetParent !== null) {
        var vTr = vEl.querySelector(":scope > .slick-list > .slick-track") || vEl.querySelector(".slick-track");
        var savedY = vTr && typeof vTr._posY === "number" ? vTr._posY : null;
        var savedVSlide = vEl.slick.currentSlide || 0;
        vEl.slick.setPosition();
        vEl.slick.currentSlide = savedVSlide;
        if (vTr && savedY !== null && savedY > 0) {
          vTr._posY = savedY;
          vTr.style.transition = "none";
          vTr.style.transform = "translate3d(0px, " + -savedY + "px, 0px)";
        }
      }
    }
  }

  window.refreshSlickLayouts = refreshSlickLayouts;

  function updateBackBtnVisibility() {
    if (!screenBackBtn) return;
    var st =
      typeof main !== "undefined" && typeof main.resolveState === "function"
        ? main.resolveState()
        : typeof main !== "undefined"
        ? main.state
        : "";
    var labelEl = document.getElementById("screen-back-label");
    var show = false;
    var hasSidebar = false;
    var isVideo = false;
    var isSettings = false;
    var labelText = "Back";

    if (
      st === "login-screen" ||
      st === "profiles-screen" ||
      st === "loading-screen" ||
      !st
    ) {
      show = false;
    } else if (st === "video-screen") {
      show = true;
      isVideo = true;
      labelText = "Back";
    } else if (st === "home_episodes-screen" || st === "home_details-screen") {
      show = true;
      hasSidebar = true;
      labelText = "Back";
    } else if (st === "home-screen") {
      if (typeof home !== "undefined" && home.fromCategory && home.fromCategory.state) {
        show = true;
        hasSidebar = true;
        labelText = "Categories";
      } else {
        show = false;
      }
    } else if (st === "settings-screen") {
      show = true;
      hasSidebar = false;
      isSettings = true;
      labelText = "Back";
    } else if (
      st === "search-screen" ||
      st === "browse-screen" ||
      st === "mylist-screen" ||
      st === "history-screen"
    ) {
      show = true;
      hasSidebar = true;
      labelText = "Back";
    }

    if (labelEl && labelEl.textContent !== labelText) {
      labelEl.textContent = labelText;
    }
    screenBackBtn.classList.toggle("visible", show);
    screenBackBtn.classList.toggle("with-sidebar", hasSidebar);
    screenBackBtn.classList.toggle("on-video", isVideo);
    screenBackBtn.classList.toggle("on-settings", isSettings);
  }

  window.updateBackBtnVisibility = updateBackBtnVisibility;

  function navigateBack() {
    if (typeof main !== "undefined" && typeof main.resolveState === "function") {
      main.resolveState();
    }
    if (typeof exit !== "undefined" && document.getElementById(exit.id)) {
      exit.destroy();
      setTimeout(updateBackBtnVisibility, 20);
      return;
    }
    if (typeof changelog !== "undefined" && document.getElementById(changelog.id)) {
      changelog.destroy();
      setTimeout(updateBackBtnVisibility, 20);
      return;
    }
    if (typeof keyboard !== "undefined" && document.getElementById(keyboard.id)) {
      keyboard.destroy();
      setTimeout(updateBackBtnVisibility, 20);
      return;
    }
    if (typeof menu !== "undefined" && menu.isOpen) {
      menu.close();
      setTimeout(updateBackBtnVisibility, 20);
      return;
    }
    if (
      typeof home_details !== "undefined" &&
      main.state === home_details.id &&
      home_details.listModalOpen
    ) {
      home_details.closeListManager();
      setTimeout(updateBackBtnVisibility, 20);
      return;
    }
    if (
      typeof main !== "undefined" &&
      (main.state === "search-screen" ||
        main.state === "browse-screen" ||
        main.state === "mylist-screen" ||
        main.state === "history-screen" ||
        main.state === "settings-screen")
    ) {
      if (goHomeFromSubscreen()) {
        setTimeout(updateBackBtnVisibility, 30);
        return;
      }
    }
    sendKey(tvKey.KEY_ESCAPE);
    setTimeout(updateBackBtnVisibility, 30);
  }

  window.navigateBack = navigateBack;

  screenBackBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    this.blur();
    navigateBack();
  });

  var btnMenu = document.getElementById("btn-nav-menu");
  var btnMini = document.getElementById("btn-mini-float");
  var btnPin = document.getElementById("btn-pin-top");
  var lblMini = document.getElementById("lbl-mini-float");
  var lblPin = document.getElementById("lbl-pin-top");

  btnMenu.addEventListener("click", function (e) {
    e.stopPropagation();
    this.blur();
    if (
      (typeof login !== "undefined" && document.getElementById(login.id)) ||
      (typeof profilesScreen !== "undefined" &&
        document.getElementById(profilesScreen.id)) ||
      (typeof loading !== "undefined" &&
        document.getElementById(loading.id) &&
        !document.getElementById(loading.id).classList.contains("flat")) ||
      typeof session === "undefined" ||
      !session.storage ||
      !session.storage.access_token
    ) {
      return;
    }
    if (typeof exit !== "undefined" && document.getElementById(exit.id)) {
      exit.destroy();
    }
    if (typeof changelog !== "undefined" && document.getElementById(changelog.id)) {
      changelog.destroy();
    }
    if (typeof keyboard !== "undefined" && document.getElementById(keyboard.id)) {
      keyboard.destroy();
    }
    if (
      typeof home_details !== "undefined" &&
      home_details.listModalOpen &&
      typeof home_details.closeListManager === "function"
    ) {
      home_details.closeListManager();
    }
    if (typeof video !== "undefined" && document.getElementById(video.id)) {
      if (video.episodesDrawer && video.episodesDrawer.open) {
        video.closeEpisodes(true);
      }
      if (video.settings && video.settings.open) {
        video.keyDown({ keyCode: tvKey.KEY_ESCAPE });
      }
      if (video.speed && video.speed.state) {
        video.hidePlaySpeed();
      }
    }
    if (typeof menu !== "undefined") {
      if (
        !document.getElementById(menu.id) &&
        typeof session !== "undefined" &&
        session.storage &&
        session.storage.access_token &&
        session.storage.account
      ) {
        menu.init();
      }
      if (document.getElementById(menu.id)) {
        if (menu.isOpen) {
          menu.close();
        } else {
          menu.open();
        }
      }
    }
  });

  var lastKnownWindowState = null;

  function checkCompactWindow(state) {
    if (state && typeof state === "object") {
      lastKnownWindowState = state;
    }
    var st = lastKnownWindowState;
    var ow = window.outerWidth || 1920;
    var oh = window.outerHeight || 1080;
    var rawScale =
      st && typeof st.scale === "number" && st.scale > 0
        ? st.scale
        : Math.max(0.15, Math.min(ow / 1920, oh / 1080));
    var isSmall = Boolean(
      (st && (st.isCompact || st.isMiniPlayer)) ||
        (ow > 0 && ow <= 720) ||
        (oh > 0 && oh <= 420)
    );
    if (isSmall) {
      document.body.classList.add("compact-window");
    } else {
      document.body.classList.remove("compact-window");
    }
    var uiScale = 1;
    if (rawScale < 0.85) {
      uiScale = Math.min(1.85, Math.max(1, Math.pow(rawScale, -0.42)));
    }
    if (document.documentElement) {
      document.documentElement.style.setProperty(
        "--ui-scale",
        uiScale.toFixed(3)
      );
    }
  }

  function isVideoActive() {
    return (
      typeof video !== "undefined" &&
      (Boolean(document.getElementById(video.id)) ||
        (typeof main !== "undefined" && main.state === video.id))
    );
  }

  function isVideoDrawerOpen() {
    return Boolean(
      (typeof menu !== "undefined" && menu.isOpen) ||
        (typeof exit !== "undefined" && Boolean(document.getElementById(exit.id))) ||
        (typeof video !== "undefined" &&
          (video.settings.open ||
            (video.episodesDrawer && video.episodesDrawer.open)))
    );
  }

  var hideTimer = null;
  var lastMouseMoveTime = 0;
  var lastResizeTime = 0;
  var lastScreenX = null;
  var lastScreenY = null;
  window.lastUserActivityAt = Date.now();

  function forceHideAllOverlays() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    document.body.classList.remove("show-floating-toolbar");
    dock.classList.remove("expanded");
    if (isVideoActive() && !isVideoDrawerOpen()) {
      document.body.classList.add("hide-cursor");
      video.hideOSD();
    }
  }

  window.forceHideAllOverlays = forceHideAllOverlays;

  function renderState(state) {
    lastResizeTime = Date.now();
    checkCompactWindow(state);
    if (!state) return;
    if (state.isMiniPlayer) {
      btnMini.classList.add("active");
      lblMini.textContent = "Exit Mini";
    } else {
      btnMini.classList.remove("active");
      lblMini.textContent = "Mini Float";
    }

    if (state.isPinned) {
      btnPin.classList.add("active");
      lblPin.textContent = "Pinned";
    } else {
      btnPin.classList.remove("active");
      lblPin.textContent = "Pin on Top";
    }

    if (isVideoActive() && !isVideoDrawerOpen()) {
      forceHideAllOverlays();
    }
  }

  function scheduleUnifiedHide(delayMs) {
    var ms = typeof delayMs === "number" ? delayMs : 2000;
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      forceHideAllOverlays();
    }, ms);
  }

  window.syncUserActivityTimer = scheduleUnifiedHide;

  window.addEventListener("resize", function () {
    lastResizeTime = Date.now();
    checkCompactWindow();
    if (isVideoActive() && !isVideoDrawerOpen()) {
      scheduleUnifiedHide(350);
      if (video.timers && video.timers.osd) {
        clearTimeout(video.timers.osd.object);
        video.timers.osd.object = setTimeout(function () {
          video.hideOSD();
        }, 350);
      }
    } else {
      setTimeout(refreshSlickLayouts, 80);
    }
  });

  window.addEventListener("blur", function () {
    lastResizeTime = Date.now();
    forceHideAllOverlays();
  });

  document.addEventListener("mouseleave", function () {
    forceHideAllOverlays();
  });

  if (document.documentElement) {
    document.documentElement.addEventListener("mouseleave", function () {
      forceHideAllOverlays();
    });
  }

  checkCompactWindow();

  btnMini.addEventListener("click", function (e) {
    e.stopPropagation();
    this.blur();
    lastResizeTime = Date.now();
    forceHideAllOverlays();
    if (window.electronUtilsRender && window.electronUtilsRender.toggleMiniPlayer) {
      window.electronUtilsRender.toggleMiniPlayer().then(renderState);
    }
  });

  btnPin.addEventListener("click", function (e) {
    e.stopPropagation();
    this.blur();
    lastResizeTime = Date.now();
    dock.classList.remove("expanded");
    if (window.electronUtilsRender && window.electronUtilsRender.toggleAlwaysOnTop) {
      window.electronUtilsRender.toggleAlwaysOnTop().then(renderState);
    }
  });

  if (window.electronUtilsRender && window.electronUtilsRender.onWindowModeChanged) {
    window.electronUtilsRender.onWindowModeChanged(renderState);
  }

  function onUserMouseActivity(e) {
    var now = Date.now();
    if (e && e.type === "mousemove") {
      if (now - lastResizeTime < 650) return;
      if (now - lastMouseMoveTime < 50) return;
      var sx = typeof e.screenX === "number" ? e.screenX : e.clientX;
      var sy = typeof e.screenY === "number" ? e.screenY : e.clientY;
      if (
        lastScreenX !== null &&
        lastScreenY !== null &&
        Math.abs(sx - lastScreenX) < 3 &&
        Math.abs(sy - lastScreenY) < 3
      ) {
        return;
      }
      lastScreenX = sx;
      lastScreenY = sy;
      lastMouseMoveTime = now;
    }
    window.lastUserActivityAt = now;
    document.body.classList.add("mouse-mode");
    document.body.classList.add("show-floating-toolbar");
    document.body.classList.remove("hide-cursor");
    checkCompactWindow();

    // Expand the top-center dock only when cursor is near the top-center zone
    if (e && typeof e.clientY === "number" && typeof e.clientX === "number") {
      var w = window.innerWidth || 1920;
      var maxY = document.body.classList.contains("compact-window") ? 240 : 75;
      var inTopCenter =
        e.clientY < maxY && e.clientX > w * 0.2 && e.clientX < w * 0.8;
      if (inTopCenter) {
        dock.classList.add("expanded");
      } else if (!dock.matches(":hover")) {
        dock.classList.remove("expanded");
      }
    }

    if (isVideoActive() && !isVideoDrawerOpen()) {
      video.showOSD(Boolean(video.speed && video.speed.state));
    } else {
      scheduleUnifiedHide(2000);
    }
    updateBackBtnVisibility();
  }

  if (typeof MutationObserver !== "undefined") {
    var bodyObserver = new MutationObserver(function () {
      updateBackBtnVisibility();
    });
    bodyObserver.observe(document.body, {
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  window.addEventListener("mousemove", onUserMouseActivity);
  window.addEventListener("mousedown", onUserMouseActivity);
}

function getTrackOffset(track, axis) {
  if (!track) return 0;
  if (axis === "x" && typeof track._posX === "number") return track._posX;
  if (axis === "y" && typeof track._posY === "number") return track._posY;
  var st = window.getComputedStyle(track).transform;
  if (st && st !== "none") {
    var m = st.match(/matrix.*\((.+)\)/);
    if (m) {
      var vals = m[1].split(", ");
      var val = axis === "x" ? parseFloat(vals[4]) : parseFloat(vals[5]);
      return isNaN(val) ? 0 : -val;
    }
  }
  return 0;
}

function setTrackOffset(track, axis, pos) {
  if (!track) return;
  if (axis === "x") {
    track._posX = pos;
    track.style.transition = "transform 65ms ease-out";
    track.style.transform = "translate3d(" + -pos + "px, 0px, 0px)";
  } else {
    track._posY = pos;
    track.style.transition = "transform 65ms ease-out";
    track.style.transform = "translate3d(0px, " + -pos + "px, 0px)";
  }
}

function scrollMarginElement(el, dy, maxScroll) {
  if (!el) return;
  var cur = -(parseFloat(el.style.marginTop) || 0);
  var next = Math.max(0, Math.min(Math.max(0, maxScroll), cur + dy));
  el.style.marginTop = -next + "px";
}

function getContentHeight(el) {
  if (!el) return 0;
  var children = el.children;
  if (!children || !children.length) return el.scrollHeight || 0;
  var first = children[0];
  var last = children[children.length - 1];
  var span = last.offsetTop - first.offsetTop + (last.offsetHeight || 0);
  return Math.max(span, el.scrollHeight || 0);
}

function setupMouseSupport() {
  var videoClickTimer = null;
  var isDraggingProgress = false;
  var isDraggingVolume = false;
  var justFinishedScrubbing = false;
  var menuEnteredByMouse = false;

  function canHoverSidebarMenu() {
    if (typeof menu === "undefined") return false;
    var menuEl = document.getElementById(menu.id);
    if (!menuEl || window.getComputedStyle(menuEl).display === "none") return false;
    if (typeof exit !== "undefined" && document.getElementById(exit.id)) return false;
    if (typeof changelog !== "undefined" && document.getElementById(changelog.id)) return false;
    if (typeof keyboard !== "undefined" && document.getElementById(keyboard.id)) return false;
    if (typeof video !== "undefined" && document.getElementById(video.id)) return false;
    if (document.getElementById("crunchylist-modal")) return false;
    if (
      document.body.classList.contains("home_details-screen") ||
      document.body.classList.contains("home_episodes-screen")
    ) {
      return false;
    }
    return true;
  }

  function formatSeekTime(seconds, totalDuration) {
    var sec = Math.max(0, Math.floor(seconds || 0));
    var s = sec % 60;
    var m = Math.floor((sec % 3600) / 60);
    var h = Math.floor(sec / 3600);
    var pad = function (n) {
      return n < 10 ? "0" + n : "" + n;
    };
    if (h > 0 || (totalDuration && totalDuration >= 3600)) {
      return pad(h) + ":" + pad(m) + ":" + pad(s);
    }
    return pad(m) + ":" + pad(s);
  }

  function updateProgressHover(barEl, clientX, active) {
    var progressEl = barEl ? barEl.closest(".progress") : document.querySelector(".osd .progress");
    var hoverEl = document.getElementById("seek-hover");
    var tooltipEl = document.getElementById("seek-tooltip");
    if (!active || !barEl) {
      if (progressEl) progressEl.classList.remove("hover-active");
      if (hoverEl) hoverEl.style.width = "0%";
      if (tooltipEl) tooltipEl.classList.remove("visible");
      return;
    }
    var rect = barEl.getBoundingClientRect();
    if (!rect.width) return;
    var ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    var pct = ratio * 100;
    if (progressEl) progressEl.classList.add("hover-active");
    if (hoverEl) hoverEl.style.width = pct + "%";
    if (tooltipEl && typeof player !== "undefined") {
      var dur = player.getDuration();
      if (dur && dur > 0) {
        tooltipEl.textContent = formatSeekTime(ratio * dur, dur);
        var clampedPct = Math.max(3, Math.min(97, pct));
        tooltipEl.style.left = clampedPct + "%";
        tooltipEl.classList.add("visible");
      }
    }
  }

  function isPointInVolumeSliderZone(e) {
    if (!e) return false;
    if (e.target && e.target.closest && e.target.closest("#btn-volume-mute")) {
      return false;
    }
    var osdVolEl = document.getElementById("osd-volume");
    if (!osdVolEl) return false;
    if (e.target && e.target.closest && e.target.closest("#osd-volume")) {
      return true;
    }
    var rect = osdVolEl.getBoundingClientRect();
    if (!rect.width) return false;
    var muteBtn = document.getElementById("btn-volume-mute");
    var minX = muteBtn ? muteBtn.getBoundingClientRect().right + 2 : rect.left + 28;
    return (
      e.clientX >= minX &&
      e.clientX <= rect.right + 6 &&
      e.clientY >= rect.top - 8 &&
      e.clientY <= rect.bottom + 8
    );
  }

  function setVolumeAtClientX(clientX) {
    if (typeof player === "undefined" || typeof video === "undefined") return;
    var volBarEl = document.getElementById("volume-bar");
    if (!volBarEl) return;
    var vRect = volBarEl.getBoundingClientRect();
    if (!vRect.width) return;
    var vRatio = Math.max(0, Math.min(1, (clientX - vRect.left) / vRect.width));
    player.setVolume(vRatio);
    video.showOSD();
  }

  function isPointInProgressHitZone(barEl, e) {
    if (!barEl || !e) return false;
    if (e.target && e.target.closest && e.target.closest("#osd-volume")) {
      return false;
    }
    if (e.target && e.target.closest && e.target.closest(".osd .progress .bar")) {
      return true;
    }
    var rect = barEl.getBoundingClientRect();
    if (!rect.width) return false;
    var centerY = rect.top + rect.height / 2;
    var vPad = Math.max(24, rect.height * 2.5);
    return (
      e.clientX >= rect.left - 8 &&
      e.clientX <= rect.right + 8 &&
      Math.abs(e.clientY - centerY) <= vPad
    );
  }

  // Allow clicking and dragging along the video progress bar to scrub smoothly
  function seekAtClientX(barEl, clientX) {
    if (!barEl || typeof player === "undefined" || typeof video === "undefined") return;
    var rect = barEl.getBoundingClientRect();
    if (!rect.width) return;
    var ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    var dur = player.getDuration();
    if (dur && dur > 0) {
      player.forwardTo(ratio * dur);
      video.setPlayingTime();
      updateProgressHover(barEl, clientX, true);
      video.showOSD();
    }
  }

  window.addEventListener("mousedown", function (e) {
    if (e.button !== 0 || !e.target) return;
    if (typeof main !== "undefined" && typeof main.resolveState === "function") {
      main.resolveState();
    }
    if (typeof video !== "undefined" && main.state === video.id) {
      if (
        typeof video.isAutoSkipping === "function" &&
        video.isAutoSkipping() &&
        e.target.closest("#top-center-dock") &&
        !e.target.closest("#btn-nav-back")
      ) {
        video.abortAutoSkip();
      }
      var osdEl = document.getElementById("osd");
      var osdVisible = !osdEl || osdEl.style.opacity == 1;
      if (osdVisible && isPointInVolumeSliderZone(e)) {
        if (typeof video.isAutoSkipping === "function" && video.isAutoSkipping()) {
          video.abortAutoSkip();
        }
        isDraggingVolume = true;
        document.body.classList.add("scrubbing-volume");
        setVolumeAtClientX(e.clientX);
        e.preventDefault();
        return;
      }
      var barEl = osdVisible && document.querySelector(".osd .progress .bar");
      if (barEl && isPointInProgressHitZone(barEl, e)) {
        if (typeof video.isAutoSkipping === "function" && video.isAutoSkipping()) {
          video.abortAutoSkip();
        }
        isDraggingProgress = true;
        document.body.classList.add("scrubbing-progress");
        seekAtClientX(barEl, e.clientX);
        e.preventDefault();
      }
    }
  });

  window.addEventListener("mousemove", function (e) {
    if (isDraggingVolume) {
      setVolumeAtClientX(e.clientX);
      return;
    }

    if (isDraggingProgress) {
      var barEl = document.querySelector(".osd .progress .bar");
      if (barEl) {
        seekAtClientX(barEl, e.clientX);
      }
      return;
    }

    if (
      typeof video !== "undefined" &&
      main.state === video.id &&
      !video.settings.open &&
      !(video.episodesDrawer && video.episodesDrawer.open)
    ) {
      var osdEl = document.getElementById("osd");
      var osdVisible = !osdEl || osdEl.style.opacity == 1;
      var hoverBarEl = osdVisible && document.querySelector(".osd .progress .bar");
      if (hoverBarEl && isPointInProgressHitZone(hoverBarEl, e)) {
        updateProgressHover(hoverBarEl, e.clientX, true);
      } else {
        updateProgressHover(hoverBarEl, 0, false);
      }
    }

    // Open sidebar menu when cursor enters the left sidebar strip; close when cursor leaves the open drawer
    if (typeof menu !== "undefined") {
      if (!menu.isOpen) {
        menuEnteredByMouse = false;
        if (
          canHoverSidebarMenu() &&
          typeof e.clientX === "number" &&
          e.clientX <= 110 &&
          e.target &&
          !e.target.closest("#top-center-dock") &&
          !e.target.closest("#screen-back-btn")
        ) {
          menu.open();
          menuEnteredByMouse = true;
        }
      } else if (menuEnteredByMouse && typeof e.clientX === "number" && e.clientX > 440) {
        menuEnteredByMouse = false;
        menu.close();
      }
    }
  });

  window.addEventListener("mouseup", function (e) {
    if (isDraggingVolume) {
      justFinishedScrubbing = true;
      document.body.classList.remove("scrubbing-volume");
      setTimeout(function () {
        isDraggingVolume = false;
        justFinishedScrubbing = false;
      }, 60);
    }
    if (isDraggingProgress) {
      justFinishedScrubbing = true;
      document.body.classList.remove("scrubbing-progress");
      var barEl = document.querySelector(".osd .progress .bar");
      if (barEl && !isPointInProgressHitZone(barEl, e)) {
        updateProgressHover(barEl, 0, false);
      }
      setTimeout(function () {
        isDraggingProgress = false;
        justFinishedScrubbing = false;
      }, 60);
    }
  });

  // Right-click anywhere goes Back
  window.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    if (typeof window.navigateBack === "function") {
      window.navigateBack();
    } else {
      sendKey(tvKey.KEY_ESCAPE);
    }
  });

  // Double-click toggles Fullscreen
  window.addEventListener("dblclick", function (e) {
    if (videoClickTimer) {
      clearTimeout(videoClickTimer);
      videoClickTimer = null;
    }
    var target = e.target;
    if (!target) return;
    if (
      target.closest("#top-center-dock") ||
      target.closest("#exit-screen") ||
      target.closest("#changelog-modal") ||
      target.closest("#crunchylist-modal") ||
      target.closest("#player-episodes-slide") ||
      target.closest("#menu-screen") ||
      target.closest("button") ||
      target.closest("input") ||
      target.closest("#setting-options") ||
      target.closest(".osd .progress") ||
      target.closest("#skip-intro") ||
      target.closest(".next-episode") ||
      target.closest("#languages-content") ||
      target.closest("#speed-menu") ||
      target.closest("#keyboard-screen") ||
      target.closest("#profiles-screen") ||
      target.closest("#login-screen")
    ) {
      return;
    }
    if (typeof main !== "undefined" && typeof main.resolveState === "function") {
      main.resolveState();
    }
    // On non-video screens, don't trigger fullscreen when double-clicking clickable cards/links
    if (typeof video === "undefined" || main.state !== video.id) {
      if (
        target.closest(".item") ||
        target.closest(".episode") ||
        target.closest(".season") ||
        target.closest("a") ||
        target.closest("li")
      ) {
        return;
      }
    }
    if (window.electronUtilsRender && window.electronUtilsRender.toggleFullScreen) {
      window.electronUtilsRender.toggleFullScreen();
    }
  });

  // Hover selection & preview across modals and screens
  var hoverPreviewTimer = null;
  document.addEventListener("mouseover", function (e) {
    var target = e.target;
    if (!target) return;
    if (typeof main !== "undefined" && typeof main.resolveState === "function") {
      main.resolveState();
    }

    // 1. Exit modal hover
    if (typeof exit !== "undefined" && main.state === exit.id) {
      if (target.closest("#exit-screen-yes")) {
        exit.move(true);
      } else if (target.closest("#exit-screen-no")) {
        exit.move(false);
      }
      return;
    }

    // 2. Virtual keyboard hover
    if (typeof keyboard !== "undefined" && main.state === keyboard.id) {
      var keyCol = target.closest("#keyboard-screen .col");
      if (keyCol) {
        var rowEl = keyCol.closest(".row");
        var allRows = $("#keyboard-screen .row");
        var rIdx = allRows.index(rowEl);
        var cIdx = $(rowEl).children(".col").index(keyCol);
        if (rIdx >= 0 && cIdx >= 0) {
          keyboard.move([rIdx, cIdx]);
        }
      }
      return;
    }

    // 3. Sidebar Menu (#menu-screen): open on hover over left sidebar, focus hovered option, close when leaving drawer
    if (typeof menu !== "undefined" && (menu.isOpen || canHoverSidebarMenu())) {
      var inMenuContent = target.closest("#menu-screen .content");
      if (inMenuContent) {
        if (!menu.isOpen) {
          menu.open();
        }
        menuEnteredByMouse = true;
        var menuOpt = target.closest("#menu-screen .option");
        if (menuOpt) {
          var allMenuOpts = $("#menu-screen .option");
          var mIdx = allMenuOpts.index(menuOpt);
          if (mIdx >= 0) {
            allMenuOpts.removeClass("focus");
            allMenuOpts.eq(mIdx).addClass("focus");
          }
        }
        return;
      } else if (menu.isOpen && menuEnteredByMouse && !target.closest("#top-center-dock")) {
        menuEnteredByMouse = false;
        menu.close();
      }
    }

    // 4. Video player settings & icons hover
    if (typeof video !== "undefined" && main.state === video.id) {
      if (video.episodesDrawer && video.episodesDrawer.open) {
        var epItem = target.closest("#player-episodes-list .player-ep-item");
        if (epItem) {
          $("#player-episodes-list .player-ep-item").removeClass("selected");
          $(epItem).addClass("selected");
        }
      } else if (video.settings && video.settings.open) {
        var langOpt = target.closest("#languages-content .option");
        if (langOpt) {
          $("#languages-content .option").removeClass("selected");
          $(langOpt).addClass("selected");
        }
      } else {
        var settingIcon = target.closest("#setting-options i");
        if (settingIcon) {
          var allIcons = $("#setting-options i");
          allIcons.removeClass("selected");
          $(settingIcon).addClass("selected");
          video.option = true;
        }
      }
      return;
    }

    // 5. Anime Details buttons hover
    if (typeof home_details !== "undefined" && main.state === home_details.id) {
      if (home_details.listModalOpen) return;
      var detailBtn = target.closest(".home_details-screen_buttons a");
      if (detailBtn) {
        $(".home_details-screen_buttons a").removeClass("selected");
        $(detailBtn).addClass("selected");
      }
      return;
    }

    // 6. Seasons & Episodes hover
    if (typeof home_episodes !== "undefined" && main.state === home_episodes.id) {
      var seasonEl = target.closest(".home_episodes-screen_content .seasons-list .season");
      if (seasonEl) {
        var panels = $(".home_episodes-screen_content .option");
        panels.removeClass("active");
        panels.eq(0).addClass("active");
        $(".seasons-list .season").removeClass("selected");
        $(seasonEl).addClass("selected");
        return;
      }
      var epEl = target.closest(".home_episodes-screen_content .episodes-list .episode");
      if (epEl) {
        var panelsEp = $(".home_episodes-screen_content .option");
        panelsEp.removeClass("active");
        panelsEp.eq(1).addClass("active");
        $(".episodes-list .episode").removeClass("selected");
        $(epEl).addClass("selected");
        return;
      }
      return;
    }

    // 7. Profiles screen hover
    if (typeof profilesScreen !== "undefined" && main.state === profilesScreen.id) {
      var profLi = target.closest("#profiles-screen .options li");
      if (profLi) {
        $("#profiles-screen .options li").removeClass("selected");
        $(profLi).addClass("selected");
      }
      return;
    }

    // 8. Login screen hover
    if (typeof login !== "undefined" && main.state === login.id) {
      var loginOpt = target.closest("#login-screen .login-screen-option");
      if (loginOpt) {
        var lIdx = $(".login-screen-option").index(loginOpt);
        if (lIdx >= 0) login.move(lIdx);
      }
      return;
    }

    // 9. Browse / Genre list hover
    if (typeof browse !== "undefined" && main.state === browse.id) {
      var browseItem = target.closest("#browse-screen .browse-content .item");
      if (browseItem) {
        var allBrowse = $("#browse-screen .browse-content .item");
        var bIdx = allBrowse.index(browseItem);
        if (bIdx >= 0) {
          allBrowse.removeClass("focus");
          allBrowse.eq(bIdx).addClass("focus");
          var cat =
            browse.data && browse.data.categories && browse.data.categories[bIdx];
          var bgArr =
            cat && cat.images && Array.isArray(cat.images.background)
              ? cat.images.background
              : [];
          var bgSrc =
            (bgArr[4] && bgArr[4].source) ||
            (bgArr[bgArr.length - 1] && bgArr[bgArr.length - 1].source) ||
            "";
          if (bgSrc) {
            $("#browse-background").attr("src", bgSrc);
          }
        }
      }
      return;
    }

    // 10. History screen hover
    if (typeof historyScreen !== "undefined" && main.state === historyScreen.id) {
      var histItem = target.closest("#history-screen .list-container-over .item");
      if (histItem) {
        $("#history-screen .list-container-over .item").removeClass("selected");
        $(histItem).addClass("selected");
      }
      return;
    }

    // 11. Search screen hover
    if (typeof search !== "undefined" && main.state === search.id) {
      var sItem = target.closest("#search-screen .list-container .item");
      if (sItem) {
        var allSItems = $("#search-screen .list-container .item");
        var sIdx = allSItems.index(sItem);
        if (sIdx >= 0) {
          search.toggleFocus(sIdx);
        }
      }
      return;
    }

    // 12. Settings screen: submenus change strictly on click (CSS :hover handles visual hover state)
    if (typeof settings !== "undefined" && main.state === settings.id) {
      return;
    }

    // 13. My List screen hover preview
    if (typeof mylist !== "undefined" && main.state === mylist.id) {
      var mlItem = target.closest("#mylist-screen .row-content .item");
      if (mlItem) {
        var mlRowContent = mlItem.closest(".row-content");
        var mlRow = mlItem.closest(".row");
        var mlRowIdx = $("#mylist-screen .row").index(mlRow);
        var mlSlideIdx = $(mlItem).attr("data-slick-index");
        var mlItemIdx =
          mlSlideIdx !== undefined
            ? parseInt(mlSlideIdx, 10)
            : $(mlRowContent).find(".item").index(mlItem);
        if (
          mlRowIdx >= 0 &&
          mylist.data &&
          mylist.data.lists &&
          mylist.data.lists[mlRowIdx] &&
          mlItemIdx >= 0 &&
          mlItemIdx < mylist.data.lists[mlRowIdx].items.length
        ) {
          var mlDataItem = mylist.data.lists[mlRowIdx].items[mlItemIdx];
          $("#generic-background").attr("src", mlDataItem.background);
          $("#generic-title").text(mlDataItem.title);
          $("#generic-description").text(mlDataItem.description);
          $("#generic-meta-row").html(
            typeof mapper !== "undefined" && mapper.formatMetaBadges
              ? mapper.formatMetaBadges(mlDataItem)
              : ""
          );
        }
      }
      return;
    }

    // 14. Home screen banner buttons & card hover preview
    if (typeof home === "undefined" || main.state !== home.id) return;
    var bannerBtn = target.closest("#home-screen .details .buttons a");
    if (bannerBtn) {
      $("#home-screen .details .buttons a").removeClass("selected");
      $(bannerBtn).addClass("selected");
      return;
    }
    var rowItem = target.closest("#home-screen .row-content .item");
    if (!rowItem) return;
    if (hoverPreviewTimer) clearTimeout(hoverPreviewTimer);
    hoverPreviewTimer = setTimeout(function () {
      hoverPreviewTimer = null;
      if (typeof main !== "undefined" && typeof main.resolveState === "function") {
        main.resolveState();
      }
      if (typeof home === "undefined" || main.state !== home.id) return;
      var rowContent = rowItem.closest(".row-content");
      if (!rowContent || !home.data || !home.data.main || !home.data.main.lists) return;
      var rowIndex = $("#home-screen .row-content").index(rowContent);
      var slideIndex = $(rowItem).attr("data-slick-index");
      var itemIdx =
        slideIndex !== undefined
          ? parseInt(slideIndex, 10)
          : $(rowContent).find(".item").index(rowItem);
      var list = home.data.main.lists[rowIndex];
      if (list && list.items && itemIdx >= 0 && itemIdx < list.items.length) {
        var item = list.items[itemIdx];
        home._previewItem = item;
        $("#home-screen .details .background img").attr("src", item.background);
        var titleEl = $("#home-screen .details .info .title")[0];
        if (titleEl) {
          titleEl.innerText = item.title;
        }
        $("#home-screen #hero-meta-row").html(
          typeof mapper !== "undefined" && mapper.formatMetaBadges
            ? mapper.formatMetaBadges(item)
            : ""
        );
        var descEl = $("#home-screen .details .info .description")[0];
        if (descEl) {
          descEl.innerText = item.description;
        }
      }
    }, 80);
  });

  // Smooth pixel-based mouse wheel / touchpad scrolling across all screens
  window.addEventListener(
    "wheel",
    function (e) {
      document.body.classList.add("mouse-mode");
      if (typeof main !== "undefined" && typeof main.resolveState === "function") {
        main.resolveState();
      }
      if (
        (typeof exit !== "undefined" && main.state === exit.id) ||
        (typeof menu !== "undefined" && main.state === menu.id) ||
        (typeof keyboard !== "undefined" && main.state === keyboard.id) ||
        (typeof changelog !== "undefined" && main.state === changelog.id)
      ) {
        return;
      }

      var dx = e.deltaX || 0;
      var dy = e.deltaY || 0;
      if (e.deltaMode === 1) {
        dx *= 36;
        dy *= 36;
      } else if (e.deltaMode === 2) {
        dx *= window.innerHeight * 0.8;
        dy *= window.innerHeight * 0.8;
      }
      if (e.shiftKey && Math.abs(dx) === 0) {
        dx = dy;
        dy = 0;
      }
      var horizontal = Math.abs(dx) > Math.abs(dy);
      var target = e.target;

      // 0. Custom Lists modal scroll
      if (
        typeof home_details !== "undefined" &&
        main.state === home_details.id &&
        home_details.listModalOpen
      ) {
        if (target && target.closest && target.closest("#custom-lists-body")) {
          return;
        }
        var listsBody = document.getElementById("custom-lists-body");
        if (listsBody) {
          listsBody.scrollTop += dy;
        }
        return;
      }

      // 1. Video screen: scroll episodes drawer or audio/subtitle lists when open, scrub 5s over progress bar, or adjust volume
      if (typeof video !== "undefined" && main.state === video.id) {
        if (video.episodesDrawer && video.episodesDrawer.open) {
          if (target && target.closest && target.closest("#player-episodes-list")) {
            return;
          }
          var epListEl = document.getElementById("player-episodes-list");
          if (epListEl) {
            epListEl.scrollTop += dy;
          }
          return;
        }
        if (video.settings && video.settings.open) {
          var langCol = target && target.closest && (target.closest("#audios") || target.closest("#subtitles"));
          if (langCol) {
            return;
          }
          var subsEl = document.getElementById("subtitles");
          var audiosEl = document.getElementById("audios");
          if (subsEl && audiosEl) {
            var subsRect = subsEl.getBoundingClientRect();
            langCol = e.clientY >= subsRect.top - 10 ? subsEl : audiosEl;
          } else {
            langCol = subsEl || audiosEl;
          }
          if (langCol) {
            langCol.scrollTop += dy;
          }
        } else if (typeof player !== "undefined") {
          var inProgress =
            target &&
            target.closest &&
            target.closest(".osd .progress") &&
            !target.closest("#osd-volume");
          if (inProgress) {
            if (typeof video.isAutoSkipping === "function" && video.isAutoSkipping()) {
              video.abortAutoSkip();
            }
            var deltaSec = (horizontal ? dx : -dy) > 0 ? 5 : -5;
            player.seekBy(deltaSec, video.setPlayingTime);
            video.showOSD();
          } else if (Math.abs(dy) > 0) {
            player.adjustVolume(dy < 0 ? 0.05 : -0.05);
            video.showOSD();
          }
        }
        return;
      }

      // 2. Seasons & Episodes screen (.home_episodes-screen_content)
      if (typeof home_episodes !== "undefined" && main.state === home_episodes.id) {
        var inSeasons = target && target.closest(".seasons");
        if (inSeasons) {
          var offsetEl = document.getElementById("seasons-list-offset");
          var sListEl = document.querySelector(".seasons .seasons-list");
          if (offsetEl && sListEl) {
            var seasonItems = offsetEl.querySelectorAll(".season");
            var seasonPitch = seasonItems[0] ? seasonItems[0].offsetHeight + 12 : 68;
            var maxSeasonScroll = Math.max(
              0,
              (seasonItems.length - 6) * seasonPitch,
              getContentHeight(offsetEl) - (sListEl.clientHeight || window.innerHeight - 250) + 60
            );
            scrollMarginElement(offsetEl, dy, maxSeasonScroll);
          }
        } else {
          var epList = document.querySelector(".episodes .episodes-list");
          var slickList = epList && epList.querySelector(".slick-list");
          var track = slickList && slickList.querySelector(".slick-track");
          if (epList && slickList && track) {
            var epItems = epList.querySelectorAll(".episode");
            var realEpCount =
              home_episodes.data && home_episodes.data.episodes
                ? home_episodes.data.episodes.length
                : Math.max(0, epItems.length - 4);
            var firstEp = epItems[0];
            var lastRealEp = epItems[Math.min(realEpCount - 1, epItems.length - 1)];
            var totalEpH =
              firstEp && lastRealEp
                ? lastRealEp.offsetTop - firstEp.offsetTop + lastRealEp.offsetHeight + 60
                : track.scrollHeight;
            var viewEpH = slickList.clientHeight || window.innerHeight - 180;
            var maxEpY = Math.max(0, totalEpH - viewEpH);
            var curEpY = getTrackOffset(track, "y");
            setTrackOffset(track, "y", Math.max(0, Math.min(maxEpY, curEpY + dy)));
          }
        }
        return;
      }

      // 3. Home screen (#home-screen)
      if (typeof home !== "undefined" && main.state === home.id) {
        var rowContent = target && target.closest("#home-screen .row-content");
        if (rowContent && horizontal) {
          var rSlickList = rowContent.querySelector(".slick-list");
          var rTrack = rowContent.querySelector(".slick-track");
          if (rSlickList && rTrack) {
            var allRows = $("#home-screen .row-content");
            var rIdx = allRows.index(rowContent);
            var listData =
              home.data && home.data.main && home.data.main.lists
                ? home.data.main.lists[rIdx]
                : null;
            var rItems = rowContent.querySelectorAll(".item");
            var realItemCount =
              listData && listData.items
                ? listData.items.length
                : Math.max(0, rItems.length - 9);
            var hasMoreOrLoading = Boolean(
              home.fromCategory &&
                home.fromCategory.state &&
                ((listData && listData.lazy && realItemCount > 15) ||
                  rowContent.querySelector(".row-lazy-loader"))
            );
            var targetIdx = Math.min(
              realItemCount - 1 + (hasMoreOrLoading ? 1 : 0),
              rItems.length - 1
            );
            var lastRealItem = rItems[Math.max(0, targetIdx)];
            var totalRowW = lastRealItem
              ? lastRealItem.offsetLeft + lastRealItem.offsetWidth + 64
              : rTrack.scrollWidth;
            var viewRowW = rSlickList.clientWidth || rowContent.clientWidth;
            var maxRowX = Math.max(0, totalRowW - viewRowW);
            var curRowX = getTrackOffset(rTrack, "x");
            var nextRowX = Math.max(0, Math.min(maxRowX, curRowX + dx));
            setTrackOffset(rTrack, "x", nextRowX);

            // Lazy-load category items if scrolled near the end
            if (
              home.fromCategory &&
              home.fromCategory.state &&
              listData &&
              listData.lazy &&
              listData.items.length > 15 &&
              nextRowX > maxRowX - 750
            ) {
              listData.lazy = false;
              if (typeof home.setRowLoading === "function") {
                home.setRowLoading(rIdx, true);
              }
              mapper.loadCategoryListAsync(
                home.data.main.category + "," + listData.id,
                listData.items.length,
                20,
                rIdx,
                {
                  success: function (response, index) {
                    if (typeof home.setRowLoading === "function") {
                      home.setRowLoading(index, false);
                    }
                    if (
                      !home.data ||
                      !home.data.main ||
                      !home.data.main.lists ||
                      !home.data.main.lists[index]
                    ) {
                      return;
                    }
                    var newRaw =
                      response && Array.isArray(response.items)
                        ? response.items
                        : [];
                    home.data.main.lists[index].lazy = newRaw.length === 20;
                    home.addToList(index, mapper.mapItems(newRaw));
                  },
                  error: function (err) {
                    if (typeof home.setRowLoading === "function") {
                      home.setRowLoading(rIdx, false);
                    }
                    console.log(err);
                  },
                }
              );
            }
          }
          return;
        }

        // Vertical scroll on Home screen
        var rowsEl = document.querySelector("#home-screen .rows");
        var vSlickList = rowsEl && rowsEl.querySelector(":scope > .slick-list");
        var vTrack = vSlickList && vSlickList.querySelector(":scope > .slick-track");
        if (vSlickList && vTrack) {
          var detailsEl = document.querySelector("#home-screen .content > .details");
          var curY = getTrackOffset(vTrack, "y");
          if (detailsEl && detailsEl.classList.contains("full") && dy > 0) {
            detailsEl.classList.remove("full");
            if (home.position === 0) home.position = 1;
          }
          var rowEls = vTrack.querySelectorAll(":scope > .row");
          var lastRowEl = rowEls[rowEls.length - 1];
          var detailsH = window.innerHeight * 0.36;
          var viewH = Math.max(300, window.innerHeight - detailsH);
          var totalH = lastRowEl
            ? lastRowEl.offsetTop + lastRowEl.offsetHeight + 28
            : vTrack.scrollHeight;
          var maxY = Math.max(0, totalH - viewH);
          if (curY <= 0 && dy < -2) {
            if (detailsEl) detailsEl.classList.add("full");
            home.position = 0;
            home._previewItem = null;
            home.show_details();
            setTrackOffset(vTrack, "y", 0);
          } else {
            setTrackOffset(vTrack, "y", Math.max(0, Math.min(maxY, curY + dy)));
          }
        }
        return;
      }

      // 4. My List screen (#mylist-screen)
      if (typeof mylist !== "undefined" && main.state === mylist.id) {
        var mlRowContent = target && target.closest("#mylist-screen .row-content");
        if (mlRowContent && horizontal) {
          var mlSlickList = mlRowContent.querySelector(".slick-list");
          var mlTrack = mlRowContent.querySelector(".slick-track");
          if (mlSlickList && mlTrack) {
            var mlRow = mlRowContent.closest(".row");
            var mlRowIdx = $("#mylist-screen .row").index(mlRow);
            var mlListData =
              mylist.data && mylist.data.lists ? mylist.data.lists[mlRowIdx] : null;
            var mlItems = mlRowContent.querySelectorAll(".item");
            var mlRealCount =
              mlListData && mlListData.items
                ? mlListData.items.length
                : Math.max(0, mlItems.length - 9);
            var mlLastReal = mlItems[Math.min(mlRealCount - 1, mlItems.length - 1)];
            var mlTotalW = mlLastReal
              ? mlLastReal.offsetLeft + mlLastReal.offsetWidth + 64
              : mlTrack.scrollWidth;
            var mlViewW = mlSlickList.clientWidth || mlRowContent.clientWidth;
            var mlMaxX = Math.max(0, mlTotalW - mlViewW);
            var mlCurX = getTrackOffset(mlTrack, "x");
            setTrackOffset(mlTrack, "x", Math.max(0, Math.min(mlMaxX, mlCurX + dx)));
          }
          return;
        }
        var innerLists = document.querySelector("#mylist-screen .inner-lists");
        if (innerLists) {
          var maxMlScroll = Math.max(
            0,
            getContentHeight(innerLists) - window.innerHeight * 0.52 + 120
          );
          scrollMarginElement(innerLists, dy, maxMlScroll);
        }
        return;
      }

      // 5. History screen (#history-screen) & Search screen (#search-screen)
      if (
        (typeof historyScreen !== "undefined" && main.state === historyScreen.id) ||
        (typeof search !== "undefined" && main.state === search.id)
      ) {
        var overEl = document.querySelector(
          "#" + main.state + " .list-container .list-container-over"
        );
        if (overEl) {
          var maxGridScroll = Math.max(
            0,
            getContentHeight(overEl) - (window.innerHeight - 200) + 140
          );
          scrollMarginElement(overEl, dy, maxGridScroll);
        }
        return;
      }

      // 6. Browse screen (#browse-screen)
      if (typeof browse !== "undefined" && main.state === browse.id) {
        var wrapEl = document.querySelector("#browse-screen .browse-content-wrapper");
        if (wrapEl) {
          var items = wrapEl.querySelectorAll(".item");
          var firstItemEl = items[0];
          var itemPitch = firstItemEl ? firstItemEl.offsetHeight + 12 : 66;
          var maxBrowseScroll = Math.max(
            0,
            (items.length - 7) * itemPitch,
            getContentHeight(wrapEl) - (window.innerHeight - 160)
          );
          scrollMarginElement(wrapEl, dy, maxBrowseScroll);
        }
        return;
      }

      // 7. Settings screen (#settings-screen)
      if (typeof settings !== "undefined" && main.state === settings.id) {
        if (target && target.closest && target.closest("#settings-details")) {
          return;
        }
        var midPane =
          target && target.closest && target.closest("#settings-screen .container-mid");
        if (midPane && midPane.scrollHeight > midPane.clientHeight + 4) {
          return;
        }
        var scrollPane = document.getElementById("settings-details");
        if (scrollPane) {
          scrollPane.scrollTop += dy;
        }
        return;
      }
    },
    { passive: true }
  );

  // Left-click handling across all screens in strict visual z-order
  document.addEventListener("click", function (e) {
    if (hoverPreviewTimer) {
      clearTimeout(hoverPreviewTimer);
      hoverPreviewTimer = null;
    }
    var target = e.target;
    if (
      typeof video !== "undefined" &&
      main.state === video.id &&
      target &&
      !target.closest("#skip-intro") &&
      typeof video.isAutoSkipping === "function" &&
      video.isAutoSkipping() &&
      (target.closest("#top-center-dock") || target.closest("#screen-back-btn"))
    ) {
      video.abortAutoSkip();
    }
    if (
      !target ||
      target.closest("#top-center-dock") ||
      target.closest("#screen-back-btn")
    ) {
      return;
    }
    if (typeof main !== "undefined" && typeof main.resolveState === "function") {
      main.resolveState();
    }

    // 1. Exit / Logout confirmation modal (#exit-screen) - highest priority modal
    if (typeof exit !== "undefined" && document.getElementById(exit.id)) {
      var exitYes = target.closest("#exit-screen-yes");
      if (exitYes) {
        exit.move(true);
        exit.action(true);
        return;
      }
      var exitNo = target.closest("#exit-screen-no");
      if (exitNo || !target.closest("#exit-screen .window")) {
        exit.move(false);
        exit.action(false);
        return;
      }
      return;
    }

    // 2. Changelog modal (#changelog-modal)
    if (typeof changelog !== "undefined" && document.getElementById(changelog.id)) {
      if (target.closest("#changelog-modal .button") || !target.closest("#changelog-modal .content")) {
        changelog.destroy();
      }
      return;
    }

    // 3. Virtual keyboard (#keyboard-screen)
    if (typeof keyboard !== "undefined" && document.getElementById(keyboard.id)) {
      var keyCol = target.closest("#keyboard-screen .col");
      if (keyCol) {
        var rowEl = keyCol.closest(".row");
        var allRows = $("#keyboard-screen .row");
        var rIdx = allRows.index(rowEl);
        var cIdx = $(rowEl).children(".col").index(keyCol);
        if (rIdx >= 0 && cIdx >= 0) {
          keyboard.move([rIdx, cIdx]);
          keyboard.action([rIdx, cIdx]);
        }
        return;
      }
      if (target.closest("#keyboard-screen")) {
        return;
      }
      // Clicked outside virtual keyboard: close it first
      keyboard.destroy();
      if (!target.closest("#search-screen_input") && !target.closest("#login-screen .login-screen-option")) {
        return;
      }
    }

    // 4. Sidebar Menu (#menu-screen)
    var menuOption = target.closest("#menu-screen .option");
    if (menuOption) {
      if (!menu.isOpen) {
        menu.open();
      }
      var allMenuOptions = $("#menu-screen .option");
      var idx = allMenuOptions.index(menuOption);
      if (idx >= 0) {
        allMenuOptions.removeClass("focus");
        allMenuOptions.eq(idx).addClass("focus");
        menu.keyDown({ keyCode: tvKey.KEY_ENTER });
      }
      return;
    }

    // Close menu if clicking anywhere outside a menu option while menu is open
    if (typeof menu !== "undefined" && menu.isOpen) {
      menu.close();
      return;
    }

    // 5. Video Player (#video-screen)
    if (typeof video !== "undefined" && main.state === video.id) {
      var skipIntro = target.closest("#skip-intro");
      if (skipIntro && (video.activeSkip || (video.intro && video.intro.state))) {
        video.skipCurrentSegment();
        return;
      }

      var wasAutoSkipping =
        typeof video.isAutoSkipping === "function" && video.isAutoSkipping();
      if (wasAutoSkipping) {
        video.abortAutoSkip();
      }

      var nextEp = target.closest(".next-episode");
      if (nextEp && video.next && video.next.status) {
        clearInterval(video.timers.next);
        video.playNext();
        return;
      }

      if (video.episodesDrawer && video.episodesDrawer.open) {
        var epClose = target.closest("#player-episodes-close");
        if (epClose) {
          video.closeEpisodes(true);
          return;
        }
        var epItem = target.closest("#player-episodes-list .player-ep-item");
        if (epItem) {
          var epIdx = parseInt(epItem.getAttribute("data-index"), 10);
          if (!isNaN(epIdx)) {
            video.playEpisodeFromDrawer(epIdx);
          }
          return;
        }
        if (!target.closest("#player-episodes-slide")) {
          video.closeEpisodes(true);
        }
        return;
      }

      if (video.settings && video.settings.open) {
        var langOption = target.closest("#languages-content .option");
        if (langOption) {
          $("#languages-content .option").removeClass("selected");
          $(langOption).addClass("selected");
          video.keyDown({ keyCode: tvKey.KEY_ENTER });
        } else if (!target.closest("#languages-content")) {
          video.keyDown({ keyCode: tvKey.KEY_ESCAPE });
        }
        return;
      }

      if (video.speed && video.speed.state) {
        var speedLi = target.closest("#speed-menu li");
        if (speedLi) {
          var speedIdx = $("#speed-menu li").index(speedLi);
          if (speedIdx >= 0) {
            var activeIdx = video.speed.options.indexOf(video.speed.active);
            var diff = speedIdx - (activeIdx >= 0 ? activeIdx : 3);
            if (diff !== 0) {
              video.setSpeed(diff);
            }
          }
        }
        video.hidePlaySpeed();
        video.showOSD();
        return;
      }

      var osdEl = document.getElementById("osd");
      var osdVisible = !osdEl || osdEl.style.opacity == 1;

      var settingIcon = osdVisible && target.closest("#setting-options i");
      if (settingIcon) {
        var allIcons = $("#setting-options i");
        var iconIdx = allIcons.index(settingIcon);
        if (iconIdx >= 0) {
          allIcons.removeClass("selected");
          allIcons.eq(iconIdx).addClass("selected");
          video.option = true;
          video.keyDown({ keyCode: tvKey.KEY_ENTER });
        }
        return;
      }

      if (justFinishedScrubbing) {
        return;
      }

      var volMuteBtn = osdVisible && target.closest("#btn-volume-mute");
      if (volMuteBtn) {
        player.toggleMute();
        video.showOSD();
        return;
      }

      if (osdVisible && isPointInVolumeSliderZone(e)) {
        setVolumeAtClientX(e.clientX);
        return;
      }

      if (osdVisible && target.closest("#osd-volume")) {
        video.showOSD();
        return;
      }

      var barEl = osdVisible && document.querySelector(".osd .progress .bar");
      if (barEl && isPointInProgressHitZone(barEl, e)) {
        seekAtClientX(barEl, e.clientX);
        return;
      }
      if (osdVisible && target.closest(".osd .progress")) {
        video.showOSD();
        return;
      }

      // If the click on the video surface aborted an active auto-skip countdown, do not toggle play/pause
      if (wasAutoSkipping) {
        video.showOSD();
        return;
      }

      // Single-click video surface toggles Play/Pause (debounced so double-click fullscreen doesn't blip)
      video.showOSD();
      if (videoClickTimer) {
        clearTimeout(videoClickTimer);
        videoClickTimer = null;
      }
      if (e.detail === 1) {
        videoClickTimer = setTimeout(function () {
          videoClickTimer = null;
          if (
            typeof video !== "undefined" &&
            main.state === video.id &&
            !video.settings.open &&
            !(video.episodesDrawer && video.episodesDrawer.open)
          ) {
            player.playPause();
          }
        }, 200);
      }
      return;
    }

    // 6. Seasons & Episodes screen (.home_episodes-screen_content)
    if (typeof home_episodes !== "undefined" && main.state === home_episodes.id) {
      var seasonEl = target.closest(".home_episodes-screen_content .seasons-list .season");
      if (seasonEl) {
        var panels = $(".home_episodes-screen_content .option");
        panels.removeClass("active");
        panels.eq(0).addClass("active");
        var allSeasons = $(".seasons-list .season");
        var sIdx = allSeasons.index(seasonEl);
        if (sIdx >= 0 && home_episodes.data && home_episodes.data.seasons) {
          allSeasons.removeClass("selected active");
          allSeasons.eq(sIdx).addClass("selected active");
          home_episodes.load(home_episodes.data.seasons[sIdx]);
        }
        return;
      }

      var epEl = target.closest(".home_episodes-screen_content .episodes-list .episode");
      if (epEl) {
        var panels = $(".home_episodes-screen_content .option");
        panels.removeClass("active");
        panels.eq(1).addClass("active");
        var slickIndex = $(epEl).attr("data-slick-index");
        var epIdx =
          slickIndex !== undefined
            ? parseInt(slickIndex, 10)
            : $(".episodes-list .episode").index(epEl);
        if (
          home_episodes.data &&
          home_episodes.data.episodes &&
          epIdx >= 0 &&
          epIdx < home_episodes.data.episodes.length
        ) {
          if ($(".episodes .episodes-list")[0] && $(".episodes .episodes-list")[0].slick) {
            $(".episodes .episodes-list")[0].slick.currentSlide = epIdx;
          }
          video.init(home_episodes.data.episodes[epIdx]);
        }
      }
      return;
    }

    // 7. Anime Details screen (.home_details-screen_buttons a & #crunchylist-modal)
    if (typeof home_details !== "undefined" && main.state === home_details.id) {
      if (home_details.listModalOpen) {
        var delListBtn = target.closest("#crunchylist-modal .crunchylist-delete-btn");
        if (delListBtn) {
          e.stopPropagation();
          var delId = delListBtn.getAttribute("data-delete-list-id");
          if (delId) {
            home_details.deleteCustomListById(delId);
          }
          return;
        }
        var clRow = target.closest("#crunchylist-modal .custom-list-item");
        if (clRow) {
          home_details.toggleCustomListMembership(clRow);
          return;
        }
        if (!target.closest("#crunchylist-modal .crunchylist-card")) {
          home_details.closeListManager();
        }
        return;
      }
      var detailBtn = target.closest(".home_details-screen_buttons a");
      if (detailBtn) {
        var allDetailBtns = $(".home_details-screen_buttons a");
        allDetailBtns.removeClass("selected");
        $(detailBtn).addClass("selected");
        home_details.keyDown({ keyCode: tvKey.KEY_ENTER });
      }
      return;
    }

    // 8. Profiles screen (#profiles-screen)
    if (typeof profilesScreen !== "undefined" && main.state === profilesScreen.id) {
      var profileLi = target.closest("#profiles-screen .options li");
      if (profileLi) {
        var allProfiles = $("#profiles-screen .options li");
        allProfiles.removeClass("selected");
        $(profileLi).addClass("selected");
        profilesScreen.keyDown({ keyCode: tvKey.KEY_ENTER });
      }
      return;
    }

    // 9. Login screen (#login-screen)
    if (typeof login !== "undefined" && main.state === login.id) {
      var loginOption = target.closest("#login-screen .login-screen-option");
      if (loginOption) {
        var allLogin = $(".login-screen-option");
        var loginIdx = allLogin.index(loginOption);
        login.move(loginIdx);
        var inputEl = loginOption.querySelector("input");
        if (inputEl) {
          inputEl.focus();
        } else {
          login.keyDown({ keyCode: tvKey.KEY_ENTER });
        }
      }
      return;
    }

    // 10. Home screen (#home-screen)
    if (typeof home !== "undefined" && main.state === home.id) {
      var browseBack = target.closest(".browse-back");
      if (browseBack) {
        home.keyDown({ keyCode: tvKey.KEY_ESCAPE });
        return;
      }

      var bannerBtn = target.closest("#home-screen .details .buttons a");
      if (bannerBtn) {
        var allBannerBtns = $("#home-screen .details .buttons a");
        allBannerBtns.removeClass("selected");
        $(bannerBtn).addClass("selected");
        home.position = 0;
        home.keyDown({ keyCode: tvKey.KEY_ENTER });
        return;
      }

      var rowItem = target.closest("#home-screen .row-content .item");
      if (rowItem) {
        var rowContent = rowItem.closest(".row-content");
        var allRows = $("#home-screen .row-content");
        var rowIndex = allRows.index(rowContent);
        var slideIndex = $(rowItem).attr("data-slick-index");
        var itemIdx =
          slideIndex !== undefined
            ? parseInt(slideIndex, 10)
            : $(rowContent).find(".item").index(rowItem);

        if (
          rowIndex >= 0 &&
          home.data &&
          home.data.main &&
          home.data.main.lists[rowIndex] &&
          itemIdx >= 0 &&
          itemIdx < home.data.main.lists[rowIndex].items.length
        ) {
          $(".details.full").removeClass("full");
          allRows.removeClass("selected");
          $(rowContent).addClass("selected");
          home.position = rowIndex + 1;
          if (rowContent && rowContent.slick) {
            rowContent.slick.currentSlide = itemIdx;
          }
          home.show_details();
          home_details.init(home.data.main.lists[rowIndex].items[itemIdx]);
        }
      }
      return;
    }

    // 11. Browse / Categories screen (#browse-screen)
    if (typeof browse !== "undefined" && main.state === browse.id) {
      var browseItem = target.closest("#browse-screen .browse-content .item");
      if (browseItem) {
        var allBrowse = $("#browse-screen .browse-content .item");
        var bIdx = allBrowse.index(browseItem);
        if (bIdx >= 0) {
          allBrowse.removeClass("focus");
          allBrowse.eq(bIdx).addClass("focus");
          browse.keyDown({ keyCode: tvKey.KEY_ENTER });
        }
      }
      return;
    }

    // 12. Search screen (#search-screen)
    if (typeof search !== "undefined" && main.state === search.id) {
      var searchInputBox = target.closest("#search-screen_input");
      if (searchInputBox) {
        search.toggleFocus(-1);
        if (search.input) {
          search.input.focus();
        }
        return;
      }

      var searchItem = target.closest("#search-screen .list-container .item");
      if (searchItem) {
        var allSearchItems = $("#search-screen .list-container .item");
        var sItemIdx = allSearchItems.index(searchItem);
        if (sItemIdx >= 0) {
          search.toggleFocus(sItemIdx);
          search.keyDown({ keyCode: tvKey.KEY_ENTER });
        }
      }
      return;
    }

    // 13. History screen (#history-screen)
    if (typeof historyScreen !== "undefined" && main.state === historyScreen.id) {
      var historyItem = target.closest("#history-screen .list-container-over .item");
      if (historyItem) {
        var allHist = $("#history-screen .list-container-over .item");
        var hIdx = allHist.index(historyItem);
        if (hIdx >= 0) {
          allHist.removeClass("selected");
          allHist.eq(hIdx).addClass("selected");
          historyScreen.keyDown({ keyCode: tvKey.KEY_ENTER });
        }
      }
      return;
    }

    // 14. My List screen (#mylist-screen)
    if (typeof mylist !== "undefined" && main.state === mylist.id) {
      var quickRemoveBtn = target.closest("#mylist-screen .mylist-quick-remove");
      if (quickRemoveBtn) {
        e.stopPropagation();
        var rmListId = quickRemoveBtn.getAttribute("data-list-id");
        var rmContentId = quickRemoveBtn.getAttribute("data-content-id");
        if (rmContentId && typeof mylist.removeItemFromList === "function") {
          mylist.removeItemFromList(rmListId, rmContentId);
        }
        return;
      }
      var mylistItem = target.closest("#mylist-screen .row-content .item");
      if (mylistItem) {
        var mlRowContent = mylistItem.closest(".row-content");
        var mlRow = mylistItem.closest(".row");
        var allMlRows = $("#mylist-screen .row");
        var mlRowIdx = allMlRows.index(mlRow);
        var mlSlideIdx = $(mylistItem).attr("data-slick-index");
        var mlItemIdx =
          mlSlideIdx !== undefined
            ? parseInt(mlSlideIdx, 10)
            : $(mlRowContent).find(".item").index(mylistItem);

        if (
          mlRowIdx >= 0 &&
          mylist.data &&
          mylist.data.lists &&
          mylist.data.lists[mlRowIdx] &&
          mlItemIdx >= 0 &&
          mlItemIdx < mylist.data.lists[mlRowIdx].items.length
        ) {
          allMlRows.removeClass("selected");
          allMlRows.eq(mlRowIdx).addClass("selected");
          mylist.selectedRow = mlRowIdx;
          if (mlRowContent && mlRowContent.slick) {
            mlRowContent.slick.currentSlide = mlItemIdx;
          }
          mylist.details();
          mylist.keyDown({ keyCode: tvKey.KEY_ENTER });
        }
      }
      return;
    }

    // 15. Settings screen (#settings-screen)
    if (typeof settings !== "undefined" && main.state === settings.id) {
      var extLink = target.closest("[data-external-url]");
      if (extLink) {
        var url = extLink.getAttribute("data-external-url");
        if (
          url &&
          window.electronUtilsRender &&
          typeof window.electronUtilsRender.openExternal === "function"
        ) {
          window.electronUtilsRender.openExternal(url);
        }
        return;
      }

      var settingsMenuLi = target.closest("#settings-menu li");
      if (settingsMenuLi) {
        var allSettingsLi = $("#settings-menu li");
        var stIdx = allSettingsLi.index(settingsMenuLi);
        if (stIdx >= 0) {
          settings.isDetails = false;
          allSettingsLi.removeClass("selected active");
          allSettingsLi.eq(stIdx).addClass("selected");
          settings.details.show(settings.options[stIdx]);
        }
        return;
      }

      var settingsDetailLi = target.closest("#settings-details li");
      if (settingsDetailLi) {
        var allDetailLi = $("#settings-details li");
        var dIdx = allDetailLi.index(settingsDetailLi);
        if (dIdx >= 0) {
          settings.isDetails = true;
          var allMenuLi = $("#settings-menu li");
          if (!allMenuLi.filter(".active").length) {
            allMenuLi.filter(".selected").addClass("active");
          }
          allDetailLi.removeClass("selected");
          allDetailLi.eq(dIdx).addClass("selected");
          settings.keyDown({ keyCode: tvKey.KEY_ENTER });
        }
      }
      return;
    }
  });
}

window.onload = function () {
  setupFloatingToolbar();
  setupMouseSupport();
  if (typeof main != "undefined") {
    app.state = true;
    main.init();
  } else {
    app.initError();
  }
};

app.initError = function () {
  app.state = false;
  document.getElementById("error-screen").style.display = "flex";
};

window.onunload = function () {
  if (app.state) main.destroy();
};

app.keyDown = function (e) {
  if (typeof main !== "undefined" && typeof main.resolveState === "function") {
    main.resolveState();
  }
  var activeTag = document.activeElement && document.activeElement.tagName;

  // Handle Tab / Shift+Tab cycling on the Login screen
  if (e.keyCode === 9 && typeof login !== "undefined" && main.state === login.id) {
    e.preventDefault();
    var nextIdx = e.shiftKey
      ? (login.selected + 2) % 3
      : (login.selected + 1) % 3;
    login.move(nextIdx, true);
    return;
  }

  if (activeTag === "INPUT" || activeTag === "TEXTAREA") {
    if (e.keyCode === 13) {
      e.preventDefault();
      if (typeof search !== "undefined" && main.state === search.id) {
        document.activeElement.blur();
        search.start();
      } else if (typeof login !== "undefined" && main.state === login.id) {
        var passEl = document.getElementById("login-password");
        if (document.activeElement.id === "login-username" && passEl && !passEl.value) {
          login.move(1, true);
        } else {
          document.activeElement.blur();
          login.action(2);
        }
      }
      return;
    } else if (e.keyCode === 40 && typeof search !== "undefined" && main.state === search.id) {
      if (search.data && search.data.result && search.data.result.length > 0) {
        e.preventDefault();
        document.activeElement.blur();
        search.toggleFocus(0);
      }
      return;
    } else if (e.keyCode === 38 && typeof login !== "undefined" && main.state === login.id) {
      e.preventDefault();
      login.move(Math.max(0, login.selected - 1), true);
      return;
    } else if (e.keyCode === 40 && typeof login !== "undefined" && main.state === login.id) {
      e.preventDefault();
      login.move(Math.min(2, login.selected + 1), true);
      return;
    } else if (e.keyCode === 27) {
      document.activeElement.blur();
      return;
    }
    return;
  }

  // Backspace or Alt+Left goes back one screen when not typing in an input
  if (e.keyCode === 8 || (e.altKey && e.keyCode === 37)) {
    e.preventDefault();
    if (typeof window.navigateBack === "function") {
      window.navigateBack();
    } else {
      sendKey(tvKey.KEY_ESCAPE);
    }
    return;
  }

  // Ctrl+F or '/' jumps straight to Search on catalog screens
  if (
    ((e.ctrlKey || e.metaKey) && e.keyCode === 70) ||
    (!e.ctrlKey && !e.metaKey && !e.altKey && e.key === "/")
  ) {
    if (typeof search !== "undefined" && typeof main !== "undefined" && main.state === search.id) {
      e.preventDefault();
      if (search.input) {
        search.toggleFocus(-1);
        search.input.focus();
      }
      return;
    }
    var canJumpToSearch =
      typeof main !== "undefined" &&
      typeof menu !== "undefined" &&
      document.getElementById(menu.id) &&
      !document.getElementById("crunchylist-modal") &&
      (main.state === (typeof home !== "undefined" && home.id) ||
        main.state === (typeof browse !== "undefined" && browse.id) ||
        main.state === (typeof mylist !== "undefined" && mylist.id) ||
        main.state === (typeof historyScreen !== "undefined" && historyScreen.id) ||
        main.state === (typeof settings !== "undefined" && settings.id));
    if (canJumpToSearch) {
      e.preventDefault();
      var menuOpts = $("#menu-screen .option");
      if (menuOpts.length > 1) {
        menuOpts.removeClass("focus");
        menuOpts.eq(1).addClass("focus");
        menu.keyDown({ keyCode: tvKey.KEY_ENTER });
      }
      return;
    }
  }

  // Space bar toggles Play/Pause on the video player screen
  if (e.keyCode === 32 || e.key === " " || e.code === "Space") {
    e.preventDefault();
    if (typeof video !== "undefined" && main.state === video.id) {
      if (
        !video.settings.open &&
        !(video.episodesDrawer && video.episodesDrawer.open)
      ) {
        if (typeof video.isAutoSkipping === "function" && video.isAutoSkipping()) {
          video.abortAutoSkip();
        }
        video.showOSD();
        player.playPause();
      }
      return;
    }
  }

  // Pressing arrow keys switches back to keyboard navigation mode
  if (e.keyCode >= 37 && e.keyCode <= 40) {
    document.body.classList.remove("mouse-mode");
    var tracks = document.querySelectorAll(".slick-track");
    for (var i = 0; i < tracks.length; i++) {
      delete tracks[i]._posX;
      delete tracks[i]._posY;
    }
  }

  if (app.state) main.keyDown(e);
  else {
    switch (e.keyCode) {
      case tvKey.KEY_BACK:
      case tvKey.KEY_EXIT:
      case 27:
        typeof tizen != "undefined" && tizen.application.getCurrentApplication().hide();
        break;
    }
  }
};
