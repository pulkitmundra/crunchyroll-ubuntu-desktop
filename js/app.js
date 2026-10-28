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
    '<button id="btn-nav-back" tabindex="-1" class="floating-btn" title="Back (Esc or Right-Click)">' +
    '<i class="fa-solid fa-arrow-left"></i> <span>Back</span>' +
    "</button>" +
    '<button id="btn-nav-menu" tabindex="-1" class="floating-btn" title="Toggle Menu">' +
    '<i class="fa-solid fa-bars"></i> <span>Menu</span>' +
    "</button>" +
    '<button id="btn-mini-float" tabindex="-1" class="floating-btn" title="Shortcut: F9 or Ctrl+M">' +
    '<i class="fa-solid fa-clone"></i> <span id="lbl-mini-float">Mini Float (F9)</span>' +
    "</button>" +
    '<button id="btn-pin-top" tabindex="-1" class="floating-btn" title="Shortcut: F10 or Ctrl+T">' +
    '<i class="fa-solid fa-thumbtack"></i> <span id="lbl-pin-top">Pin on Top (F10)</span>' +
    "</button>" +
    "</div>";
  document.body.appendChild(dock);

  var btnBack = document.getElementById("btn-nav-back");
  var btnMenu = document.getElementById("btn-nav-menu");
  var btnMini = document.getElementById("btn-mini-float");
  var btnPin = document.getElementById("btn-pin-top");
  var lblMini = document.getElementById("lbl-mini-float");
  var lblPin = document.getElementById("lbl-pin-top");

  btnBack.addEventListener("click", function (e) {
    e.stopPropagation();
    this.blur();
    sendKey(tvKey.KEY_ESCAPE);
  });

  btnMenu.addEventListener("click", function (e) {
    e.stopPropagation();
    this.blur();
    if (typeof exit !== "undefined" && document.getElementById(exit.id)) {
      exit.destroy();
    }
    if (typeof keyboard !== "undefined" && document.getElementById(keyboard.id)) {
      keyboard.destroy();
    }
    if (typeof menu !== "undefined") {
      if (!document.getElementById(menu.id) && typeof session !== "undefined" && session.storage && session.storage.account) {
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

  function checkCompactWindow(state) {
    var isSmall =
      (state && (state.isCompact || state.isMiniPlayer)) ||
      (window.outerWidth > 0 && window.outerWidth < 1000) ||
      window.devicePixelRatio < 0.65;
    if (isSmall) {
      document.body.classList.add("compact-window");
    } else {
      document.body.classList.remove("compact-window");
    }
  }

  function renderState(state) {
    checkCompactWindow(state);
    if (!state) return;
    if (state.isMiniPlayer) {
      btnMini.classList.add("active");
      lblMini.textContent = "Exit Mini (F9)";
    } else {
      btnMini.classList.remove("active");
      lblMini.textContent = "Mini Float (F9)";
    }

    if (state.isPinned) {
      btnPin.classList.add("active");
      lblPin.textContent = "Pinned on Top (F10)";
    } else {
      btnPin.classList.remove("active");
      lblPin.textContent = "Pin on Top (F10)";
    }
  }

  var hideTimer = null;
  var lastMouseMoveTime = 0;
  var lastResizeTime = 0;
  var lastScreenX = null;
  var lastScreenY = null;

  function scheduleUnifiedHide(delayMs) {
    var ms = typeof delayMs === "number" ? delayMs : 2000;
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      document.body.classList.remove("show-floating-toolbar");
      dock.classList.remove("expanded");
      if (
        typeof video !== "undefined" &&
        main.state === video.id &&
        !video.settings.open
      ) {
        document.body.classList.add("hide-cursor");
        video.hideOSD();
      }
    }, ms);
  }

  window.syncUserActivityTimer = scheduleUnifiedHide;

  window.addEventListener("resize", function () {
    lastResizeTime = Date.now();
    checkCompactWindow();
    if (
      typeof video !== "undefined" &&
      main.state === video.id &&
      !video.settings.open &&
      !video.speed.state &&
      video.timers &&
      video.timers.osd
    ) {
      scheduleUnifiedHide(500);
      clearTimeout(video.timers.osd.object);
      video.timers.osd.object = setTimeout(function () {
        video.hideOSD();
      }, 500);
    }
  });
  checkCompactWindow();

  btnMini.addEventListener("click", function (e) {
    e.stopPropagation();
    this.blur();
    if (window.electronUtilsRender && window.electronUtilsRender.toggleMiniPlayer) {
      window.electronUtilsRender.toggleMiniPlayer().then(renderState);
    }
  });

  btnPin.addEventListener("click", function (e) {
    e.stopPropagation();
    this.blur();
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
      if (now - lastResizeTime < 450) return;
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
    document.body.classList.add("mouse-mode");
    document.body.classList.add("show-floating-toolbar");
    document.body.classList.remove("hide-cursor");
    checkCompactWindow();

    // Expand the top-center dock only when cursor is near the top-center zone
    if (e && typeof e.clientY === "number" && typeof e.clientX === "number") {
      var w = window.innerWidth || 1920;
      var maxY = document.body.classList.contains("compact-window") ? 130 : 75;
      var inTopCenter =
        e.clientY < maxY && e.clientX > w * 0.25 && e.clientX < w * 0.75;
      if (inTopCenter) {
        dock.classList.add("expanded");
      } else if (!dock.matches(":hover")) {
        dock.classList.remove("expanded");
      }
    }

    if (
      typeof video !== "undefined" &&
      main.state === video.id &&
      !video.settings.open
    ) {
      video.showOSD(Boolean(video.speed && video.speed.state));
    } else {
      scheduleUnifiedHide(2000);
    }
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
  var menuEnteredByMouse = false;

  function canHoverSidebarMenu() {
    if (typeof menu === "undefined") return false;
    var menuEl = document.getElementById(menu.id);
    if (!menuEl || menuEl.offsetParent === null) return false;
    if (typeof exit !== "undefined" && document.getElementById(exit.id)) return false;
    if (typeof changelog !== "undefined" && document.getElementById(changelog.id)) return false;
    if (typeof keyboard !== "undefined" && document.getElementById(keyboard.id)) return false;
    if (typeof video !== "undefined" && document.getElementById(video.id)) return false;
    if (
      document.body.classList.contains("home_details-screen") ||
      document.body.classList.contains("home_episodes-screen")
    ) {
      return false;
    }
    return true;
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
      video.showOSD();
    }
  }

  window.addEventListener("mousedown", function (e) {
    if (e.button !== 0 || !e.target) return;
    if (typeof video !== "undefined" && main.state === video.id) {
      var osdEl = document.getElementById("osd");
      var osdVisible = !osdEl || osdEl.style.opacity == 1;
      var barEl = osdVisible && e.target.closest(".osd .progress .bar");
      if (barEl) {
        isDraggingProgress = true;
        seekAtClientX(barEl, e.clientX);
        e.preventDefault();
      }
    }
  });

  window.addEventListener("mousemove", function (e) {
    if (isDraggingProgress) {
      var barEl = document.querySelector(".osd .progress .bar");
      if (barEl) {
        seekAtClientX(barEl, e.clientX);
      }
      return;
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
          !e.target.closest("#top-center-dock")
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

  window.addEventListener("mouseup", function () {
    if (isDraggingProgress) {
      setTimeout(function () {
        isDraggingProgress = false;
      }, 0);
    }
  });

  // Right-click anywhere goes Back (Esc)
  window.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    sendKey(tvKey.KEY_ESCAPE);
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
    if (typeof menu !== "undefined" && canHoverSidebarMenu()) {
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
      if (video.settings && video.settings.open) {
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
          if (cat && cat.images && cat.images.background && cat.images.background[4]) {
            $("#browse-background").attr("src", cat.images.background[4].source);
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

    // 12. Settings screen hover: hovering left category previews its options on the right
    if (typeof settings !== "undefined" && main.state === settings.id) {
      var setMenuLi = target.closest("#settings-menu li");
      if (setMenuLi) {
        var allSetMenu = $("#settings-menu li");
        var stIdx = allSetMenu.index(setMenuLi);
        if (stIdx >= 0 && settings.options[stIdx]) {
          var prevActiveIdx = allSetMenu.index($("#settings-menu li.active, #settings-menu li.selected"));
          settings.isDetails = false;
          allSetMenu.removeClass("selected active");
          allSetMenu.eq(stIdx).addClass("selected");
          if (prevActiveIdx !== stIdx) {
            settings.details.show(settings.options[stIdx]);
          }
        }
        return;
      }
      var setDetailLi = target.closest("#settings-details li");
      if (setDetailLi) {
        var allSetMenuForDetail = $("#settings-menu li");
        if (!allSetMenuForDetail.filter(".active").length) {
          allSetMenuForDetail.filter(".selected").addClass("active");
        }
        settings.isDetails = true;
        $("#settings-details li").removeClass("selected");
        $(setDetailLi).addClass("selected");
        return;
      }
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
          titleEl.style.fontSize =
            titleEl.scrollHeight > titleEl.clientHeight ? "3.5vh" : "5vh";
        }
        var descEl = $("#home-screen .details .info .description")[0];
        if (descEl) {
          descEl.innerText = item.description;
          descEl.style.fontSize =
            descEl.scrollHeight > descEl.clientHeight ? "2vh" : "2.5vh";
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

      // 1. Video screen: scroll audio/subtitle lists inside #languages-content when settings drawer is open
      if (typeof video !== "undefined" && main.state === video.id) {
        if (video.settings && video.settings.open) {
          var langCol = target && (target.closest("#audios") || target.closest("#subtitles"));
          if (!langCol) {
            var subsEl = document.getElementById("subtitles");
            var audiosEl = document.getElementById("audios");
            if (subsEl && audiosEl) {
              var subsRect = subsEl.getBoundingClientRect();
              langCol = e.clientX >= subsRect.left - 20 ? subsEl : audiosEl;
            } else {
              langCol = subsEl || audiosEl;
            }
          }
          if (langCol && langCol.firstElementChild) {
            var firstOpt = langCol.firstElementChild;
            var maxVisible = langCol.id === "audios" ? 4 : 3;
            var maxLangScroll = Math.max(0, (langCol.children.length - maxVisible) * 82);
            scrollMarginElement(firstOpt, dy, maxLangScroll);
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
            var seasonCount = offsetEl.querySelectorAll(".season").length;
            var maxSeasonScroll = Math.max(
              0,
              (seasonCount - 6) * 85,
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
            var firstItem = rItems[0];
            var lastRealItem = rItems[Math.min(realItemCount - 1, rItems.length - 1)];
            var totalRowW =
              firstItem && lastRealItem
                ? lastRealItem.offsetLeft - firstItem.offsetLeft + lastRealItem.offsetWidth + 80
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
              nextRowX > maxRowX - 600
            ) {
              listData.lazy = false;
              loading.start();
              mapper.loadCategoryListAsync(
                home.data.main.category + "," + listData.id,
                listData.items.length,
                20,
                rIdx,
                {
                  success: function (response, index) {
                    home.data.main.lists[index].lazy = response.items.length === 20;
                    home.addToList(index, mapper.mapItems(response.items));
                    loading.end();
                  },
                  error: function () {
                    loading.end();
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
          var firstRowEl = rowEls[0];
          var lastRowEl = rowEls[rowEls.length - 1];
          var detailsH = window.innerHeight * 0.5;
          var viewH = Math.max(300, window.innerHeight - detailsH);
          var totalH =
            firstRowEl && lastRowEl
              ? lastRowEl.offsetTop - firstRowEl.offsetTop + lastRowEl.offsetHeight + 100
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
            var mlFirstItem = mlItems[0];
            var mlLastReal = mlItems[Math.min(mlRealCount - 1, mlItems.length - 1)];
            var mlTotalW =
              mlFirstItem && mlLastReal
                ? mlLastReal.offsetLeft - mlFirstItem.offsetLeft + mlLastReal.offsetWidth + 80
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
          var maxBrowseScroll = Math.max(
            0,
            (items.length - 7) * 110,
            getContentHeight(wrapEl) - (window.innerHeight - 160)
          );
          scrollMarginElement(wrapEl, dy, maxBrowseScroll);
        }
        return;
      }

      // 7. Settings screen (#settings-screen)
      if (typeof settings !== "undefined" && main.state === settings.id) {
        var settingsUl =
          document.getElementById("list-details-offset") ||
          document.querySelector("#settings-details ul");
        var settingsCont = document.getElementById("settings-details");
        if (settingsUl) {
          var maxSetScroll = Math.max(
            0,
            (settingsUl.children.length - 5) * 104,
            getContentHeight(settingsUl) -
              (settingsCont ? settingsCont.clientHeight : window.innerHeight * 0.65) +
              80
          );
          scrollMarginElement(settingsUl, dy, maxSetScroll);
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
    if (!target || target.closest("#top-center-dock")) {
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
      if (skipIntro && video.intro && video.intro.state) {
        player.forwardTo(video.intro.end);
        return;
      }

      var nextEp = target.closest(".next-episode");
      if (nextEp && video.next && video.next.status) {
        clearInterval(video.timers.next);
        video.playNext();
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

      var progressBar = osdVisible && target.closest(".osd .progress .bar");
      if (progressBar) {
        var rect = progressBar.getBoundingClientRect();
        var ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        var dur = player.getDuration();
        if (dur && dur > 0) {
          player.forwardTo(ratio * dur);
          video.setPlayingTime();
          video.showOSD();
        }
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
          if (typeof video !== "undefined" && main.state === video.id && !video.settings.open) {
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

    // 7. Anime Details screen (.home_details-screen_buttons a)
    if (typeof home_details !== "undefined" && main.state === home_details.id) {
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
        if (home._previewItem) {
          home_details.init(home._previewItem);
        } else {
          home.position = 0;
          home.keyDown({ keyCode: tvKey.KEY_ENTER });
        }
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
  var activeTag = document.activeElement && document.activeElement.tagName;
  if (activeTag === "INPUT" || activeTag === "TEXTAREA") {
    if (e.keyCode === 13) {
      e.preventDefault();
      document.activeElement.blur();
      if (typeof search !== "undefined" && main.state === search.id) {
        search.start();
      } else if (typeof login !== "undefined" && main.state === login.id) {
        login.action(2);
      }
      return;
    } else if (e.keyCode === 27) {
      document.activeElement.blur();
      return;
    }
    return;
  }

  // Space bar toggles Play/Pause on the video player screen
  if (e.keyCode === 32 || e.key === " " || e.code === "Space") {
    e.preventDefault();
    if (typeof video !== "undefined" && main.state === video.id) {
      if (!video.settings.open) {
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
