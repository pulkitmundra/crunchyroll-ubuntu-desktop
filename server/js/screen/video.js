window.video = {
  id: "video-screen",
  previous: null,
  episode: null,
  token: null,
  speed: {
    options: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
    active: 1,
    state: false,
  },
  next: {
    shown: false,
    state: false,
    time: 60,
    episode: null,
  },
  option: false,
  options: [
    {
      icon: "fa-solid fa-forward-step",
      action: "nextEpisode",
      param: true,
      label: "Next Episode (N)",
    },
    {
      icon: "fa-solid fa-list-ul",
      action: "openEpisodes",
      label: "Episodes (E)",
    },
    {
      icon: "fa-solid fa-gauge-high playback-speed",
      action: "playbackSpeed",
      param: true,
      label: "Playback Speed ([ / ])",
    },
    {
      icon: "fa-solid fa-message",
      action: "openLanguages",
      label: "Audio & Subtitles (C)",
    },
    {
      icon: "toggle-aspect fa-solid fa-expand",
      action: "toggleAspectRatio",
      label: "Aspect Ratio (Z)",
    },
  ],
  aspects: ["expand", "compress", "crop-simple"],
  aspect: 0,
  subtitles: [],
  subtitle: null,
  audios: [],
  audio: null,
  recap: null,
  intro: null,
  credits: null,
  activeSkip: null,
  autoSkipTimer: null,
  autoSkipActiveKey: null,
  autoSkipAbortedKey: null,
  autoSkipDuration: 3200,
  currentItem: null,
  episodesDrawer: {
    open: false,
    list: [],
    seasonId: null,
  },
  streams: [],
  timers: {
    history: {
      object: null,
      duration: 30000,
    },
    next: null,
    osd: {
      object: null,
      duration: 2000,
    },
  },
  settings: {
    open: false,
    selected: false,
  },

  escapeHtml: function (str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  toggleAspectRatio: function () {
    video.aspect =
      video.aspect < video.aspects.length - 1 ? video.aspect + 1 : 0;
    document.getElementById("videoplayer").className =
      video.aspects[video.aspect];
    $(".toggle-aspect")[0].className = `toggle-aspect fa-solid fa-${
      video.aspects[video.aspect]
    } selected`;
  },

  openLanguages: function () {
    if (video.isAutoSkipping()) {
      video.abortAutoSkip();
    }
    if (video.episodesDrawer && video.episodesDrawer.open) {
      video.closeEpisodes(false);
    }
    video.hideOSD();
    video.settings.open = true;
    player.pause();
    $("#osd-icon").hide();
    $(".player-settings").hide();
    video.setAudios();
    video.setSubtitles();
    $(".settings-slide").addClass("open");
    setTimeout(function () {
      var activeAudio = document.querySelector("#audios .option.active");
      if (activeAudio && activeAudio.scrollIntoView) {
        activeAudio.scrollIntoView({ block: "nearest" });
      }
      var activeSub = document.querySelector("#subtitles .option.active");
      if (activeSub && activeSub.scrollIntoView) {
        activeSub.scrollIntoView({ block: "nearest" });
      }
    }, 40);
  },

  isEpisodeMatch: function (ep) {
    if (!ep) return false;
    if (ep.id && ep.id === video.episode) return true;
    var cur = video.currentItem;
    if (
      cur &&
      ep.episode_number !== undefined &&
      cur.episode_number !== undefined &&
      String(ep.episode_number) === String(cur.episode_number) &&
      (!ep.season_number ||
        !cur.season_number ||
        String(ep.season_number) === String(cur.season_number))
    ) {
      return true;
    }
    return false;
  },

  openEpisodes: function () {
    if (video.isAutoSkipping()) {
      video.abortAutoSkip();
    }
    if (video.settings.open) {
      video.settings.open = false;
      $(".settings-slide").removeClass("open");
    }
    video.hideOSD();
    video.episodesDrawer.open = true;
    player.pause();
    $("#osd-icon").hide();
    $(".player-settings").hide();
    $("#player-episodes-slide").addClass("open");
    document.body.classList.remove("hide-cursor");

    var item = video.currentItem || {};
    $("#player-episodes-serie").text(item.serie || item.title || "Episodes");
    $("#player-episodes-season").text(
      item.season_number ? "Season " + item.season_number : "Current Season"
    );

    if (
      video.episodesDrawer.list &&
      video.episodesDrawer.list.length > 0 &&
      video.episodesDrawer.list.some(video.isEpisodeMatch)
    ) {
      video.renderEpisodesDrawer();
      return;
    }

    if (
      typeof home_episodes !== "undefined" &&
      home_episodes.data &&
      Array.isArray(home_episodes.data.episodes) &&
      home_episodes.data.episodes.length > 0 &&
      home_episodes.data.episodes.some(video.isEpisodeMatch)
    ) {
      video.episodesDrawer.list = home_episodes.data.episodes.slice();
      video.renderEpisodesDrawer();
      return;
    }

    video.fetchSeasonEpisodes();
  },

  closeEpisodes: function (resumePlayback) {
    video.episodesDrawer.open = false;
    $("#player-episodes-slide").removeClass("open");
    $("#osd-icon").show();
    video.settings.selected = false;
    $("#setting-options").removeClass("selected");
    $(".player-settings").show();
    if (resumePlayback !== false) {
      player.resume();
    }
  },

  fetchSeasonEpisodes: function () {
    var listEl = document.getElementById("player-episodes-list");
    if (listEl) {
      listEl.innerHTML =
        '<li class="player-ep-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading episodes...</li>';
    }
    var item = video.currentItem || {};

    var loadBySeasonId = function (seasonId) {
      if (!seasonId) return;
      video.episodesDrawer.seasonId = seasonId;
      service.episodes({
        data: { id: seasonId },
        success: function (resp) {
          if (!resp || !Array.isArray(resp.items) || resp.items.length === 0) {
            video.episodesDrawer.list = [];
            video.renderEpisodesDrawer();
            return;
          }
          mapper.episodes(resp, function (mappedList) {
            video.episodesDrawer.list = mappedList || [];
            video.renderEpisodesDrawer();
          });
        },
        error: function () {
          if (listEl) {
            listEl.innerHTML =
              '<li class="player-ep-loading">Unable to load episode list.</li>';
          }
        },
      });
    };

    var loadBySeriesId = function (seriesId) {
      if (!seriesId) {
        if (listEl) {
          listEl.innerHTML =
            '<li class="player-ep-loading">No episode list available.</li>';
        }
        return;
      }
      service.seasons({
        data: { id: seriesId },
        success: function (sResp) {
          var seasons = (typeof mapper !== "undefined" && mapper.seasons(sResp)) || [];
          if (!seasons.length) {
            if (listEl) {
              listEl.innerHTML =
                '<li class="player-ep-loading">No episodes found for this season.</li>';
            }
            return;
          }
          var targetSeason =
            seasons.find(function (s) {
              return (
                item.season_number &&
                String(s.number) === String(item.season_number)
              );
            }) || seasons[0];
          if (video.currentItem) {
            video.currentItem.season_id = targetSeason.id;
          }
          loadBySeasonId(targetSeason.id);
        },
        error: function () {
          if (listEl) {
            listEl.innerHTML =
              '<li class="player-ep-loading">Unable to load episode list.</li>';
          }
        },
      });
    };

    if (item.season_id) {
      loadBySeasonId(item.season_id);
      return;
    }

    var fallbackSeriesId =
      item.series_id ||
      (typeof home_details !== "undefined" &&
        home_details.data &&
        home_details.data.this &&
        home_details.data.this.id) ||
      null;

    service.seriesInfo({
      data: { id: video.episode },
      success: function (resp) {
        var doc = resp && resp.data && resp.data[0];
        var meta = (doc && doc.episode_metadata) || {};
        if (meta.season_id) {
          if (video.currentItem) {
            video.currentItem.season_id = meta.season_id;
            video.currentItem.series_id =
              meta.series_id || video.currentItem.series_id || fallbackSeriesId;
          }
          loadBySeasonId(meta.season_id);
        } else {
          loadBySeriesId(meta.series_id || fallbackSeriesId);
        }
      },
      error: function () {
        loadBySeriesId(fallbackSeriesId);
      },
    });
  },

  renderEpisodesDrawer: function () {
    var listEl = document.getElementById("player-episodes-list");
    if (!listEl) return;
    var list = video.episodesDrawer.list || [];
    if (!list.length) {
      listEl.innerHTML =
        '<li class="player-ep-loading">No episodes found for this season.</li>';
      return;
    }

    var html = "";
    for (var i = 0; i < list.length; i++) {
      var ep = list[i];
      var isCurrent = video.isEpisodeMatch(ep);
      var pct =
        ep.duration > 0
          ? Math.min(100, Math.round(((ep.playhead || 0) * 100) / ep.duration))
          : 0;
      var badge = video.escapeHtml(ep.subDub || ep.sub_dub || "Sub");
      var epTitle = video.escapeHtml(ep.episode || ep.title || "Episode " + (i + 1));
      var epBg = video.escapeHtml(ep.background || "");
      var epNum = video.escapeHtml(ep.episode_number || i + 1);
      html += `
        <li class="player-ep-item${isCurrent ? " active selected" : ""}" data-index="${i}">
          <div class="player-ep-thumb">
            <img src="${epBg}" alt="" loading="lazy">
            <span class="player-ep-num">E${epNum}</span>
            ${ isCurrent ? '<span class="player-ep-playing"><i class="fa-solid fa-volume-high"></i> Playing</span>' : "" }
            <div class="player-ep-progress"><span style="width:${pct}%"></span></div>
          </div>
          <div class="player-ep-info">
            <div class="player-ep-title">${epTitle}</div>
            <div class="player-ep-meta">
              <span>${ep.duration || 24}m</span>
              <span class="player-ep-badge">${badge}</span>
            </div>
          </div>
        </li>`;
    }
    listEl.innerHTML = html;

    setTimeout(function () {
      var activeEl = listEl.querySelector(".player-ep-item.active");
      if (activeEl && activeEl.scrollIntoView) {
        activeEl.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }, 60);
  },

  playEpisodeFromDrawer: function (index) {
    var list = video.episodesDrawer.list || [];
    var ep = list[index];
    if (!ep) return;
    video.closeEpisodes(false);
    if (video.isEpisodeMatch(ep)) {
      player.resume();
      return;
    }
    var curPlayedMin = player.getPlayed() / 60;
    for (var k = 0; k < list.length; k++) {
      if (video.isEpisodeMatch(list[k])) {
        list[k].playhead = curPlayedMin;
      }
    }
    video.saveHistory();
    if (
      typeof home_episodes !== "undefined" &&
      $(".episodes .episodes-list")[0] &&
      $(".episodes .episodes-list")[0].slick
    ) {
      $(".episodes .episodes-list")[0].slick.currentSlide = index;
    }
    video.currentItem = Object.assign({}, video.currentItem || {}, ep);
    video.play(video.currentItem);
    $(".osd #title").text(video.currentItem.serie || "");
    $(".osd #subtitle").text(
      `${video.currentItem.season_number}x${video.currentItem.episode_number} - ${video.currentItem.episode || video.currentItem.title || ""}`
    );
  },

  getSettings: function () {
    return video.options
      .map(
        (element) =>
          `<i class="${element.icon}" data-tooltip="${element.label || ""}" title="${element.label || ""}"></i>`
      )
      .join("");
  },

  syncVolumeUI: function () {
    var v = typeof player !== "undefined" && player.video ? player.video : document.getElementById("videoplayer");
    if (!v) return;
    var muted = Boolean(v.muted || v.volume === 0);
    var pct = muted ? 0 : Math.round((typeof v.volume === "number" ? v.volume : 1) * 100);
    var iconEl = document.getElementById("btn-volume-mute");
    var fillEl = document.getElementById("volume-fill");
    var lblEl = document.getElementById("volume-label");
    if (iconEl) {
      if (muted || pct === 0) {
        iconEl.className = "fa-solid fa-volume-xmark muted";
      } else if (pct < 50) {
        iconEl.className = "fa-solid fa-volume-low";
      } else {
        iconEl.className = "fa-solid fa-volume-high";
      }
    }
    if (fillEl) {
      fillEl.style.width = pct + "%";
    }
    if (lblEl) {
      lblEl.textContent = muted ? "Muted" : pct + "%";
    }
  },

  init: function (item) {
    clearTimeout(video.timers.osd.object);
    clearInterval(video.timers.next);
    clearInterval(video.timers.history.object);
    video.clearAutoSkip(true);
    $("[id='video-screen']").remove();
    video.settings.open = false;
    video.episodesDrawer.open = false;
    video.episodesDrawer.list = [];
    video.speed.state = false;
    video.option = false;
    video.currentItem = Object.assign({}, item);
    if (typeof menu !== "undefined" && menu.isOpen) {
      menu.close();
    }

    var video_element = document.createElement("div");
    video_element.id = video.id;

    video.play(item);

    var safeTitle = video.escapeHtml(item.serie || item.title || "");
    var rawSubtitle =
      item.season_number !== undefined && item.episode_number !== undefined
        ? item.season_number +
          "x" +
          item.episode_number +
          (item.episode ? " - " + item.episode : "")
        : item.episode || item.description || "";
    var safeSubtitle = video.escapeHtml(rawSubtitle);
    var safeSerieDrawer = video.escapeHtml(item.serie || "Episodes");
    var safeSeasonDrawer = video.escapeHtml(item.season_number || 1);

    video_element.innerHTML = `
    <div class="content">
      <img id="background" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=">
      <video id="videoplayer" style="width:100%; height:100%;"></video>
      <div class="osd" id="osd">
        <div class="player-settings">
          <div id="setting-options">
            ${video.getSettings()}
          </div>
        </div>
        <div class="details">
          <div id="title">${safeTitle}</div>
          <div id="subtitle">${safeSubtitle}</div>
        </div>
        <div class="progress">
          <div id="time">00:00:00</div>
          <div class="bar">
            <div id="seek-hover"></div>
            <div id="played">
              <div class="preview">
                <img id="preview">
              </div>
            </div>
            <div id="seek-tooltip">00:00</div>
          </div>
          <div id="total">00:00:00</div>
          <div id="osd-volume" title="Click icon to Mute (M) or scroll wheel for Volume">
            <i id="btn-volume-mute" class="fa-solid fa-volume-high"></i>
            <div id="volume-bar">
              <div id="volume-fill"></div>
            </div>
            <span id="volume-label">100%</span>
          </div>
        </div>
      </div>
      <div id="osd-icon" class="icon-status">
        <div class="icon"></div>
        <div id="osd-icon-data" class="percent"></div>
      </div>
      <div class="next-episode">
        <div class="next-episode-image">
          <img id="next-episode-image">
          <div id="next-episode-count"></div>
        </div>
      </div>

      <div id="skip-intro">
        <span class="skip-fill"></span>
        <span class="skip-content">
          <i class="fa-solid fa-forward"></i>
          <span id="skip-intro-label">${video.escapeHtml(translate.go("video.skip"))}</span>
        </span>
      </div>

      <div class="settings-slide">
        <div id="languages-content">
          <div class="title">${translate.go("video.languages.audios")}</div>
          <ul id="audios"></ul>
          <div class="title">${translate.go("video.languages.subtitles")}</div>
          <ul id="subtitles"></ul>
        </div>
      </div>

      <div class="episodes-slide" id="player-episodes-slide">
        <div class="episodes-slide-header">
          <div class="episodes-slide-titles">
            <div class="episodes-slide-serie" id="player-episodes-serie">${safeSerieDrawer}</div>
            <div class="episodes-slide-season" id="player-episodes-season">Season ${safeSeasonDrawer}</div>
          </div>
          <button type="button" id="player-episodes-close" title="Close (Esc / E)">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <ul id="player-episodes-list"></ul>
      </div>
    </div>`;
    document.body.appendChild(video_element);
    video.syncVolumeUI();

    $(`#${home.id}`).hide();
    if (main.state !== video.id) {
      video.previous = main.state;
    }
    main.state = video.id;
  },

  destroy: function () {
    document.body.classList.remove("scrubbing-progress", "scrubbing-volume");
    video.clearAutoSkip(true);
    video.hideOSD();
    document.body.classList.remove("hide-cursor");
    if (video.episode && typeof player !== "undefined" && player.getPlayed() > 0) {
      video.saveHistory();
    }
    player.stop();
    clearTimeout(video.timers.osd.object);
    clearInterval(video.timers.next);
    clearInterval(video.timers.history.object);
    $("[id='video-screen']").remove();
    $(`#${home.id}`).show();
    video.next.episode = null;
    video.next.status = false;
    video.next.shown = false;
    video.episode = null;
    video.currentItem = null;
    video.activeSkip = null;
    video.recap = null;
    video.intro = null;
    video.credits = null;
    video.episodesDrawer.open = false;
    video.episodesDrawer.list = [];
    video.data = null;
    video.streams = [];
    video.speed.state = false;
    video.speed.active = 1;
    video.settings.open = false;
    video.option = false;
    if (typeof main !== "undefined" && typeof main.resolveState === "function") {
      main.state = main.resolveState() || video.previous;
    } else {
      main.state = video.previous;
    }
    if (
      typeof home_details !== "undefined" &&
      document.body.classList.contains(home_details.id)
    ) {
      $(`#${home.id} .content > .details`).addClass("full");
      if (typeof home_details.refreshContinue === "function") {
        setTimeout(function () {
          if (document.body.classList.contains(home_details.id)) {
            home_details.refreshContinue(false);
          }
        }, 250);
      }
    }
    if (typeof window.refreshSlickLayouts === "function") {
      window.refreshSlickLayouts();
    }
  },

  keyDown: function (event) {
    // Ignore modifier and window shortcut keys (Tab, Shift, Ctrl, Alt, Super, F1-F12).
    // XWayland can leave a function key "stuck" after a window resize and auto-repeat it
    // every ~30ms, which would otherwise keep re-showing the OSD indefinitely.
    var kc = event.keyCode;
    if ([9, 16, 17, 18, 91, 92, 93].includes(kc) || (kc >= 112 && kc <= 123)) {
      return;
    }
    var osd = true;
    var drawerOpen = Boolean(
      video.settings.open || (video.episodesDrawer && video.episodesDrawer.open)
    );
    switch (event.keyCode) {
      case tvKey.KEY_STOP:
      case tvKey.IS_KEY_BACK(event.keyCode):
        if (video.episodesDrawer && video.episodesDrawer.open) {
          osd = false;
          video.closeEpisodes(true);
        } else if (video.settings.open) {
          osd = false;
          video.settings.open = false;
          $(".settings-slide").removeClass("open");
          $("#osd-icon").show();
          video.settings.selected = false;
          $("#setting-options").removeClass("selected");
          $(".player-settings").show();
          player.resume();
        } else if (video.isAutoSkipping()) {
          osd = false;
          video.abortAutoSkip();
        } else {
          if (video.next.status) {
            video.stopNext();
          } else if (video.speed.state) {
            video.hidePlaySpeed();
            video.showOSD();
          } else {
            video.destroy();
          }
        }
        break;
      case tvKey.KEY_PLAY:
        !drawerOpen && player.resume();
        break;
      case tvKey.KEY_PAUSE:
        if (!drawerOpen) {
          if (video.isAutoSkipping()) video.abortAutoSkip();
          player.pause();
        }
        break;
      case tvKey.KEY_PLAY_PAUSE:
      case 32:
      case 75:
        if (!drawerOpen) {
          if (video.isAutoSkipping()) video.abortAutoSkip();
          player.playPause();
        }
        break;
      case tvKey.KEY_ENTER:
      case tvKey.KEY_PANEL_ENTER:
        if (video.episodesDrawer && video.episodesDrawer.open) {
          osd = false;
          var selectedEp = $("#player-episodes-list .player-ep-item.selected");
          if (selectedEp.length) {
            var epIndex = Number(selectedEp.attr("data-index"));
            video.playEpisodeFromDrawer(epIndex);
          }
        } else if (video.settings.open) {
          osd = false;
          var selected = $("#languages-content .option.selected");
          var isAudio = selected.parent().attr("id") === "audios";
          var active = selected.parent().children(".option.active");

          if (selected.length && active[0] !== selected[0]) {
            var options = selected.parent().children(".option");

            options.removeClass("active");
            selected.addClass("active");

            video.settings.open = false;
            $(".settings-slide").removeClass("open");
            $("#osd-icon").show();
            video.settings.selected = false;
            $("#setting-options").removeClass("selected");
            $(".player-settings").show();

            isAudio
              ? video.changeAudio(options.index(selected[0]))
              : video.changeSubtitle(options.index(selected[0]));
          } else if (selected.length) {
            video.settings.open = false;
            $(".settings-slide").removeClass("open");
            $("#osd-icon").show();
            video.settings.selected = false;
            $("#setting-options").removeClass("selected");
            $(".player-settings").show();
            player.resume();
          }
        } else if (video.speed && video.speed.state) {
          osd = false;
          video.hidePlaySpeed();
          video.showOSD();
        } else if (
          video.option &&
          document.getElementById("osd") &&
          document.getElementById("osd").style.opacity == 1 &&
          $("#setting-options i.selected").length
        ) {
          var selected = $("#setting-options i").index(
            $("#setting-options i.selected")
          );
          if (selected >= 0 && video.options[selected]) {
            osd = !video[video.options[selected].action](
              video.options[selected].param
            );
          }
        } else if (video.activeSkip || (video.intro && video.intro.state)) {
          osd = false;
          video.skipCurrentSegment();
        } else {
          if (video.next.status) {
            clearInterval(video.timers.next);
            video.playNext();
          } else {
            if (document.getElementById("osd").style.opacity == 1) {
              player.playPause();
            }
          }
        }
        break;
      case tvKey.KEY_PREVIOUS:
      case tvKey.KEY_LEFT:
        if (video.option) {
          if (video.speed.state) {
            osd = false;
            video.setSpeed(-1);
          } else {
            var options = $("#setting-options i");
            var selected = options.index($("#setting-options i.selected"));
            options.removeClass("selected");
            options
              .eq(selected > 0 ? selected - 1 : selected)
              .addClass("selected");
          }
        } else if (!drawerOpen) {
          if (video.isAutoSkipping()) video.abortAutoSkip();
          player.rewind(video.setPlayingTime);
        }
        break;
      case tvKey.KEY_RIGHT:
      case tvKey.KEY_NEXT:
        if (video.option) {
          if (video.speed.state) {
            osd = false;
            video.setSpeed(1);
          } else {
            var options = $("#setting-options i");
            var selected = options.index($("#setting-options i.selected"));
            options.removeClass("selected");
            options
              .eq(selected < video.options.length - 1 ? selected + 1 : selected)
              .addClass("selected");
          }
        } else if (!drawerOpen) {
          if (video.isAutoSkipping()) video.abortAutoSkip();
          player.forward(video.setPlayingTime);
        }
        break;
      case tvKey.KEY_UP:
        if (video.episodesDrawer && video.episodesDrawer.open) {
          osd = false;
          var epItems = $("#player-episodes-list .player-ep-item");
          var curEp = epItems.index($("#player-episodes-list .player-ep-item.selected"));
          epItems.removeClass("selected");
          var nextEpIdx = curEp > 0 ? curEp - 1 : 0;
          var nextEl = epItems.eq(nextEpIdx).addClass("selected")[0];
          if (nextEl && nextEl.scrollIntoView) {
            nextEl.scrollIntoView({ block: "nearest" });
          }
        } else if (video.settings.open) {
          var options = $("#languages-content .option");
          if (!options.length) break;
          var current = options.index($("#languages-content .option.selected"));
          if (current < 0) {
            current = options.index($("#languages-content .option.active"));
          }

          options.removeClass("selected");

          var newCurrent = current > 0 ? current - 1 : 0;
          var nextOptEl = options.eq(newCurrent).addClass("selected")[0];
          if (nextOptEl && nextOptEl.scrollIntoView) {
            nextOptEl.scrollIntoView({ block: "nearest" });
          }
        } else {
          player.adjustVolume(0.05);
        }
        break;
      case tvKey.KEY_DOWN:
        if (video.episodesDrawer && video.episodesDrawer.open) {
          osd = false;
          var epItems = $("#player-episodes-list .player-ep-item");
          var curEp = epItems.index($("#player-episodes-list .player-ep-item.selected"));
          epItems.removeClass("selected");
          var nextEpIdx = curEp < epItems.length - 1 ? curEp + 1 : curEp;
          var nextEl = epItems.eq(nextEpIdx).addClass("selected")[0];
          if (nextEl && nextEl.scrollIntoView) {
            nextEl.scrollIntoView({ block: "nearest" });
          }
        } else if (video.settings.open) {
          var options = $("#languages-content .option");
          if (!options.length) break;
          var current = options.index($("#languages-content .option.selected"));
          if (current < 0) {
            current = options.index($("#languages-content .option.active"));
          }

          options.removeClass("selected");

          var newCurrent = current < options.length - 1 ? current + 1 : current;
          var nextOptEl = options.eq(newCurrent).addClass("selected")[0];
          if (nextOptEl && nextOptEl.scrollIntoView) {
            nextOptEl.scrollIntoView({ block: "nearest" });
          }
        } else if (video.speed.state) {
          video.hidePlaySpeed();
          video.showOSD();
        } else if (video.option) {
          video.option = false;
          $("#setting-options").children().removeClass("selected");
        } else {
          player.adjustVolume(-0.05);
        }
        break;
      case 77: // M: Mute / Unmute
        !drawerOpen && player.toggleMute();
        break;
      case 70: // F: Toggle Fullscreen
        if (window.electronUtilsRender && window.electronUtilsRender.toggleFullScreen) {
          window.electronUtilsRender.toggleFullScreen();
        }
        break;
      case 67: // C: Audio & Subtitles drawer
        if (video.settings.open) {
          video.keyDown({ keyCode: tvKey.KEY_ESCAPE });
          osd = false;
        } else {
          video.openLanguages();
          osd = false;
        }
        break;
      case 69: // E: Episodes drawer
        if (video.episodesDrawer && video.episodesDrawer.open) {
          video.closeEpisodes(true);
          osd = false;
        } else {
          video.openEpisodes();
          osd = false;
        }
        break;
      case 83: // S: Skip active segment (Recap / Intro / Credits)
        if (!drawerOpen && (video.activeSkip || (video.intro && video.intro.state))) {
          osd = false;
          video.skipCurrentSegment();
        }
        break;
      case 78: // N: Next Episode
        !drawerOpen && video.nextEpisode(true);
        break;
      case 90: // Z: Cycle Aspect Ratio
        !drawerOpen && video.toggleAspectRatio();
        break;
      case 74: // J: Rewind 10s
        if (!drawerOpen) {
          if (video.isAutoSkipping()) video.abortAutoSkip();
          player.rewind(video.setPlayingTime, 10);
        }
        break;
      case 76: // L: Forward 10s
        if (!drawerOpen) {
          if (video.isAutoSkipping()) video.abortAutoSkip();
          player.forward(video.setPlayingTime, 10);
        }
        break;
      case 219: // [: Slower playback speed
        !drawerOpen && video.setSpeed(-1);
        break;
      case 221: // ]: Faster playback speed
        !drawerOpen && video.setSpeed(1);
        break;
      default:
        // Unknown / unhandled key: do not treat as activity (prevents stuck-key OSD wakeups)
        osd = false;
        break;
    }
    !drawerOpen && !video.speed.state && osd && video.showOSD();
  },

  end: function () {
    var prefs =
      typeof settings !== "undefined" && typeof settings.getPlaybackPrefs === "function"
        ? settings.getPlaybackPrefs()
        : { autoPlayNext: true };
    if (prefs.autoPlayNext !== false) {
      if (video.next.status && video.next.episode) {
        video.playNext();
      } else {
        video.nextEpisode(true, true);
      }
    } else {
      video.destroy();
    }
  },

  play: function (item, noplay, forceSubtitle) {
    video.episode = item.id;
    service.video_v2({
      data: {
        id: item.id,
      },
      success: function (data) {
        video.token = data.token;
        video.stopNext();
        video.setSkipIntro(item.id);
        video.next.shown = false;
        try {
          video.audio = data.audioLocale;
          video.audios = [{ name: video.audio, id: item.id }];
          if (data.versions) {
            video.audios = data.versions.map((element) => ({
              name: element.audio_locale,
              id: element.guid,
            }));
          }

          if (!forceSubtitle) {
            video.subtitle = data.hardSubs[session.storage.account.language]
              ? session.storage.account.language
              : "Disabled";
            video.subtitle =
              video.subtitle === "Disabled" &&
              data.hardSubs[session.storage.account.audio]
                ? session.storage.account.audio
                : video.subtitle;
          } else {
            video.subtitle = forceSubtitle;
          }
          video.subtitles = data.hardSubs
            ? Object.keys(data.hardSubs).map((element) => ({
                name: element,
                url: data.hardSubs[element].url,
              }))
            : [];

          video.subtitles.unshift({ name: "Disabled", url: data.url });
          var subtitleIndex = video.subtitles.findIndex(
            (e) => e.name === video.subtitle
          );
          if (subtitleIndex < 0) {
            subtitleIndex = 0;
            video.subtitle = "Disabled";
          }

          player.play(
            { token: data.token, id: item.id },
            video.subtitles[subtitleIndex].url,
            item.playhead === item.duration ? 0 : item.playhead,
            noplay
          );
          video.startHistory();
          video.setAudios();
          video.setSubtitles();
        } catch (error) {
          console.log(error);
        }

        setTimeout(() => {
          player.deleteSession({
            data: {
              id: video.episode,
              token: video.token,
            },
          });
        }, 3000);
        video.showOSD();
      },
      error: function (error) {
        video.stopNext();
        video.next.shown = false;
        console.log(error);
      },
    });
  },

  isAutoSkipping: function () {
    return Boolean(video.autoSkipTimer && video.autoSkipActiveKey);
  },

  clearAutoSkip: function (resetAborted) {
    if (video.autoSkipTimer) {
      clearTimeout(video.autoSkipTimer);
      video.autoSkipTimer = null;
    }
    video.autoSkipActiveKey = null;
    if (resetAborted) {
      video.autoSkipAbortedKey = null;
    }
    var skipEl = document.getElementById("skip-intro");
    if (skipEl) {
      skipEl.classList.remove("auto-skipping");
    }
  },

  abortAutoSkip: function () {
    if (!video.isAutoSkipping()) return false;
    var abortedKey = video.autoSkipActiveKey;
    video.clearAutoSkip(false);
    video.autoSkipAbortedKey = abortedKey;
    var prefs =
      typeof settings !== "undefined" && typeof settings.getPlaybackPrefs === "function"
        ? settings.getPlaybackPrefs()
        : { showSkipButton: true };
    var skipEl = document.getElementById("skip-intro");
    if (skipEl) {
      skipEl.classList.add("auto-skip-aborted");
      setTimeout(function () {
        var el = document.getElementById("skip-intro");
        if (el) el.classList.remove("auto-skip-aborted");
      }, 900);
      if (prefs.showSkipButton === false) {
        $("#skip-intro").hide();
      }
    }
    return true;
  },

  setSkipIntro: function (id) {
    video.recap = null;
    video.intro = null;
    video.credits = null;
    video.activeSkip = null;
    video._lastAutoSkipAt = 0;
    video._lastAutoSkipType = null;
    video._skipCooldownUntil = 0;
    video.clearAutoSkip(true);
    $("#skip-intro").hide();
    service.intro({
      data: {
        id,
      },
      success: function (data) {
        if (data && data.recap && data.recap.end > data.recap.start) {
          video.recap = {
            start: data.recap.start,
            end: data.recap.end,
          };
        } else {
          video.recap = null;
        }

        if (data && data.intro && data.intro.end > data.intro.start) {
          video.intro = {
            start: data.intro.start,
            end: data.intro.end,
            state: false,
          };
        } else {
          video.intro = null;
        }

        if (data && data.credits && data.credits.end > data.credits.start) {
          video.credits = {
            start: data.credits.start,
            end: data.credits.end,
            state: false,
          };
          var countEl = document.getElementById("next-episode-count");
          if (countEl) {
            countEl.innerText = Math.max(
              5,
              Math.round(video.credits.end - video.credits.start)
            );
          }
        } else {
          video.credits = null;
        }
      },
      error: function (error) {
        console.log(error);
      },
    });
  },

  showSkip: function (time) {
    if (video._skipCooldownUntil && Date.now() < video._skipCooldownUntil) {
      return;
    }

    var prefs =
      typeof settings !== "undefined" && typeof settings.getPlaybackPrefs === "function"
        ? settings.getPlaybackPrefs()
        : {
            autoSkipIntro: false,
            autoSkipCredits: false,
            autoSkipRecap: false,
            autoPlayNext: true,
            showSkipButton: true,
          };

    var matched = null;
    if (
      video.recap &&
      time >= video.recap.start &&
      time < video.recap.end - 0.5
    ) {
      matched = {
        type: "recap",
        start: video.recap.start,
        end: video.recap.end,
        label: "Skip Recap",
      };
    } else if (
      video.intro &&
      time >= video.intro.start &&
      time < video.intro.end - 0.5
    ) {
      matched = {
        type: "intro",
        start: video.intro.start,
        end: video.intro.end,
        label: translate.go("video.skip") || "Skip Intro",
      };
    } else if (
      video.credits &&
      time >= video.credits.start &&
      time < video.credits.end - 0.5
    ) {
      matched = {
        type: "credits",
        start: video.credits.start,
        end: video.credits.end,
        label: "Skip Credits",
      };
    }

    if (matched) {
      var segKey =
        matched.type +
        ":" +
        Math.round(matched.start) +
        "-" +
        Math.round(matched.end);
      matched.key = segKey;

      var prevType = video.activeSkip && video.activeSkip.type;
      video.activeSkip = matched;
      if (video.intro) {
        video.intro.state = matched.type === "intro";
      }

      var skipEl = document.getElementById("skip-intro");
      var labelEl = document.getElementById("skip-intro-label");
      if (!labelEl || (skipEl && !skipEl.querySelector(".skip-fill"))) {
        $("#skip-intro").html(
          `<span class="skip-fill"></span><span class="skip-content"><i class="fa-solid fa-forward"></i><span id="skip-intro-label">${video.escapeHtml(matched.label)}</span></span>`
        );
        skipEl = document.getElementById("skip-intro");
        labelEl = document.getElementById("skip-intro-label");
      } else if (labelEl.textContent !== matched.label) {
        labelEl.textContent = matched.label;
      }

      var shouldAutoSkip =
        (matched.type === "recap" && prefs.autoSkipRecap) ||
        (matched.type === "intro" && prefs.autoSkipIntro) ||
        (matched.type === "credits" && prefs.autoSkipCredits);

      if (shouldAutoSkip && video.autoSkipAbortedKey !== segKey) {
        $("#skip-intro").show();
        if (
          video.autoSkipActiveKey !== segKey &&
          typeof player !== "undefined" &&
          player.state === player.states.PLAYING
        ) {
          video.clearAutoSkip(false);
          video.autoSkipActiveKey = segKey;
          if (skipEl) {
            skipEl.classList.remove("auto-skip-aborted");
            skipEl.classList.remove("auto-skipping");
            void skipEl.offsetWidth;
            skipEl.classList.add("auto-skipping");
          }
          video.autoSkipTimer = setTimeout(function () {
            video.autoSkipTimer = null;
            if (
              main.state === video.id &&
              typeof player !== "undefined" &&
              player.state === player.states.PLAYING &&
              video.autoSkipActiveKey === segKey &&
              video.autoSkipAbortedKey !== segKey &&
              video.activeSkip &&
              video.activeSkip.key === segKey
            ) {
              video.clearAutoSkip(false);
              video.autoSkipAbortedKey = segKey;
              video.skipCurrentSegment();
            }
          }, video.autoSkipDuration || 3200);
        }
        return;
      }

      if (prefs.showSkipButton === false) {
        $("#skip-intro").hide();
      } else if (prevType !== matched.type || $("#skip-intro").css("display") === "none") {
        $("#skip-intro").show();
      }
    } else {
      if (video.isAutoSkipping()) {
        video.clearAutoSkip(false);
      }
      if (video.activeSkip || (video.intro && video.intro.state)) {
        video.activeSkip = null;
        if (video.intro) {
          video.intro.state = false;
        }
        $("#skip-intro").hide();
      }
    }
  },

  skipCurrentSegment: function () {
    var seg =
      video.activeSkip ||
      (video.intro && video.intro.state
        ? {
            type: "intro",
            start: video.intro.start,
            end: video.intro.end,
            key:
              "intro:" +
              Math.round(video.intro.start) +
              "-" +
              Math.round(video.intro.end),
          }
        : null);
    if (!seg) return;
    var segKey =
      seg.key ||
      seg.type + ":" + Math.round(seg.start || 0) + "-" + Math.round(seg.end || 0);
    video.clearAutoSkip(false);
    video.autoSkipAbortedKey = segKey;
    video._skipCooldownUntil = Date.now() + 1200;

    var targetEnd = seg.end;
    var dur = player.getDuration();
    var prefs =
      typeof settings !== "undefined" && typeof settings.getPlaybackPrefs === "function"
        ? settings.getPlaybackPrefs()
        : { autoPlayNext: true };
    video.activeSkip = null;
    if (video.intro) {
      video.intro.state = false;
    }
    $("#skip-intro").hide();

    if (seg.type === "credits" && dur > 0 && targetEnd >= dur - 12) {
      if (prefs.autoPlayNext !== false) {
        clearInterval(video.timers.next);
        if (video.next && video.next.episode) {
          video.playNext();
        } else {
          video.nextEpisode(true);
        }
        return;
      }
    }
    player.forwardTo(targetEnd);
  },

  setAudios: function () {
    $("#audios li").remove();
    var audios = "";
    (video.audios || []).forEach((element, index) => {
      var label =
        (session.languages &&
          session.languages.audios &&
          session.languages.audios[element.name]) ||
        element.name;
      audios += `<li class="option${
        element.name === video.audio ? " active selected" : ""
      }">${video.escapeHtml(label)}</li>`;
    });

    var audiosEl = document.getElementById("audios");
    if (audiosEl) audiosEl.innerHTML = audios;
  },

  changeAudio: function (index) {
    if (!video.audios || !video.audios[index]) return;
    var nextEpisodeId = video.audios[index].id;
    video.currentItem = Object.assign({}, video.currentItem || {}, {
      id: nextEpisodeId,
      playhead: player.getPlayed() / 60,
      duration: player.getDuration(),
    });
    if (video.episodesDrawer) {
      video.episodesDrawer.list = [];
      video.episodesDrawer.seasonId = null;
    }
    video.play(video.currentItem, false);
    video.setSubtitles();
  },

  setSubtitles: function () {
    $("#subtitles").html("");
    var subtitles = "";
    (video.subtitles || []).forEach((element) => {
      var label =
        (session.languages &&
          session.languages.subtitles &&
          session.languages.subtitles[element.name]) ||
        element.name;
      subtitles += `<li class="option${
        element.name === video.subtitle ? " active" : ""
      }">${video.escapeHtml(label)}</li>`;
    });

    var subtitlesEl = document.getElementById("subtitles");
    if (subtitlesEl) subtitlesEl.innerHTML = subtitles;
  },

  changeSubtitle: function (index) {
    if (!video.subtitles || !video.subtitles[index]) return;
    video.currentItem = Object.assign({}, video.currentItem || {}, {
      id: video.episode,
      playhead: player.getPlayed() / 60,
      duration: player.getDuration(),
    });
    video.play(video.currentItem, false, video.subtitles[index].name);
  },

  stopNext: function () {
    clearInterval(video.timers.next);
    video.next.status = false;
    video.next.episode = null;
    $(".next-episode").hide();
    $("#video-screen").removeClass("next-ep-visible");
  },

  playNext: function () {
    if (!video.next.episode) return;
    video.saveHistory(Math.floor(player.getDuration()));
    video.currentItem = Object.assign(
      {},
      video.currentItem || {},
      video.next.episode
    );
    video.play(video.next.episode);
    $(".osd #title").text(video.next.episode.serie);
    $(".osd #subtitle").text(
      `${video.next.episode.season_number}x${video.next.episode.episode_number} - ${video.next.episode.episode}`
    );
  },

  nextEpisode: function (instant, fromEnded) {
    video.next.shown = true;
    try {
      service.continue({
        data: {
          ids: video.episode,
        },
        success: function (data) {
          var nextEp = mapper.continue(data);
          if (!nextEp || nextEp.id === video.episode) {
            video.next.episode = null;
            video.next.status = false;
            $("#video-screen").removeClass("next-ep-visible");
            if (fromEnded) {
              video.destroy();
            }
            return;
          }
          video.next.episode = nextEp;

          if (instant) {
            video.playNext();
          } else {
            var nextImgEl = document.getElementById("next-episode-image");
            if (nextImgEl) {
              nextImgEl.setAttribute("src", video.next.episode.background || "");
            }
            var countEl = document.getElementById("next-episode-count");
            if (countEl && (!countEl.innerText || isNaN(+countEl.innerText) || +countEl.innerText <= 0)) {
              countEl.innerText = "20";
            }
            $(".next-episode").show();
            $("#video-screen").addClass("next-ep-visible");
            video.next.status = true;
            clearInterval(video.timers.next);
            video.timers.next = setInterval(() => {
              var cEl = document.getElementById("next-episode-count");
              if (!cEl) {
                clearInterval(video.timers.next);
                return;
              }
              var value = parseInt(cEl.innerText, 10) || 1;
              if (value <= 1) {
                clearInterval(video.timers.next);
              } else {
                cEl.innerText = String(value - 1);
              }
            }, 1000);
          }
        },
        error: function (error) {
          console.log(error);
          if (fromEnded) {
            video.destroy();
          }
        },
      });
    } catch (error) {
      console.log(error);
      if (fromEnded) {
        video.destroy();
      }
    }
  },

  playbackSpeed: function () {
    if (!video.speed.state) {
      var speedsOptions = `
        <ul id="speed-menu">
          ${video.speed.options
            .map(
              (e) =>
                `<li class="${e === video.speed.active ? "active" : ""}">${e}x</li>`
            )
            .join("")}
        </ul>
      `;

      video.speed.state = true;
      video.showOSD(true);
      $("#setting-options").hide();
      $(".player-settings").append(speedsOptions);

      video.setSpeed(0);
      return true;
    }
    video.hidePlaySpeed();
    video.showOSD();
    return false;
  },

  hidePlaySpeed: function () {
    $("#speed-menu").remove();
    $("#setting-options").show();
    video.speed.state = false;
  },

  setSpeed: function (increment) {
    var index = video.speed.options.indexOf(video.speed.active);
    if (index < 0) index = 3;
    var newIndex = index + increment;
    if (newIndex >= 0 && newIndex < video.speed.options.length) {
      video.speed.active = video.speed.options[newIndex];
      player.speed(video.speed.options[newIndex]);
      var items = $("#speed-menu li");
      if (items.length) {
        items.removeClass("active");
        items.eq(newIndex).addClass("active");
      }
      var speedIcon = document.querySelector("#setting-options i.playback-speed");
      if (speedIcon) {
        var speedLabel =
          video.speed.active === 1
            ? "Playback Speed ([ / ])"
            : "Playback Speed (" + video.speed.active + "x)";
        speedIcon.setAttribute("data-tooltip", speedLabel);
        speedIcon.setAttribute("title", speedLabel);
        speedIcon.setAttribute(
          "data-speed-badge",
          video.speed.active !== 1 ? video.speed.active + "x" : ""
        );
      }
    }
  },

  showOSD: function (noHide) {
    clearTimeout(video.timers.osd.object);
    window.lastUserActivityAt = Date.now();
    document.body.classList.remove("hide-cursor");
    var osds = document.querySelectorAll("#osd, #video-screen .osd");
    var wasHidden = false;
    for (var i = 0; i < osds.length; i++) {
      if (osds[i].style.opacity == 0) {
        wasHidden = true;
      }
      osds[i].style.opacity = "1";
      osds[i].style.pointerEvents = "auto";
    }
    if (wasHidden && player.video) {
      try {
        video.setPlayingTime();
      } catch (e) {}
    }
    var isCompact = document.body.classList.contains("compact-window");
    var baseDuration = isCompact ? 1400 : video.timers.osd.duration || 2000;
    var timeoutMs = noHide ? 4000 : baseDuration;
    if (typeof window.syncUserActivityTimer === "function") {
      window.syncUserActivityTimer(timeoutMs);
    }
    video.timers.osd.object = setTimeout(() => {
      if (
        document.body.classList.contains("scrubbing-progress") ||
        document.body.classList.contains("scrubbing-volume")
      ) {
        video.showOSD(noHide);
        return;
      }
      if (video.speed && video.speed.state) {
        video.hidePlaySpeed();
      }
      video.hideOSD();
    }, timeoutMs);
  },

  hideOSD: function () {
    clearTimeout(video.timers.osd.object);
    video.timers.osd.object = null;
    video.option = false;
    $("#setting-options").children().removeClass("selected");
    if (video.speed && video.speed.state) {
      video.hidePlaySpeed();
    }
    var osds = document.querySelectorAll("#osd, #video-screen .osd");
    for (var i = 0; i < osds.length; i++) {
      osds[i].style.opacity = "0";
      osds[i].style.pointerEvents = "none";
    }
    var dockEl = document.getElementById("top-center-dock");
    if (dockEl) {
      dockEl.classList.remove("expanded");
    }
    var videoScreenActive =
      Boolean(document.getElementById(video.id)) ||
      (typeof main !== "undefined" && main.state === video.id);
    var drawerOpen = Boolean(
      video.settings.open ||
        (video.episodesDrawer && video.episodesDrawer.open) ||
        (typeof menu !== "undefined" && menu.isOpen) ||
        (typeof exit !== "undefined" && Boolean(document.getElementById(exit.id)))
    );
    if (videoScreenActive && !drawerOpen) {
      document.body.classList.add("hide-cursor");
      document.body.classList.remove("show-floating-toolbar");
    }
  },

  showBTN: function (state, data) {
    var button = document.getElementById("osd-icon");
    if (button) {
      button.style.opacity = 1;
      button.className = `icon-status ${state}`;
    }
  },

  hideBTN: function () {
    var button = document.getElementById("osd-icon");
    if (button) {
      button.style.opacity = 0;
      button.className = "icon-status";
    }
  },

  startHistory: function () {
    clearInterval(video.timers.history.object);
    video.timers.history.object = setInterval(() => {
      video.saveHistory();
    }, video.timers.history.duration);
  },

  saveHistory: function (time) {
    service.setHistory({
      data: {
        content_id: video.episode,
        playhead: time || Math.floor(player.getPlayed()),
      },
      success: function () {},
      error: function (error) {
        console.log(error);
      },
    });
  },

  setPlayingTime: function () {
    var time = player.getPlayed() + player.values.forward_rewind;
    time = time < 0 ? 0 : time;
    var totalTime = player.getDuration();
    if (!totalTime || isNaN(totalTime)) return;
    var timePercent = (100 * time) / totalTime;

    if (video.recap || video.intro || video.credits || video.activeSkip) {
      video.showSkip(time);
    }

    var prefs =
      typeof settings !== "undefined" && typeof settings.getPlaybackPrefs === "function"
        ? settings.getPlaybackPrefs()
        : { autoPlayNext: true };

    var inNextEpWindow =
      (video.credits && time >= video.credits.start) ||
      (!video.credits && totalTime > 120 && time >= totalTime - 30);

    if (
      prefs.autoPlayNext !== false &&
      !video.next.shown &&
      player.state === player.states.PLAYING &&
      inNextEpWindow
    ) {
      if (!video.credits) {
        var countEl = document.getElementById("next-episode-count");
        if (countEl) {
          countEl.innerText = String(Math.max(5, Math.round(totalTime - time)));
        }
      }
      video.nextEpisode();
    } else if (video.next.status && !inNextEpWindow) {
      video.stopNext();
      video.next.shown = false;
    }

    var osd = document.getElementById("osd");
    var isScrubbing =
      document.body.classList.contains("scrubbing-progress") ||
      document.body.classList.contains("scrubbing-volume");
    var drawerOpen = Boolean(
      video.settings.open ||
        (video.episodesDrawer && video.episodesDrawer.open) ||
        (typeof menu !== "undefined" && menu.isOpen) ||
        (typeof exit !== "undefined" && Boolean(document.getElementById(exit.id)))
    );
    if (
      !drawerOpen &&
      !isScrubbing &&
      player.values.forward_rewind === 0 &&
      ((osd && osd.style.opacity !== "0" && osd.style.opacity !== "") ||
        !document.body.classList.contains("hide-cursor") ||
        document.body.classList.contains("show-floating-toolbar"))
    ) {
      var maxIdleMs = video.speed && video.speed.state ? 4200 : 2200;
      var lastAct = window.lastUserActivityAt || 0;
      if (lastAct > 0 && Date.now() - lastAct > maxIdleMs) {
        video.hideOSD();
        return;
      }
    }
    if (osd && osd.style.opacity == 0 && player.values.forward_rewind === 0) {
      return;
    }

    var totalSeconds = Math.floor(totalTime % 60);
    var totalMinutes = Math.floor((totalTime % 3600) / 60);
    var totalHours = Math.floor(totalTime / 3600);
    totalHours = totalHours < 10 ? "0" + totalHours : totalHours;
    totalMinutes = totalMinutes < 10 ? "0" + totalMinutes : totalMinutes;
    totalSeconds = totalSeconds < 10 ? "0" + totalSeconds : totalSeconds;

    var timeSeconds = Math.floor(time % 60);
    var timeMinutes = Math.floor((time % 3600) / 60);
    var timeHours = Math.floor(time / 3600);
    timeHours = timeHours < 10 ? "0" + timeHours : timeHours;
    timeMinutes = timeMinutes < 10 ? "0" + timeMinutes : timeMinutes;
    timeSeconds = timeSeconds < 10 ? "0" + timeSeconds : timeSeconds;

    var timeStr = `${timeHours ? timeHours : "00"}:${
      timeMinutes ? timeMinutes : "00"
    }:${timeSeconds ? timeSeconds : "00"}`;
    var totalStr = `${totalHours ? totalHours : "00"}:${
      totalMinutes ? totalMinutes : "00"
    }:${totalSeconds ? totalSeconds : "00"}`;

    var timeEl = document.getElementById("time");
    if (timeEl && timeEl.innerText !== timeStr) {
      timeEl.innerText = timeStr;
    }
    var totalEl = document.getElementById("total");
    if (totalEl && totalEl.innerText !== totalStr) {
      totalEl.innerText = totalStr;
    }
    var playedEl = document.getElementById("played");
    if (playedEl) {
      playedEl.style.width = timePercent + "%";
    }
  },
};
