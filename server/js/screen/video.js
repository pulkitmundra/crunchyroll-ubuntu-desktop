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
  quality: {
    options: [
      { key: "auto", label: "Auto" },
      { key: "1080", label: "1080p" },
      { key: "720", label: "720p" },
      { key: "480", label: "480p" },
      { key: "360", label: "360p" },
      { key: "240", label: "240p" },
    ],
    state: false,
  },
  sleep: {
    options: [
      { key: "off", label: "Off", episodes: 0, minutes: 0 },
      { key: "1ep", label: "This Ep", episodes: 1, minutes: 0 },
      { key: "2ep", label: "2 Eps", episodes: 2, minutes: 0 },
      { key: "3ep", label: "3 Eps", episodes: 3, minutes: 0 },
      { key: "30m", label: "30m", episodes: 0, minutes: 30 },
      { key: "60m", label: "60m", episodes: 0, minutes: 60 },
    ],
    active: "off",
    episodesLeft: 0,
    endsAt: 0,
    timerId: null,
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
      icon: "fa-solid fa-backward-step",
      action: "prevEpisode",
      param: true,
      label: "Previous Episode (P)",
    },
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
      icon: "fa-solid fa-sliders video-quality",
      action: "videoQuality",
      param: true,
      label: "Video Quality (Q)",
    },
    {
      icon: "fa-solid fa-gauge-high playback-speed",
      action: "playbackSpeed",
      param: true,
      label: "Playback Speed ([ / ])",
    },
    {
      icon: "fa-solid fa-moon sleep-timer",
      action: "sleepTimer",
      param: true,
      label: "Sleep Timer / Auto-Pause (T)",
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
    {
      icon: "fa-solid fa-camera",
      action: "captureFrame",
      label: "Capture Frame (Ctrl+Shift+S)",
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
    seasons: [],
    seasonIndex: -1,
    seriesId: null,
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

  captureFrame: function () {
    if (
      !window.electronUtilsRender ||
      typeof window.electronUtilsRender.captureScreenshot !== "function"
    ) {
      if (typeof window.showToast === "function") {
        window.showToast("Screenshot capture is unavailable", "error");
      }
      return false;
    }
    var item = video.currentItem || {};
    var serieName = item.serie || item.title || "Crunchyroll";
    var epCode =
      item.season_number !== undefined && item.episode_number !== undefined
        ? "S" + item.season_number + "E" + item.episode_number
        : item.episode_number !== undefined
        ? "E" + item.episode_number
        : "";
    var label = (serieName + (epCode ? "_" + epCode : "")).trim();

    document.body.classList.add("capturing-screenshot");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        window.electronUtilsRender
          .captureScreenshot({ label: label })
          .then(function (res) {
            document.body.classList.remove("capturing-screenshot");
            if (res && res.ok) {
              if (typeof window.showToast === "function") {
                window.showToast(
                  "Saved frame to " +
                    (res.displayPath || "~/Pictures/Crunchyroll") +
                    " (& copied to clipboard)",
                  "added"
                );
              }
            } else if (typeof window.showToast === "function") {
              window.showToast("Unable to capture video frame", "error");
            }
          })
          .catch(function () {
            document.body.classList.remove("capturing-screenshot");
            if (typeof window.showToast === "function") {
              window.showToast("Unable to capture video frame", "error");
            }
          });
      });
    });
    return false;
  },

  updateMediaSession: function () {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }
    try {
      var item = video.currentItem || {};
      var epTitle =
        item.episode ||
        item.title ||
        (item.episode_number ? "Episode " + item.episode_number : "Playing");
      var serieTitle = item.serie || item.title || "Crunchyroll";
      var seasonAlbum =
        item.season_number !== undefined
          ? "Season " +
            item.season_number +
            (item.episode_number !== undefined
              ? " - Ep " + item.episode_number
              : "")
          : "Crunchyroll";
      var artwork = [];
      if (item.background) {
        artwork.push({
          src: item.background,
          sizes: "512x512",
          type: "image/jpeg",
        });
      }
      if (typeof MediaMetadata !== "undefined") {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: epTitle,
          artist: serieTitle,
          album: seasonAlbum,
          artwork: artwork,
        });
      }
      var safeSetHandler = function (action, fn) {
        try {
          navigator.mediaSession.setActionHandler(action, fn);
        } catch (e) {}
      };
      safeSetHandler("play", function () {
        if (typeof player !== "undefined") player.resume();
      });
      safeSetHandler("pause", function () {
        if (typeof player !== "undefined") player.pause();
      });
      safeSetHandler("seekbackward", function (details) {
        var offset = (details && details.seekOffset) || 10;
        if (typeof player !== "undefined") {
          player.seekBy(-offset, video.setPlayingTime);
        }
      });
      safeSetHandler("seekforward", function (details) {
        var offset = (details && details.seekOffset) || 10;
        if (typeof player !== "undefined") {
          player.seekBy(offset, video.setPlayingTime);
        }
      });
      safeSetHandler("seekto", function (details) {
        if (
          details &&
          typeof details.seekTime === "number" &&
          typeof player !== "undefined"
        ) {
          player.forwardTo(details.seekTime);
          video.setPlayingTime();
        }
      });
      safeSetHandler("nexttrack", function () {
        video.nextEpisode(true);
      });
      safeSetHandler("previoustrack", function () {
        if (typeof player !== "undefined" && player.getPlayed() > 15) {
          player.forwardTo(0);
          video.setPlayingTime();
        } else {
          video.prevEpisode(true);
        }
      });
      video.syncMediaSessionPosition();
    } catch (e) {}
  },

  syncMediaSessionPosition: function () {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }
    try {
      if (
        typeof player !== "undefined" &&
        player.video &&
        typeof navigator.mediaSession.setPositionState === "function"
      ) {
        var dur = player.getDuration();
        var pos = player.getPlayed();
        var rate =
          (player.video && player.video.playbackRate) ||
          (video.speed && video.speed.active) ||
          1;
        if (dur && isFinite(dur) && dur > 0) {
          navigator.mediaSession.setPositionState({
            duration: dur,
            playbackRate: rate > 0 ? rate : 1,
            position: Math.max(0, Math.min(dur, pos || 0)),
          });
        }
      }
      if (typeof player !== "undefined") {
        navigator.mediaSession.playbackState =
          player.state === player.states.PLAYING ? "playing" : "paused";
      }
    } catch (e) {}
  },

  clearMediaSession: function () {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }
    var actions = [
      "play",
      "pause",
      "seekbackward",
      "seekforward",
      "seekto",
      "nexttrack",
      "previoustrack",
    ];
    for (var i = 0; i < actions.length; i++) {
      try {
        navigator.mediaSession.setActionHandler(actions[i], null);
      } catch (e) {}
    }
    try {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
    } catch (e) {}
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
    video.settings.open = true;
    video.hideOSD();
    player.pause();
    $("#osd-icon").hide();
    $(".player-settings").hide();
    document.body.classList.remove("hide-cursor");
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

  updateDrawerSeasonNav: function () {
    var seasons = (video.episodesDrawer && video.episodesDrawer.seasons) || [];
    var idx =
      video.episodesDrawer && typeof video.episodesDrawer.seasonIndex === "number"
        ? video.episodesDrawer.seasonIndex
        : -1;
    var prevBtn = document.getElementById("player-season-prev");
    var nextBtn = document.getElementById("player-season-next");
    var seasonEl = document.getElementById("player-episodes-season");
    if (idx >= 0 && seasons[idx] && seasonEl) {
      var s = seasons[idx];
      var sText = "Season " + (s.number !== undefined ? s.number : idx + 1);
      if (
        s.title &&
        s.title.toLowerCase().indexOf("season " + s.number) === -1 &&
        s.title !== (video.currentItem && video.currentItem.serie)
      ) {
        sText += " - " + s.title;
      }
      seasonEl.textContent = sText;
    }
    if (prevBtn) {
      prevBtn.disabled = !(seasons.length > 1 && idx > 0);
    }
    if (nextBtn) {
      nextBtn.disabled = !(seasons.length > 1 && idx >= 0 && idx < seasons.length - 1);
    }
  },

  ensureDrawerSeasons: function () {
    var item = video.currentItem || {};
    if (
      video.episodesDrawer.seasons &&
      video.episodesDrawer.seasons.length > 0
    ) {
      if (video.episodesDrawer.seasonIndex < 0) {
        var foundIdx = video.episodesDrawer.seasons.findIndex(function (s) {
          return (
            (video.episodesDrawer.seasonId &&
              s.id === video.episodesDrawer.seasonId) ||
            (item.season_id && s.id === item.season_id) ||
            (item.season_number !== undefined &&
              String(s.number) === String(item.season_number))
          );
        });
        video.episodesDrawer.seasonIndex = foundIdx >= 0 ? foundIdx : 0;
      }
      video.updateDrawerSeasonNav();
      return;
    }

    if (
      typeof home_episodes !== "undefined" &&
      home_episodes.data &&
      Array.isArray(home_episodes.data.seasons) &&
      home_episodes.data.seasons.length > 0
    ) {
      var matchHomeSeason = home_episodes.data.seasons.findIndex(function (s) {
        return (
          (item.season_id && s.id === item.season_id) ||
          (item.season_number !== undefined &&
            String(s.number) === String(item.season_number))
        );
      });
      if (matchHomeSeason >= 0) {
        video.episodesDrawer.seasons = home_episodes.data.seasons.slice();
        video.episodesDrawer.seasonIndex = matchHomeSeason;
        video.updateDrawerSeasonNav();
        return;
      }
    }

    var fetchForSeries = function (seriesId) {
      if (!seriesId) return;
      video.episodesDrawer.seriesId = seriesId;
      service.seasons({
        data: { id: seriesId },
        success: function (sResp) {
          var seasons =
            (typeof mapper !== "undefined" && mapper.seasons(sResp)) || [];
          if (!seasons.length) return;
          video.episodesDrawer.seasons = seasons;
          var sIdx = seasons.findIndex(function (s) {
            return (
              (video.episodesDrawer.seasonId &&
                s.id === video.episodesDrawer.seasonId) ||
              (item.season_id && s.id === item.season_id) ||
              (item.season_number !== undefined &&
                String(s.number) === String(item.season_number))
            );
          });
          video.episodesDrawer.seasonIndex = sIdx >= 0 ? sIdx : 0;
          video.updateDrawerSeasonNav();
        },
        error: function () {},
      });
    };

    var fallbackSeriesId =
      item.series_id ||
      video.episodesDrawer.seriesId ||
      (typeof home_details !== "undefined" &&
        home_details.data &&
        home_details.data.this &&
        home_details.data.this.id) ||
      null;

    if (fallbackSeriesId) {
      fetchForSeries(fallbackSeriesId);
    } else if (video.episode) {
      service.seriesInfo({
        data: { id: video.episode },
        success: function (resp) {
          var doc = resp && resp.data && resp.data[0];
          var meta = (doc && doc.episode_metadata) || {};
          if (meta.series_id) {
            if (video.currentItem) {
              video.currentItem.series_id = meta.series_id;
            }
            fetchForSeries(meta.series_id);
          }
        },
        error: function () {},
      });
    }
  },

  switchDrawerSeason: function (delta) {
    var seasons = (video.episodesDrawer && video.episodesDrawer.seasons) || [];
    if (seasons.length <= 1) return;
    var curIdx =
      typeof video.episodesDrawer.seasonIndex === "number" &&
      video.episodesDrawer.seasonIndex >= 0
        ? video.episodesDrawer.seasonIndex
        : 0;
    var nextIdx = curIdx + delta;
    if (nextIdx < 0 || nextIdx >= seasons.length) return;
    var targetSeason = seasons[nextIdx];
    if (!targetSeason || !targetSeason.id) return;

    video.episodesDrawer.seasonIndex = nextIdx;
    video.episodesDrawer.seasonId = targetSeason.id;
    video.updateDrawerSeasonNav();

    var listEl = document.getElementById("player-episodes-list");
    if (listEl) {
      listEl.innerHTML =
        '<li class="player-ep-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading Season ' +
        video.escapeHtml(targetSeason.number || nextIdx + 1) +
        "...</li>";
    }

    service.episodes({
      data: { id: targetSeason.id },
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
  },

  openEpisodes: function () {
    if (video.isAutoSkipping()) {
      video.abortAutoSkip();
    }
    if (video.settings.open) {
      video.settings.open = false;
      $(".settings-slide").removeClass("open");
    }
    video.episodesDrawer.open = true;
    video.hideOSD();
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
    var hasCurrentEpInDrawer = Boolean(
      video.episodesDrawer.list &&
        video.episodesDrawer.list.length > 0 &&
        video.episodesDrawer.list.some(video.isEpisodeMatch)
    );
    if (!hasCurrentEpInDrawer) {
      video.episodesDrawer.seasonId = item.season_id || null;
      video.episodesDrawer.seasonIndex = -1;
    }
    video.ensureDrawerSeasons();

    if (hasCurrentEpInDrawer) {
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
      if (
        video.episodesDrawer.seasons &&
        video.episodesDrawer.seasons.length > 0
      ) {
        var matchedIdx = video.episodesDrawer.seasons.findIndex(function (s) {
          return s.id === seasonId;
        });
        if (matchedIdx >= 0) {
          video.episodesDrawer.seasonIndex = matchedIdx;
        }
      }
      video.updateDrawerSeasonNav();
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
      video.episodesDrawer.seriesId = seriesId;
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
          video.episodesDrawer.seasons = seasons;
          var targetIdx = seasons.findIndex(function (s) {
            return (
              item.season_number &&
              String(s.number) === String(item.season_number)
            );
          });
          if (targetIdx < 0) targetIdx = 0;
          video.episodesDrawer.seasonIndex = targetIdx;
          var targetSeason = seasons[targetIdx];
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
          video.ensureDrawerSeasons();
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

  syncCurrentPlayheadToLists: function (playedMin) {
    var mins =
      typeof playedMin === "number" && !isNaN(playedMin)
        ? Math.max(0, playedMin)
        : typeof player !== "undefined"
        ? Math.max(0, player.getPlayed() / 60)
        : 0;
    if (video.episodesDrawer && Array.isArray(video.episodesDrawer.list)) {
      for (var d = 0; d < video.episodesDrawer.list.length; d++) {
        if (video.isEpisodeMatch(video.episodesDrawer.list[d])) {
          video.episodesDrawer.list[d].playhead = mins;
        }
      }
    }
    if (
      typeof home_episodes !== "undefined" &&
      home_episodes.data &&
      Array.isArray(home_episodes.data.episodes)
    ) {
      for (var k = 0; k < home_episodes.data.episodes.length; k++) {
        if (video.isEpisodeMatch(home_episodes.data.episodes[k])) {
          home_episodes.data.episodes[k].playhead = mins;
          if (typeof home_episodes.refreshEpisodeCard === "function") {
            home_episodes.refreshEpisodeCard(k);
          }
        }
      }
    }
  },

  syncHomeEpisodesSlide: function () {
    if (
      typeof home_episodes !== "undefined" &&
      home_episodes.data &&
      Array.isArray(home_episodes.data.episodes) &&
      $(".episodes .episodes-list")[0] &&
      $(".episodes .episodes-list")[0].slick
    ) {
      var homeEpIdx = home_episodes.data.episodes.findIndex(function (he) {
        return video.isEpisodeMatch(he);
      });
      if (homeEpIdx >= 0) {
        $(".episodes .episodes-list")[0].slick.currentSlide = homeEpIdx;
      }
    }
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
    video.syncCurrentPlayheadToLists(player.getPlayed() / 60);
    video.saveHistory();
    video.currentItem = Object.assign({}, video.currentItem || {}, ep);
    video.play(video.currentItem);
    video.syncHomeEpisodesSlide();
    $(".osd #title").text(video.currentItem.serie || video.currentItem.title || "");
    var epSub =
      video.currentItem.season_number !== undefined &&
      video.currentItem.episode_number !== undefined
        ? `${video.currentItem.season_number}x${video.currentItem.episode_number} - ${
            video.currentItem.episode || video.currentItem.title || ""
          }`
        : video.currentItem.episode || video.currentItem.title || "";
    $(".osd #subtitle").text(epSub);
  },

  getSettings: function () {
    return video.options
      .map(
        (element) =>
          `<i class="${element.icon}" data-tooltip="${element.label || ""}"><span class="setting-badge"></span></i>`
      )
      .join("");
  },

  syncVolumeUI: function () {
    var v = typeof player !== "undefined" && player.video ? player.video : document.getElementById("videoplayer");
    if (!v) return;
    var muted = Boolean(v.muted || v.volume === 0);
    var pct = muted ? 0 : Math.round((typeof v.volume === "number" ? v.volume : 1) * 100);
    var wrapEl = document.getElementById("osd-volume");
    var iconEl = document.getElementById("icon-volume-mute") || document.getElementById("btn-volume-mute");
    var badgeEl = document.getElementById("volume-badge");
    var fillEl = document.getElementById("volume-fill");
    var lblEl = document.getElementById("volume-label");
    if (wrapEl) {
      wrapEl.classList.toggle("muted-active", muted || pct === 0);
    }
    if (iconEl) {
      if (muted || pct === 0) {
        iconEl.className = "fa-solid fa-volume-xmark muted";
      } else if (pct < 50) {
        iconEl.className = "fa-solid fa-volume-low";
      } else {
        iconEl.className = "fa-solid fa-volume-high";
      }
    }
    if (badgeEl) {
      badgeEl.textContent = muted || pct === 0 ? "Mute" : pct < 100 ? pct + "%" : "";
    }
    if (fillEl) {
      fillEl.style.height = pct + "%";
    }
    if (lblEl) {
      lblEl.textContent = muted ? "Muted" : pct + "%";
    }
  },

  syncOpacityUI: function () {
    var op =
      typeof window.getAppOpacity === "function"
        ? window.getAppOpacity()
        : 1;
    var pct = Math.max(20, Math.min(100, Math.round(op * 100)));
    var fillPct = Math.max(0, Math.min(100, Math.round(((op - 0.2) / 0.8) * 100)));
    var wrapEl = document.getElementById("osd-opacity");
    var iconEl = document.getElementById("icon-opacity-toggle") || document.getElementById("btn-opacity-toggle");
    var badgeEl = document.getElementById("opacity-badge");
    var fillEl = document.getElementById("opacity-fill");
    var lblEl = document.getElementById("opacity-label");
    var isTranslucent = pct < 100;
    if (wrapEl) {
      wrapEl.classList.toggle("translucent-active", isTranslucent);
    }
    if (iconEl) {
      iconEl.className = isTranslucent
        ? "fa-solid fa-droplet translucent"
        : "fa-solid fa-droplet";
    }
    if (badgeEl) {
      badgeEl.textContent = isTranslucent ? pct + "%" : "";
    }
    if (fillEl) {
      fillEl.style.height = fillPct + "%";
    }
    if (lblEl) {
      lblEl.textContent = pct + "%";
    }
  },

  init: function (item) {
    clearTimeout(video.timers.osd.object);
    clearInterval(video.timers.next);
    clearInterval(video.timers.history.object);
    video.clearAutoSkip(true);
    video.clearSleepCountdown(true);
    $("[id='video-screen']").remove();
    video.settings.open = false;
    video.episodesDrawer.open = false;
    video.episodesDrawer.list = [];
    video.episodesDrawer.seasonId = null;
    video.episodesDrawer.seasons = [];
    video.episodesDrawer.seasonIndex = -1;
    video.episodesDrawer.seriesId = null;
    video.speed.state = false;
    video.quality.state = false;
    video.sleep.state = false;
    video._chaptersDirty = true;
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
            <div id="chapter-markers"></div>
            <div id="seek-hover"></div>
            <div id="played">
              <div class="preview">
                <img id="preview">
              </div>
            </div>
            <div id="seek-tooltip">00:00</div>
          </div>
          <div id="total">00:00:00</div>
          <div id="osd-volume" class="osd-popup-control">
            <div class="osd-standing-popover" id="volume-popover">
              <span class="osd-standing-label" id="volume-label">100%</span>
              <div class="osd-standing-track" id="volume-bar">
                <div class="osd-standing-fill" id="volume-fill"></div>
              </div>
            </div>
            <button type="button" id="btn-volume-mute" class="osd-round-btn" title="Volume / Mute (M)">
              <i id="icon-volume-mute" class="fa-solid fa-volume-high"></i>
              <span class="setting-badge" id="volume-badge"></span>
            </button>
          </div>
          <div id="osd-opacity" class="osd-popup-control">
            <div class="osd-standing-popover" id="opacity-popover">
              <span class="osd-standing-label" id="opacity-label">100%</span>
              <div class="osd-standing-track" id="opacity-bar">
                <div class="osd-standing-fill" id="opacity-fill"></div>
              </div>
            </div>
            <button type="button" id="btn-opacity-toggle" class="osd-round-btn" title="Player Translucency">
              <i id="icon-opacity-toggle" class="fa-solid fa-droplet"></i>
              <span class="setting-badge" id="opacity-badge"></span>
            </button>
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
            <div class="episodes-slide-season-row">
              <button type="button" id="player-season-prev" class="player-season-nav-btn" title="Previous Season" disabled>
                <i class="fa-solid fa-chevron-left"></i>
              </button>
              <div class="episodes-slide-season" id="player-episodes-season">Season ${safeSeasonDrawer}</div>
              <button type="button" id="player-season-next" class="player-season-nav-btn" title="Next Season" disabled>
                <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
          <button type="button" id="player-episodes-close" title="Close (Esc / E)">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <ul id="player-episodes-list"></ul>
      </div>
    </div>`;
    document.body.appendChild(video_element);
    document.body.classList.add("player-active");
    if (typeof window.syncPlayerOpacityContext === "function") {
      window.syncPlayerOpacityContext(true);
    }
    if (typeof player !== "undefined" && typeof player.applySubtitlePrefs === "function") {
      player.applySubtitlePrefs();
    }
    video.syncVolumeUI();
    video.syncOpacityUI();
    video.syncQualityUI();
    video.syncSleepUI();

    $(`#${home.id}`).hide();
    if (main.state !== video.id) {
      video.previous = main.state;
    }
    main.state = video.id;
  },

  destroy: function () {
    video._playReqId = (video._playReqId || 0) + 1;
    document.body.classList.remove(
      "player-active",
      "scrubbing-progress",
      "scrubbing-volume",
      "scrubbing-opacity",
      "capturing-screenshot"
    );
    if (typeof window.syncPlayerOpacityContext === "function") {
      window.syncPlayerOpacityContext(false);
    }
    video.clearAutoSkip(true);
    video.clearSleepCountdown(true);
    video.clearMediaSession();
    video.hideOSD();
    document.body.classList.remove("hide-cursor");
    if (video.episode && typeof player !== "undefined" && player.getPlayed() > 0) {
      var playedSec = player.getPlayed();
      var durSec = player.getDuration() || 0;
      var isNearEnd = durSec > 0 && playedSec >= durSec - 2;
      video.syncCurrentPlayheadToLists(
        isNearEnd ? Math.round(durSec / 60) : playedSec / 60
      );
      video.saveHistory(isNearEnd ? Math.floor(durSec) : undefined);
    }
    player.stop();
    video.releasePendingSession();
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
    video.episodesDrawer.seasonId = null;
    video.episodesDrawer.seasons = [];
    video.episodesDrawer.seasonIndex = -1;
    video.episodesDrawer.seriesId = null;
    video.data = null;
    video.streams = [];
    video.speed.state = false;
    video.speed.active = 1;
    video.quality.state = false;
    video.sleep.state = false;
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
          } else if (video.quality && video.quality.state) {
            video.hideVideoQuality();
            video.showOSD();
          } else if (video.sleep && video.sleep.state) {
            video.hideSleepTimer();
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
        } else if (video.quality && video.quality.state) {
          osd = false;
          video.hideVideoQuality();
          video.showOSD();
        } else if (video.sleep && video.sleep.state) {
          osd = false;
          video.hideSleepTimer();
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
        if (video.episodesDrawer && video.episodesDrawer.open) {
          osd = false;
          video.switchDrawerSeason(-1);
        } else if (video.speed && video.speed.state) {
          osd = false;
          video.setSpeed(-1);
          video.showOSD(true);
        } else if (video.quality && video.quality.state) {
          osd = false;
          video.setQuality(-1);
          video.showOSD(true);
        } else if (video.sleep && video.sleep.state) {
          osd = false;
          video.setSleepTimer(-1);
          video.showOSD(true);
        } else if (video.option) {
          var options = $("#setting-options i");
          var selected = options.index($("#setting-options i.selected"));
          options.removeClass("selected");
          options
            .eq(selected > 0 ? selected - 1 : selected)
            .addClass("selected");
        } else if (!drawerOpen) {
          if (video.isAutoSkipping()) video.abortAutoSkip();
          player.rewind(video.setPlayingTime);
        }
        break;
      case tvKey.KEY_RIGHT:
      case tvKey.KEY_NEXT:
        if (video.episodesDrawer && video.episodesDrawer.open) {
          osd = false;
          video.switchDrawerSeason(1);
        } else if (video.speed && video.speed.state) {
          osd = false;
          video.setSpeed(1);
          video.showOSD(true);
        } else if (video.quality && video.quality.state) {
          osd = false;
          video.setQuality(1);
          video.showOSD(true);
        } else if (video.sleep && video.sleep.state) {
          osd = false;
          video.setSleepTimer(1);
          video.showOSD(true);
        } else if (video.option) {
          var options = $("#setting-options i");
          var selected = options.index($("#setting-options i.selected"));
          options.removeClass("selected");
          options
            .eq(selected < video.options.length - 1 ? selected + 1 : selected)
            .addClass("selected");
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
        } else if (video.quality && video.quality.state) {
          video.hideVideoQuality();
          video.showOSD();
        } else if (video.sleep && video.sleep.state) {
          video.hideSleepTimer();
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
      case 81: // Q: Video Quality selector
        if (!drawerOpen) {
          video.option = true;
          osd = !video.videoQuality();
        }
        break;
      case 84: // T: Sleep Timer / Auto-Pause selector
        if (!drawerOpen) {
          video.option = true;
          osd = !video.sleepTimer();
        }
        break;
      case 83: // S: Skip active segment (Recap / Intro / Credits)
        if (!drawerOpen && (video.activeSkip || (video.intro && video.intro.state))) {
          osd = false;
          video.skipCurrentSegment();
        }
        break;
      case 80: // P: Previous Episode
        !drawerOpen && video.prevEpisode(true);
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
    !drawerOpen &&
      !video.speed.state &&
      !(video.quality && video.quality.state) &&
      !(video.sleep && video.sleep.state) &&
      osd &&
      video.showOSD();
  },

  end: function () {
    var fullDurSec = Math.floor(player.getDuration() || 0);
    if (fullDurSec > 0) {
      video.syncCurrentPlayheadToLists(Math.round(fullDurSec / 60));
      video.saveHistory(fullDurSec);
    }

    if (video.sleep && video.sleep.episodesLeft === 1) {
      video.sleep.active = "off";
      video.sleep.episodesLeft = 0;
      video.stopNext();
      video.syncSleepUI();
      player.pause();
      video.showOSD(true);
      if (typeof window.showToast === "function") {
        window.showToast(
          "Auto-Pause: Reached episode limit - playback paused",
          "info"
        );
      }
      return;
    }

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

  _playReqId: 0,
  _pendingSessionRelease: null,

  releasePendingSession: function () {
    var pending = video._pendingSessionRelease;
    if (!pending) return;
    video._pendingSessionRelease = null;
    if (
      pending.id &&
      pending.token &&
      typeof player !== "undefined" &&
      typeof player.deleteSession === "function"
    ) {
      player.deleteSession({
        data: {
          id: pending.id,
          token: pending.token,
        },
      });
    }
  },

  onPlaybackStarted: function (playSeq) {
    var pending = video._pendingSessionRelease;
    if (!pending) return;
    if (
      pending.reqId !== video._playReqId ||
      pending.playSeq !== playSeq ||
      (typeof player !== "undefined" && playSeq !== player._playSeq) ||
      !document.getElementById(video.id)
    ) {
      return;
    }
    video._pendingSessionRelease = null;
    if (
      pending.id &&
      pending.token &&
      typeof player !== "undefined" &&
      typeof player.deleteSession === "function"
    ) {
      player.deleteSession({
        data: {
          id: pending.id,
          token: pending.token,
        },
      });
    }
  },

  play: function (item, noplay, forceSubtitle) {
    var reqId = (video._playReqId = (video._playReqId || 0) + 1);
    video.episode = item.id;
    video._lastLiveHeight = 0;
    video.stopNext();
    video.next.shown = false;
    video.clearAutoSkip(true);
    $("#skip-intro").hide();
    if (typeof player !== "undefined") {
      if (player.video) {
        try {
          player.video.pause();
        } catch (e) {}
      }
      if (player.plugin) {
        player._playSeq++;
        try {
          player.plugin.reset();
        } catch (e) {}
        player.plugin = null;
      }
    }
    video.releasePendingSession();
    if (video.episodesDrawer && video.episodesDrawer.open) {
      video.renderEpisodesDrawer();
    }
    video.syncQualityUI();
    video.updateMediaSession();
    service.video_v2({
      data: {
        id: item.id,
      },
      success: function (data) {
        var sessionEpId = item.id;
        var sessionToken = data && data.token;
        if (
          reqId !== video._playReqId ||
          video.episode !== item.id ||
          !document.getElementById(video.id)
        ) {
          if (
            sessionEpId &&
            sessionToken &&
            typeof player !== "undefined" &&
            typeof player.deleteSession === "function"
          ) {
            player.deleteSession({
              data: {
                id: sessionEpId,
                token: sessionToken,
              },
            });
          }
          return;
        }
        video.token = sessionToken;
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
            { token: sessionToken, id: sessionEpId },
            video.subtitles[subtitleIndex].url,
            item.duration && item.playhead >= item.duration ? 0 : item.playhead,
            noplay
          );
          video._pendingSessionRelease =
            sessionEpId && sessionToken
              ? {
                  reqId: reqId,
                  playSeq: player._playSeq,
                  id: sessionEpId,
                  token: sessionToken,
                }
              : null;
          video.startHistory();
          video.setAudios();
          video.setSubtitles();
          video.updateMediaSession();
        } catch (error) {
          console.log(error);
        }

        video.showOSD();
      },
      error: function (error) {
        if (reqId !== video._playReqId) return;
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
    video._chaptersDirty = true;
    video.clearAutoSkip(true);
    $("#skip-intro").hide();
    var markersEl = document.getElementById("chapter-markers");
    if (markersEl) markersEl.innerHTML = "";
    service.intro({
      data: {
        id,
      },
      success: function (data) {
        if (video.episode !== id || !document.getElementById(video.id)) return;
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
          video.updateNextEpisodeCount();
        } else {
          video.credits = null;
        }
        video._chaptersDirty = true;
        video.renderChapterMarkers();
      },
      error: function (error) {
        console.log(error);
      },
    });
  },

  renderChapterMarkers: function () {
    var container = document.getElementById("chapter-markers");
    if (!container || typeof player === "undefined") return;
    var dur = player.getDuration();
    if (!dur || isNaN(dur) || dur <= 0) {
      video._chaptersDirty = true;
      return;
    }
    var segments = [];
    if (video.recap && video.recap.end > video.recap.start) {
      segments.push({
        type: "recap",
        label: "Recap",
        start: Math.max(0, video.recap.start),
        end: Math.min(dur, video.recap.end),
      });
    }
    if (video.intro && video.intro.end > video.intro.start) {
      segments.push({
        type: "intro",
        label: "Intro",
        start: Math.max(0, video.intro.start),
        end: Math.min(dur, video.intro.end),
      });
    }
    if (video.credits && video.credits.end > video.credits.start) {
      segments.push({
        type: "credits",
        label: "Credits",
        start: Math.max(0, video.credits.start),
        end: Math.min(dur, video.credits.end),
      });
    }
    var html = "";
    for (var i = 0; i < segments.length; i++) {
      var seg = segments[i];
      if (seg.end <= seg.start) continue;
      var leftPct = Math.max(0, Math.min(100, (seg.start / dur) * 100));
      var widthPct = Math.max(0.6, Math.min(100 - leftPct, ((seg.end - seg.start) / dur) * 100));
      html += `<span class="chapter-marker chapter-${seg.type}" data-chapter="${seg.label}" style="left:${leftPct.toFixed(2)}%;width:${widthPct.toFixed(2)}%"></span>`;
    }
    container.innerHTML = html;
    video._chaptersDirty = false;
  },

  getChapterAtTime: function (sec) {
    if (typeof sec !== "number" || isNaN(sec)) return "";
    if (video.recap && sec >= video.recap.start && sec <= video.recap.end) {
      return "Recap";
    }
    if (video.intro && sec >= video.intro.start && sec <= video.intro.end) {
      return "Intro";
    }
    if (video.credits && sec >= video.credits.start && sec <= video.credits.end) {
      return "Credits";
    }
    return "";
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

    var sleepStopsAfterThis = Boolean(video.sleep && video.sleep.episodesLeft === 1);
    if (seg.type === "credits" && dur > 0 && targetEnd >= dur - 12) {
      if (sleepStopsAfterThis) {
        player.forwardTo(Math.min(targetEnd, Math.max(0, dur - 1)));
        video.setPlayingTime();
        if (targetEnd >= dur - 5) {
          video.end();
        }
        return;
      }
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
    video.updateNextEpisodeCount(targetEnd);
    video.setPlayingTime();
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
    var curPlayheadMin = player.getPlayed() / 60;
    var baseDurMin =
      player.getDuration() > 0
        ? Math.round(player.getDuration() / 60)
        : (video.currentItem && video.currentItem.duration) || 0;
    var durMin =
      baseDurMin > 0
        ? Math.max(baseDurMin, Math.ceil(curPlayheadMin) + 1)
        : 0;
    video.currentItem = Object.assign({}, video.currentItem || {}, {
      id: nextEpisodeId,
      playhead: curPlayheadMin,
      duration: durMin,
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
    var curPlayheadMin = player.getPlayed() / 60;
    var baseDurMin =
      player.getDuration() > 0
        ? Math.round(player.getDuration() / 60)
        : (video.currentItem && video.currentItem.duration) || 0;
    var durMin =
      baseDurMin > 0
        ? Math.max(baseDurMin, Math.ceil(curPlayheadMin) + 1)
        : 0;
    video.currentItem = Object.assign({}, video.currentItem || {}, {
      id: video.episode,
      playhead: curPlayheadMin,
      duration: durMin,
    });
    video.play(video.currentItem, false, video.subtitles[index].name);
  },

  updateNextEpisodeCount: function (overrideTime) {
    var countEl = document.getElementById("next-episode-count");
    if (!countEl || typeof player === "undefined") return;
    var totalTime = player.getDuration();
    if (!totalTime || isNaN(totalTime) || totalTime <= 0) return;
    var curTime =
      typeof overrideTime === "number"
        ? overrideTime
        : player.getPlayed() +
          (player.values && typeof player.values.forward_rewind === "number"
            ? player.values.forward_rewind
            : 0);
    curTime = Math.max(0, curTime);
    var remaining = Math.max(1, Math.ceil(totalTime - curTime));
    var nextText = String(remaining);
    if (countEl.innerText !== nextText) {
      countEl.innerText = nextText;
    }
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
    if (video.sleep && video.sleep.episodesLeft > 1) {
      video.sleep.episodesLeft -= 1;
      video.syncSleepUI();
      if (typeof window.showToast === "function") {
        window.showToast(
          "Auto-Pause: " +
            video.sleep.episodesLeft +
            (video.sleep.episodesLeft === 1 ? " episode" : " episodes") +
            " remaining",
          "info"
        );
      }
    }
    var fullDurSec = Math.floor(player.getDuration() || 0);
    if (fullDurSec > 0) {
      video.syncCurrentPlayheadToLists(Math.round(fullDurSec / 60));
    }
    video.saveHistory(fullDurSec);
    var nextEp = video.next.episode;
    video.currentItem = Object.assign(
      {},
      video.currentItem || {},
      nextEp
    );
    video.play(nextEp);
    video.syncHomeEpisodesSlide();
    $(".osd #title").text(nextEp.serie || nextEp.title || "");
    var nextSub =
      nextEp.season_number !== undefined && nextEp.episode_number !== undefined
        ? `${nextEp.season_number}x${nextEp.episode_number} - ${
            nextEp.episode || nextEp.title || ""
          }`
        : nextEp.episode || nextEp.title || "";
    $(".osd #subtitle").text(nextSub);
  },

  prevEpisode: function () {
    var reqEpId = video.episode;
    var tryPlayPrevFromList = function (list) {
      if (!Array.isArray(list) || !list.length) return false;
      var curIdx = list.findIndex(function (ep) {
        return video.isEpisodeMatch(ep);
      });
      if (curIdx < 0) return false;
      if (curIdx === 0) {
        if (typeof player !== "undefined" && player.getPlayed() > 10) {
          player.forwardTo(0);
          video.setPlayingTime();
          if (typeof window.showToast === "function") {
            window.showToast("Restarted first episode of season", "info");
          }
        } else if (typeof window.showToast === "function") {
          window.showToast("Already at the first episode of this season", "info");
        }
        return true;
      }
      var prevEp = list[curIdx - 1];
      if (!prevEp) return false;
      video.syncCurrentPlayheadToLists(player.getPlayed() / 60);
      video.saveHistory();
      video.currentItem = Object.assign({}, video.currentItem || {}, prevEp, {
        playhead: 0,
      });
      video.play(video.currentItem);
      video.syncHomeEpisodesSlide();
      $(".osd #title").text(video.currentItem.serie || video.currentItem.title || "");
      var prevSub =
        video.currentItem.season_number !== undefined &&
        video.currentItem.episode_number !== undefined
          ? `${video.currentItem.season_number}x${video.currentItem.episode_number} - ${
              video.currentItem.episode || video.currentItem.title || ""
            }`
          : video.currentItem.episode || video.currentItem.title || "";
      $(".osd #subtitle").text(prevSub);
      return true;
    };

    if (
      video.episodesDrawer &&
      Array.isArray(video.episodesDrawer.list) &&
      video.episodesDrawer.list.length > 0 &&
      tryPlayPrevFromList(video.episodesDrawer.list)
    ) {
      return false;
    }

    if (
      typeof home_episodes !== "undefined" &&
      home_episodes.data &&
      Array.isArray(home_episodes.data.episodes) &&
      home_episodes.data.episodes.length > 0 &&
      tryPlayPrevFromList(home_episodes.data.episodes)
    ) {
      return false;
    }

    var fetchSeasonAndPlayPrev = function (seasonId) {
      if (!seasonId) return;
      service.episodes({
        data: { id: seasonId },
        success: function (resp) {
          if (
            video.episode !== reqEpId ||
            !document.getElementById(video.id) ||
            !resp ||
            !Array.isArray(resp.items) ||
            !resp.items.length
          ) {
            return;
          }
          mapper.episodes(resp, function (mappedList) {
            if (video.episode !== reqEpId || !document.getElementById(video.id)) {
              return;
            }
            video.episodesDrawer.seasonId = seasonId;
            video.episodesDrawer.list = mappedList || [];
            tryPlayPrevFromList(video.episodesDrawer.list);
          });
        },
        error: function () {},
      });
    };

    var item = video.currentItem || {};
    var drawerMatchesCurrent = Boolean(
      video.episodesDrawer &&
        Array.isArray(video.episodesDrawer.list) &&
        video.episodesDrawer.list.some(video.isEpisodeMatch)
    );
    var knownSeasonId =
      item.season_id ||
      (drawerMatchesCurrent && video.episodesDrawer.seasonId) ||
      null;
    if (knownSeasonId) {
      fetchSeasonAndPlayPrev(knownSeasonId);
    } else if (reqEpId) {
      service.seriesInfo({
        data: { id: reqEpId },
        success: function (resp) {
          if (video.episode !== reqEpId || !document.getElementById(video.id)) {
            return;
          }
          var doc = resp && resp.data && resp.data[0];
          var meta = (doc && doc.episode_metadata) || {};
          if (meta.season_id) {
            if (video.currentItem) {
              video.currentItem.season_id = meta.season_id;
            }
            fetchSeasonAndPlayPrev(meta.season_id);
          }
        },
        error: function () {},
      });
    }
    return false;
  },

  nextEpisode: function (instant, fromEnded) {
    var reqEpId = video.episode;
    if (!reqEpId) return;
    video.next.shown = true;
    try {
      service.continue({
        data: {
          ids: reqEpId,
        },
        success: function (data) {
          if (video.episode !== reqEpId || !document.getElementById(video.id)) {
            return;
          }
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
            video.updateNextEpisodeCount();
            $(".next-episode").show();
            $("#video-screen").addClass("next-ep-visible");
            video.next.status = true;
            clearInterval(video.timers.next);
            video.timers.next = setInterval(() => {
              var cEl = document.getElementById("next-episode-count");
              if (!cEl || !video.next.status) {
                clearInterval(video.timers.next);
                return;
              }
              video.updateNextEpisodeCount();
            }, 250);
          }
        },
        error: function (error) {
          if (video.episode !== reqEpId) return;
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
    if (video.quality && video.quality.state) {
      video.hideVideoQuality();
    }
    if (video.sleep && video.sleep.state) {
      video.hideSleepTimer();
    }
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
        var speedBadge =
          video.speed.active !== 1 ? video.speed.active + "x" : "";
        speedIcon.setAttribute("data-tooltip", speedLabel);
        speedIcon.setAttribute("data-speed-badge", speedBadge);
        var speedBadgeEl = speedIcon.querySelector(".setting-badge");
        if (speedBadgeEl) speedBadgeEl.textContent = speedBadge;
      }
    }
  },

  getActiveQualityKey: function () {
    var q =
      typeof session !== "undefined" &&
      session.storage &&
      session.storage.quality !== undefined &&
      session.storage.quality !== null
        ? String(session.storage.quality)
        : "auto";
    var exists = video.quality.options.some(function (opt) {
      return opt.key === q;
    });
    return exists ? q : "auto";
  },

  videoQuality: function () {
    if (video.speed && video.speed.state) {
      video.hidePlaySpeed();
    }
    if (video.sleep && video.sleep.state) {
      video.hideSleepTimer();
    }
    if (!video.quality.state) {
      var activeKey = video.getActiveQualityKey();
      var liveH =
        typeof player !== "undefined" &&
        typeof player.getLiveResolutionHeight === "function"
          ? player.getLiveResolutionHeight()
          : 0;
      var qualityMenuHtml = `
        <ul id="quality-menu">
          ${video.quality.options
            .map(
              (opt) =>
                `<li data-quality="${opt.key}" class="${
                  opt.key === activeKey ? "active" : ""
                }">${
                  opt.key === "auto" && liveH > 0
                    ? "Auto (" + liveH + "p)"
                    : opt.label
                }</li>`
            )
            .join("")}
        </ul>
      `;

      video.quality.state = true;
      video.showOSD(true);
      $("#setting-options").hide();
      $(".player-settings").append(qualityMenuHtml);
      video.syncQualityUI();
      return true;
    }
    video.hideVideoQuality();
    video.showOSD();
    return false;
  },

  hideVideoQuality: function () {
    $("#quality-menu").remove();
    $("#setting-options").show();
    video.quality.state = false;
  },

  setQuality: function (incrementOrKey) {
    var opts = video.quality.options;
    var activeKey = video.getActiveQualityKey();
    var targetOpt = null;

    if (typeof incrementOrKey === "string") {
      targetOpt = opts.find(function (o) {
        return o.key === incrementOrKey;
      });
    } else if (typeof incrementOrKey === "number") {
      var curIdx = opts.findIndex(function (o) {
        return o.key === activeKey;
      });
      if (curIdx < 0) curIdx = 0;
      var nextIdx = curIdx + incrementOrKey;
      if (nextIdx >= 0 && nextIdx < opts.length) {
        targetOpt = opts[nextIdx];
      }
    }

    if (!targetOpt) return;

    if (typeof player !== "undefined" && typeof player.setVideoQuality === "function") {
      player.setVideoQuality(targetOpt.key);
    }
    video.syncQualityUI();

    if (typeof window.showToast === "function") {
      window.showToast(
        "Video quality: " + (targetOpt.key === "auto" ? "Auto" : targetOpt.label),
        "info"
      );
    }
  },

  syncQualityUI: function () {
    var activeKey = video.getActiveQualityKey();
    var activeOpt =
      video.quality.options.find(function (o) {
        return o.key === activeKey;
      }) || video.quality.options[0];
    var liveH =
      typeof player !== "undefined" &&
      typeof player.getLiveResolutionHeight === "function"
        ? player.getLiveResolutionHeight()
        : 0;
    video._lastLiveHeight = liveH;

    var items = $("#quality-menu li");
    if (items.length) {
      items.removeClass("active");
      items.each(function () {
        var k = this.getAttribute("data-quality");
        if (k === activeKey) {
          this.classList.add("active");
        }
        if (k === "auto") {
          this.textContent = liveH > 0 ? "Auto (" + liveH + "p)" : "Auto";
        }
      });
    }

    var qualityIcon = document.querySelector("#setting-options i.video-quality");
    if (qualityIcon) {
      var qualityLabel =
        activeKey === "auto"
          ? liveH > 0
            ? "Video Quality: Auto - " + liveH + "p (Q)"
            : "Video Quality: Auto (Q)"
          : "Video Quality: " + activeOpt.label + " (Q)";
      var badgeText =
        activeKey !== "auto"
          ? activeOpt.label
          : liveH > 0
          ? "A " + liveH + "p"
          : "";
      qualityIcon.setAttribute("data-tooltip", qualityLabel);
      qualityIcon.setAttribute("data-quality-badge", badgeText);
      qualityIcon.setAttribute("data-quality-mode", activeKey);
      var qualityBadgeEl = qualityIcon.querySelector(".setting-badge");
      if (qualityBadgeEl) qualityBadgeEl.textContent = badgeText;
    }
  },

  clearSleepCountdown: function (preserveWallClock) {
    if (
      preserveWallClock &&
      video.sleep &&
      video.sleep.endsAt > Date.now()
    ) {
      video.sleep.episodesLeft = 0;
      video.sleep.state = false;
      return;
    }
    if (video.sleep && video.sleep.timerId) {
      clearInterval(video.sleep.timerId);
      video.sleep.timerId = null;
    }
    if (video.sleep) {
      video.sleep.active = "off";
      video.sleep.episodesLeft = 0;
      video.sleep.endsAt = 0;
      video.sleep.state = false;
    }
  },

  sleepTimer: function () {
    if (video.speed && video.speed.state) {
      video.hidePlaySpeed();
    }
    if (video.quality && video.quality.state) {
      video.hideVideoQuality();
    }
    if (!video.sleep.state) {
      var activeKey = (video.sleep && video.sleep.active) || "off";
      var sleepMenuHtml = `
        <ul id="sleep-menu">
          ${video.sleep.options
            .map(
              (opt) =>
                `<li data-sleep="${opt.key}" class="${
                  opt.key === activeKey ? "active" : ""
                }">${opt.label}</li>`
            )
            .join("")}
        </ul>
      `;

      video.sleep.state = true;
      video.showOSD(true);
      $("#setting-options").hide();
      $(".player-settings").append(sleepMenuHtml);
      video.syncSleepUI();
      return true;
    }
    video.hideSleepTimer();
    video.showOSD();
    return false;
  },

  hideSleepTimer: function () {
    $("#sleep-menu").remove();
    $("#setting-options").show();
    if (video.sleep) {
      video.sleep.state = false;
    }
  },

  setSleepTimer: function (incrementOrKey) {
    var opts = video.sleep.options;
    var activeKey = (video.sleep && video.sleep.active) || "off";
    var targetOpt = null;

    if (typeof incrementOrKey === "string") {
      targetOpt = opts.find(function (o) {
        return o.key === incrementOrKey;
      });
    } else if (typeof incrementOrKey === "number") {
      var curIdx = opts.findIndex(function (o) {
        return o.key === activeKey;
      });
      if (curIdx < 0) curIdx = 0;
      var nextIdx = curIdx + incrementOrKey;
      if (nextIdx >= 0 && nextIdx < opts.length) {
        targetOpt = opts[nextIdx];
      }
    }

    if (!targetOpt) return;

    if (video.sleep.timerId) {
      clearInterval(video.sleep.timerId);
      video.sleep.timerId = null;
    }

    video.sleep.active = targetOpt.key;
    video.sleep.episodesLeft = targetOpt.episodes || 0;
    video.sleep.endsAt =
      targetOpt.minutes > 0 ? Date.now() + targetOpt.minutes * 60 * 1000 : 0;

    if (video.sleep.episodesLeft === 1 && video.next && video.next.status) {
      video.stopNext();
      video.next.shown = false;
    }

    if (video.sleep.endsAt > 0) {
      video.sleep.timerId = setInterval(function () {
        if (!video.sleep || video.sleep.endsAt <= 0) {
          clearInterval(video.sleep.timerId);
          video.sleep.timerId = null;
          return;
        }
        if (Date.now() >= video.sleep.endsAt) {
          clearInterval(video.sleep.timerId);
          video.sleep.timerId = null;
          video.sleep.active = "off";
          video.sleep.endsAt = 0;
          video.syncSleepUI();
          if (document.getElementById(video.id)) {
            if (typeof player !== "undefined") {
              player.pause();
            }
            video.showOSD(true);
            if (typeof window.showToast === "function") {
              window.showToast("Sleep Timer: Playback paused", "info");
            }
          }
          return;
        }
        video.syncSleepUI();
      }, 1000);
    }

    video.syncSleepUI();

    if (typeof window.showToast === "function") {
      if (targetOpt.key === "off") {
        window.showToast("Sleep Timer: Off", "info");
      } else if (targetOpt.episodes > 0) {
        window.showToast(
          "Auto-Pause: Stop after " +
            (targetOpt.episodes === 1
              ? "this episode"
              : targetOpt.episodes + " episodes"),
          "info"
        );
      } else if (targetOpt.minutes > 0) {
        window.showToast(
          "Sleep Timer: Pause in " + targetOpt.minutes + " minutes",
          "info"
        );
      }
    }
  },

  syncSleepUI: function () {
    var activeKey = (video.sleep && video.sleep.active) || "off";
    var items = $("#sleep-menu li");
    if (items.length) {
      items.removeClass("active");
      items.each(function () {
        if (this.getAttribute("data-sleep") === activeKey) {
          this.classList.add("active");
        }
      });
    }

    var sleepIcon = document.querySelector("#setting-options i.sleep-timer");
    if (sleepIcon) {
      var badge = "";
      var tooltip = "Sleep Timer / Auto-Pause (T)";
      if (video.sleep && video.sleep.episodesLeft > 0) {
        badge =
          video.sleep.episodesLeft === 1
            ? "1 ep"
            : video.sleep.episodesLeft + " eps";
        tooltip =
          "Auto-Pause: " +
          video.sleep.episodesLeft +
          (video.sleep.episodesLeft === 1 ? " episode" : " episodes") +
          " left (T)";
      } else if (video.sleep && video.sleep.endsAt > Date.now()) {
        var minsLeft = Math.max(
          1,
          Math.ceil((video.sleep.endsAt - Date.now()) / 60000)
        );
        badge = minsLeft + "m";
        tooltip = "Sleep Timer: " + minsLeft + "m left (T)";
      }
      sleepIcon.setAttribute("data-tooltip", tooltip);
      sleepIcon.setAttribute("data-sleep-badge", badge);
      var sleepBadgeEl = sleepIcon.querySelector(".setting-badge");
      if (sleepBadgeEl) sleepBadgeEl.textContent = badge;
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
        document.body.classList.contains("scrubbing-volume") ||
        document.body.classList.contains("scrubbing-opacity") ||
        document.querySelector(".osd-popup-control:hover, .osd-popup-control.popover-open")
      ) {
        video.showOSD(noHide);
        return;
      }
      if (video.speed && video.speed.state) {
        video.hidePlaySpeed();
      }
      if (video.quality && video.quality.state) {
        video.hideVideoQuality();
      }
      if (video.sleep && video.sleep.state) {
        video.hideSleepTimer();
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
    if (video.quality && video.quality.state) {
      video.hideVideoQuality();
    }
    if (video.sleep && video.sleep.state) {
      video.hideSleepTimer();
    }
    var popCtrls = document.querySelectorAll(".osd-popup-control");
    for (var p = 0; p < popCtrls.length; p++) {
      if (popCtrls[p]._closePopTimer) {
        clearTimeout(popCtrls[p]._closePopTimer);
        popCtrls[p]._closePopTimer = null;
      }
      popCtrls[p].classList.remove("popover-open");
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

    if (video._chaptersDirty) {
      video.renderChapterMarkers();
    }

    if (typeof player.getLiveResolutionHeight === "function") {
      var curLiveH = player.getLiveResolutionHeight();
      if (curLiveH > 0 && curLiveH !== video._lastLiveHeight) {
        video.syncQualityUI();
      }
    }

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

    var sleepStopsAfterThis = Boolean(video.sleep && video.sleep.episodesLeft === 1);

    if (
      prefs.autoPlayNext !== false &&
      !sleepStopsAfterThis &&
      !video.next.shown &&
      player.state === player.states.PLAYING &&
      inNextEpWindow
    ) {
      video.updateNextEpisodeCount(time);
      video.nextEpisode();
    } else if (video.next.status && (!inNextEpWindow || sleepStopsAfterThis)) {
      video.stopNext();
      video.next.shown = false;
    } else if (video.next.status && inNextEpWindow) {
      video.updateNextEpisodeCount(time);
    }

    var osd = document.getElementById("osd");
    var isScrubbing =
      document.body.classList.contains("scrubbing-progress") ||
      document.body.classList.contains("scrubbing-volume") ||
      document.body.classList.contains("scrubbing-opacity") ||
      Boolean(
        document.querySelector(
          ".osd-popup-control:hover, .osd-popup-control.popover-open"
        )
      );
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
      var maxIdleMs =
        (video.speed && video.speed.state) ||
        (video.quality && video.quality.state) ||
        (video.sleep && video.sleep.state)
          ? 4200
          : 2200;
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
