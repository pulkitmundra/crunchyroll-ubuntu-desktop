window.mapper = {
  loaded: 0,
  loadedSubcategories: 0,

  escapeHtml: function (str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  formatCount: function (n) {
    var num = Number(n) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(num);
  },

  extractMeta: function (rawItem) {
    if (!rawItem) return {};
    var p = rawItem.panel ? rawItem.panel : rawItem;
    var itemType = p.type || rawItem.type || "";
    var meta =
      p.series_metadata ||
      p.episode_metadata ||
      p.movie_listing_metadata ||
      p.movie_metadata ||
      rawItem.series_metadata ||
      rawItem.episode_metadata ||
      p ||
      {};
    var rObj = rawItem.rating || p.rating || meta.rating || null;
    var avg = rObj && rObj.average ? parseFloat(rObj.average) : 0;
    var rating = avg > 0 ? avg.toFixed(1) : null;
    var ratingTotal = rObj && rObj.total ? rObj.total : null;
    var isSub = Boolean(
      meta.is_subbed ||
        p.is_subbed ||
        (Array.isArray(meta.subtitle_locales) && meta.subtitle_locales.length > 0)
    );
    var isDub = Boolean(
      meta.is_dubbed ||
        p.is_dubbed ||
        (Array.isArray(meta.audio_locales) && meta.audio_locales.length > 1) ||
        (Array.isArray(p.versions) && p.versions.length > 1)
    );
    var subDub = isSub && isDub ? "Sub | Dub" : isDub ? "Dub" : isSub ? "Sub" : "";
    var maturity =
      Array.isArray(meta.maturity_ratings) && meta.maturity_ratings.length
        ? meta.maturity_ratings[0]
        : "";
    var seasonCount = meta.season_count || 0;
    var episodeCount = meta.episode_count || 0;
    var categories = Array.isArray(meta.tenant_categories)
      ? meta.tenant_categories
      : [];
    var isSimulcast = Boolean(
      meta.is_simulcast || p.is_simulcast || rawItem.is_simulcast
    );
    var isComplete =
      typeof meta.is_complete === "boolean"
        ? meta.is_complete
        : typeof p.is_complete === "boolean"
        ? p.is_complete
        : null;
    var launchYear =
      Number(
        meta.series_launch_year ||
          meta.movie_release_year ||
          p.series_launch_year ||
          rawItem.series_launch_year ||
          0
      ) || null;
    var currentYear = new Date().getFullYear();
    var airingStatus = "";
    if (
      isComplete === true ||
      itemType === "movie" ||
      itemType === "movie_listing"
    ) {
      airingStatus = "completed";
    } else if (
      isComplete === false ||
      (isSimulcast && (!launchYear || launchYear >= currentYear - 1))
    ) {
      airingStatus = "ongoing";
    } else if (launchYear && launchYear < currentYear) {
      airingStatus = "completed";
    }
    var activeSimulcast = airingStatus === "ongoing";
    return {
      rating: rating,
      ratingTotal: ratingTotal,
      subDub: subDub,
      maturity: maturity,
      seasonCount: seasonCount,
      episodeCount: episodeCount,
      categories: categories,
      isSimulcast: activeSimulcast,
      isComplete: isComplete,
      launchYear: launchYear,
      airingStatus: airingStatus,
    };
  },

  formatMetaBadges: function (item) {
    if (!item) return "";
    if (typeof mapper.applyCachedAiringInfo === "function") {
      mapper.applyCachedAiringInfo(item);
    }
    var parts = [];
    if (item.rating && Number(item.rating) > 0) {
      var totalStr = item.ratingTotal ? " (" + mapper.formatCount(item.ratingTotal) + ")" : "";
      parts.push(
        `<span class="cr-badge cr-rating"><i class="fa-solid fa-star"></i> ${mapper.escapeHtml(item.rating)}${mapper.escapeHtml(totalStr)}</span>`
      );
    }
    if (item.airingStatus === "ongoing") {
      parts.push(
        `<span class="cr-badge cr-status-ongoing" title="Currently airing simulcast"><span class="cr-status-dot"></span>Ongoing</span>`
      );
    } else if (item.airingStatus === "completed") {
      parts.push(
        `<span class="cr-badge cr-status-completed" title="Completed"><i class="fa-solid fa-circle-check"></i> Completed</span>`
      );
    } else if (item.airingStatus === "upcoming") {
      parts.push(
        `<span class="cr-badge cr-status-upcoming" title="Upcoming"><i class="fa-regular fa-clock"></i> Upcoming</span>`
      );
    }
    if (item.airingScheduleText && item.airingStatus === "ongoing") {
      parts.push(
        `<span class="cr-badge cr-airing-schedule" title="Next episode countdown"><i class="fa-regular fa-calendar-check"></i> ${mapper.escapeHtml(item.airingScheduleText)}</span>`
      );
    }
    if (item.finaleText && item.airingStatus === "ongoing") {
      parts.push(
        `<span class="cr-badge cr-finale-info" title="Estimated season finale"><i class="fa-solid fa-flag-checkered"></i> ${mapper.escapeHtml(item.finaleText)}</span>`
      );
    }
    if (item.subDub) {
      parts.push(`<span class="cr-badge cr-subdub">${mapper.escapeHtml(item.subDub)}</span>`);
    }
    if (item.maturity) {
      parts.push(`<span class="cr-badge cr-maturity">${mapper.escapeHtml(item.maturity)}</span>`);
    }
    if (item.launchYear) {
      parts.push(`<span class="cr-badge cr-year">${mapper.escapeHtml(item.launchYear)}</span>`);
    }
    if (item.seasonCount || item.episodeCount || item.totalPlannedEpisodes) {
      var sc = Number(item.seasonCount)
        ? Number(item.seasonCount) + (Number(item.seasonCount) === 1 ? " Season" : " Seasons")
        : "";
      var epNum = Number(item.episodeCount) || 0;
      var plannedNum = Number(item.totalPlannedEpisodes) || 0;
      var ec = "";
      if (
        item.airingStatus === "ongoing" &&
        plannedNum > 0 &&
        epNum > 0 &&
        plannedNum > epNum &&
        (!item.seasonCount || Number(item.seasonCount) <= 1)
      ) {
        ec = epNum + " / " + plannedNum + " Eps";
      } else if (epNum > 0) {
        ec = epNum + " Eps";
      } else if (plannedNum > 0) {
        ec = plannedNum + " Eps";
      }
      if (sc || ec) {
        parts.push(
          `<span class="cr-badge cr-counts">${sc}${sc && ec ? " - " : ""}${ec}</span>`
        );
      }
    }
    if (Array.isArray(item.categories) && item.categories.length > 0) {
      item.categories.slice(0, 3).forEach(function (cat) {
        parts.push(`<span class="cr-badge cr-genre">${mapper.escapeHtml(cat)}</span>`);
      });
    }
    return parts.join("");
  },

  formatCardBadges: function (item) {
    if (!item) return "";
    if (typeof mapper.applyCachedAiringInfo === "function") {
      mapper.applyCachedAiringInfo(item);
    }
    var hasRating = item.rating && Number(item.rating) > 0;
    var hasSubDub = Boolean(item.subDub);
    var isOngoing = Boolean(
      item.airingStatus
        ? item.airingStatus === "ongoing"
        : item.isSimulcast
    );
    if (!hasRating && !hasSubDub && !isOngoing) return "";
    var rightBadges = "";
    if (isOngoing) {
      rightBadges += `<span class="cr-card-ongoing" title="Ongoing Simulcast"><span class="cr-status-dot"></span>AIRING</span>`;
    }
    if (hasSubDub) {
      rightBadges += `<span class="cr-card-subdub">${mapper.escapeHtml(item.subDub)}</span>`;
    }
    return `<div class="cr-card-badges">${
      hasRating
        ? `<span class="cr-card-rating"><i class="fa-solid fa-star"></i> ${mapper.escapeHtml(item.rating)}</span>`
        : `<span></span>`
    }<span class="cr-card-badges-right">${rightBadges}</span></div>`;
  },

  _airingCache: new Map(),
  _airingInFlight: new Map(),
  _airingStorageLoaded: false,
  _airingDebounceTimer: null,
  _activeMetaTarget: {},

  _loadAiringStorage: function () {
    if (mapper._airingStorageLoaded) return;
    mapper._airingStorageLoaded = true;
    try {
      var raw = sessionStorage.getItem("cr_airing_cache_v2");
      if (!raw) return;
      var parsed = JSON.parse(raw);
      var now = Date.now();
      if (parsed && typeof parsed === "object") {
        Object.keys(parsed).forEach(function (k) {
          var entry = parsed[k];
          if (entry && entry.ts && now - entry.ts < 1800000) {
            mapper._airingCache.set(k, entry);
          }
        });
      }
    } catch (e) {}
  },

  _saveAiringStorage: function () {
    try {
      var out = {};
      var now = Date.now();
      mapper._airingCache.forEach(function (val, key) {
        if (val && !val._failed && val.ts && now - val.ts < 1800000) {
          out[key] = val;
        }
      });
      sessionStorage.setItem("cr_airing_cache_v2", JSON.stringify(out));
    } catch (e) {}
  },

  _normalizeTitleKey: function (title) {
    return String(title || "")
      .toLowerCase()
      .replace(/\((dub|sub|dubbed|subbed|english|japanese)[^)]*\)/gi, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  },

  _titlesMatch: function (queryTitle, media) {
    if (!queryTitle || !media) return false;
    var qNorm = mapper._normalizeTitleKey(queryTitle);
    if (!qNorm) return false;
    var candidates = [];
    if (media.title) {
      if (media.title.english) candidates.push(media.title.english);
      if (media.title.romaji) candidates.push(media.title.romaji);
      if (media.title.userPreferred) candidates.push(media.title.userPreferred);
    }
    if (Array.isArray(media.synonyms)) {
      candidates = candidates.concat(media.synonyms);
    }
    var qWords = qNorm.split(" ").filter(function (w) {
      return w.length > 2;
    });
    for (var i = 0; i < candidates.length; i++) {
      var cNorm = mapper._normalizeTitleKey(candidates[i]);
      if (!cNorm) continue;
      if (cNorm === qNorm) {
        return true;
      }
      var shorter = cNorm.length <= qNorm.length ? cNorm : qNorm;
      var longer = cNorm.length <= qNorm.length ? qNorm : cNorm;
      if (
        shorter.length >= 5 &&
        (longer.indexOf(shorter + " ") === 0 ||
          (longer.indexOf(shorter) >= 0 && shorter.length / longer.length >= 0.45))
      ) {
        return true;
      }
      if (qWords.length >= 2) {
        var matched = 0;
        for (var j = 0; j < qWords.length; j++) {
          if (cNorm.indexOf(qWords[j]) >= 0) matched++;
        }
        if (matched / qWords.length >= 0.65) return true;
      }
    }
    return false;
  },

  _computeAiringFields: function (cached) {
    if (!cached || cached._failed) return null;
    var airingScheduleText = "";
    var finaleText = "";
    var nowSec = Math.floor(Date.now() / 1000);
    var nextEp = cached.nextEpisodeNumber || 0;
    var nextAt = cached.nextAiringAt || 0;
    var totalEps = cached.totalPlannedEpisodes || 0;

    if (cached.airingStatus === "ongoing" && nextAt > nowSec && nextEp > 0) {
      var diffSec = nextAt - nowSec;
      var days = Math.floor(diffSec / 86400);
      var hours = Math.floor((diffSec % 86400) / 3600);
      var mins = Math.max(1, Math.floor((diffSec % 3600) / 60));
      if (days > 0) {
        airingScheduleText = "Ep " + nextEp + " in " + days + "d " + hours + "h";
      } else if (hours > 0) {
        airingScheduleText = "Ep " + nextEp + " in " + hours + "h " + mins + "m";
      } else {
        airingScheduleText = "Ep " + nextEp + " in " + mins + "m";
      }
    }

    var months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    var curYear = new Date().getFullYear();

    if (cached.airingStatus === "ongoing") {
      if (
        cached.endDate &&
        cached.endDate.year &&
        cached.endDate.month &&
        cached.endDate.day
      ) {
        var mName = months[(cached.endDate.month - 1) % 12] || "";
        var ySuffix = cached.endDate.year !== curYear ? ", " + cached.endDate.year : "";
        finaleText = "Est. Finale: " + mName + " " + cached.endDate.day + ySuffix;
      } else if (totalEps > 0 && nextEp > 0 && nextAt > nowSec && totalEps >= nextEp) {
        var remWeeks = totalEps - nextEp;
        var finaleDate = new Date((nextAt + remWeeks * 7 * 86400) * 1000);
        var fMonth = months[finaleDate.getMonth()];
        var fDay = finaleDate.getDate();
        var fYear = finaleDate.getFullYear() !== curYear ? ", " + finaleDate.getFullYear() : "";
        finaleText = "Est. Finale: " + fMonth + " " + fDay + fYear;
      }
    }

    return {
      airingStatus: cached.airingStatus || "",
      totalPlannedEpisodes: totalEps || null,
      airingScheduleText: airingScheduleText,
      finaleText: finaleText,
      launchYear: cached.seasonYear || null,
    };
  },

  applyCachedAiringInfo: function (item) {
    if (
      !item ||
      !item.title ||
      item.type === "movie" ||
      item.type === "movie_listing" ||
      item.seriesType === "movie_listing"
    ) {
      return false;
    }
    mapper._loadAiringStorage();
    var key = mapper._normalizeTitleKey(item.title);
    if (!key) return false;
    var cached = mapper._airingCache.get(key);
    if (!cached || cached._failed) return false;
    var computed = mapper._computeAiringFields(cached);
    if (!computed) return false;
    if (computed.airingStatus) {
      if (item.isComplete === false && computed.airingStatus === "completed") {
        item.airingStatus = "ongoing";
        item.isSimulcast = true;
      } else {
        item.airingStatus = computed.airingStatus;
        item.isSimulcast = computed.airingStatus === "ongoing";
      }
    }
    if (computed.totalPlannedEpisodes) {
      item.totalPlannedEpisodes = computed.totalPlannedEpisodes;
    }
    item.airingScheduleText = computed.airingScheduleText || "";
    item.finaleText = computed.finaleText || "";
    if (!item.launchYear && computed.launchYear) {
      item.launchYear = computed.launchYear;
    }
    return true;
  },

  enrichAiringInfo: function (item, callback) {
    if (
      !item ||
      !item.title ||
      item.type === "movie" ||
      item.type === "movie_listing" ||
      item.seriesType === "movie_listing"
    ) {
      callback && callback(false);
      return;
    }
    mapper._loadAiringStorage();
    var key = mapper._normalizeTitleKey(item.title);
    if (!key) {
      callback && callback(false);
      return;
    }

    var now = Date.now();
    var existing = mapper._airingCache.get(key);
    if (existing) {
      var ttl = existing._failed ? 300000 : 1800000;
      if (now - (existing.ts || 0) < ttl) {
        if (!existing._failed) {
          mapper.applyCachedAiringInfo(item);
          callback && callback(true);
        } else {
          callback && callback(false);
        }
        return;
      }
    }

    if (mapper._airingInFlight.has(key)) {
      mapper._airingInFlight.get(key).push({ item: item, cb: callback });
      return;
    }

    mapper._airingInFlight.set(key, [{ item: item, cb: callback }]);

    var finishInFlight = function (ok) {
      var waiters = mapper._airingInFlight.get(key) || [];
      mapper._airingInFlight.delete(key);
      waiters.forEach(function (w) {
        if (ok && w.item) {
          mapper.applyCachedAiringInfo(w.item);
        }
        if (typeof w.cb === "function") {
          try {
            w.cb(ok);
          } catch (e) {}
        }
      });
    };

    Promise.resolve().then(function () {
      var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timeoutId = setTimeout(function () {
        if (controller) {
          try {
            controller.abort();
          } catch (e) {}
        }
      }, 3500);

      var cleanSearch = String(item.title || "")
        .replace(/\((dub|sub|dubbed|subbed)[^)]*\)/gi, "")
        .trim();

      var query =
        "query ($search: String) { Page(perPage: 6) { media(search: $search, type: ANIME, sort: [SEARCH_MATCH, POPULARITY_DESC]) { format status episodes seasonYear title { romaji english userPreferred } synonyms endDate { year month day } nextAiringEpisode { episode airingAt } } } }";

      fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query: query,
          variables: { search: cleanSearch },
        }),
        signal: controller ? controller.signal : undefined,
      })
        .then(function (res) {
          clearTimeout(timeoutId);
          if (!res || !res.ok) throw new Error("AniList non-200");
          return res.json();
        })
        .then(function (json) {
          var list =
            (json &&
              json.data &&
              json.data.Page &&
              Array.isArray(json.data.Page.media) &&
              json.data.Page.media) ||
            [];
          var matches = list.filter(function (m) {
            return m && mapper._titlesMatch(cleanSearch, m);
          });
          if (!matches.length) {
            mapper._airingCache.set(key, { _failed: true, ts: Date.now() });
            finishInFlight(false);
            return;
          }
          var mainTvMatches = matches.filter(function (m) {
            return !m.format || m.format === "TV";
          });
          var altSeriesMatches = matches.filter(function (m) {
            return m.format === "ONA" || m.format === "TV_SHORT";
          });
          var pool = mainTvMatches.length
            ? mainTvMatches
            : altSeriesMatches.length
            ? altSeriesMatches
            : matches;
          var nonUpcomingPool =
            Number(item.episodeCount) > 0
              ? pool.filter(function (m) {
                  return m.status !== "NOT_YET_RELEASED";
                })
              : pool;
          if (nonUpcomingPool.length) {
            pool = nonUpcomingPool;
          }
          // Prefer a currently RELEASING main TV season if one is airing
          var media =
            pool.find(function (m) {
              return m.status === "RELEASING";
            }) || pool[0];

          var mappedStatus = "";
          if (media.status === "RELEASING") {
            mappedStatus = "ongoing";
          } else if (media.status === "FINISHED") {
            mappedStatus = "completed";
          } else if (media.status === "NOT_YET_RELEASED") {
            mappedStatus = "upcoming";
          }
          var entry = {
            ts: Date.now(),
            airingStatus: mappedStatus,
            totalPlannedEpisodes: Number(media.episodes) || null,
            seasonYear: Number(media.seasonYear) || null,
            endDate: media.endDate || null,
            nextEpisodeNumber:
              media.nextAiringEpisode && media.nextAiringEpisode.episode
                ? Number(media.nextAiringEpisode.episode)
                : null,
            nextAiringAt:
              media.nextAiringEpisode && media.nextAiringEpisode.airingAt
                ? Number(media.nextAiringEpisode.airingAt)
                : null,
          };
          mapper._airingCache.set(key, entry);
          mapper._saveAiringStorage();
          finishInFlight(true);
        })
        .catch(function () {
          clearTimeout(timeoutId);
          mapper._airingCache.set(key, { _failed: true, ts: Date.now() });
          finishInFlight(false);
        });
    });
  },

  _seriesMetaCache: new Map(),

  _extractCmsSeriesEntry: function (doc) {
    if (!doc || !doc.id) return null;
    var meta = mapper.extractMeta(doc);
    var wideBg = "";
    var tallPoster = "";
    if (
      doc.images &&
      Array.isArray(doc.images.poster_wide) &&
      doc.images.poster_wide[0] &&
      doc.images.poster_wide[0].length
    ) {
      var wArr = doc.images.poster_wide[0];
      var wPick = wArr[4] || wArr[wArr.length - 1];
      if (wPick && wPick.source) wideBg = wPick.source;
    }
    if (
      doc.images &&
      Array.isArray(doc.images.poster_tall) &&
      doc.images.poster_tall[0] &&
      doc.images.poster_tall[0].length
    ) {
      var tArr = doc.images.poster_tall[0];
      var tPick = tArr[2] || tArr[tArr.length - 1];
      if (tPick && tPick.source) tallPoster = tPick.source;
    }
    return {
      ts: Date.now(),
      id: doc.id,
      title: doc.title || "",
      description: doc.description || "",
      seriesType: doc.type || "",
      wideBg: wideBg,
      tallPoster: tallPoster,
      meta: meta,
    };
  },

  _applyCmsEntryToItem: function (item, entry) {
    if (!item || !entry || !entry.meta) return;
    var m = entry.meta;
    if (m.rating && Number(m.rating) > 0) {
      item.rating = m.rating;
    }
    if (m.ratingTotal) {
      item.ratingTotal = m.ratingTotal;
    }
    if (
      m.subDub &&
      (!item.subDub || m.subDub.length > String(item.subDub).length)
    ) {
      item.subDub = m.subDub;
    }
    if (!item.maturity && m.maturity) {
      item.maturity = m.maturity;
    }
    if (m.seasonCount) {
      item.seasonCount = m.seasonCount;
    }
    if (m.episodeCount) {
      item.episodeCount = m.episodeCount;
    }
    if (
      (!Array.isArray(item.categories) || item.categories.length === 0) &&
      Array.isArray(m.categories) &&
      m.categories.length > 0
    ) {
      item.categories = m.categories;
    }
    if (m.launchYear) {
      item.launchYear = m.launchYear;
    }
    if (typeof m.isComplete === "boolean") {
      item.isComplete = m.isComplete;
    }
    if (m.airingStatus) {
      item.airingStatus = m.airingStatus;
      item.isSimulcast = m.airingStatus === "ongoing";
    }
    if (entry.seriesType) {
      item.seriesType = entry.seriesType;
    }
    if (entry.wideBg) {
      item.seriesBackground = entry.wideBg;
      if (!item.background) {
        item.background = entry.wideBg;
      }
    }
    if (entry.tallPoster && !item.poster) {
      item.poster = entry.tallPoster;
    }
    if (entry.description) {
      item.seriesDescription = entry.description;
      if (!item.description || item.description === item.episode_title) {
        item.description = entry.description;
      }
    }
    if (entry.title && !item.title) {
      item.title = entry.title;
    }
    mapper.applyCachedAiringInfo(item);
  },

  enrichItemsWithSeriesMeta: function (items, callback) {
    var done = function () {
      if (typeof callback === "function") {
        callback(items);
      }
    };
    if (
      !Array.isArray(items) ||
      items.length === 0 ||
      typeof service === "undefined" ||
      typeof service.cmsObjects !== "function"
    ) {
      done();
      return;
    }

    var now = Date.now();
    var ttlMs = 1800000;
    var missingIdsSet = new Set();

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it) continue;
      var lookupId = it.series_id || it.id;
      if (!lookupId) continue;
      var cached = mapper._seriesMetaCache.get(lookupId);
      if (cached && now - (cached.ts || 0) < ttlMs) {
        mapper._applyCmsEntryToItem(it, cached);
      } else if (
        !it.rating ||
        !it.launchYear ||
        (!it.seasonCount && !it.episodeCount) ||
        it.display === "episode" ||
        it.type === "episode"
      ) {
        missingIdsSet.add(lookupId);
      }
    }

    var missingIds = Array.from(missingIdsSet);
    if (!missingIds.length) {
      done();
      return;
    }

    var chunks = [];
    for (var c = 0; c < missingIds.length; c += 50) {
      chunks.push(missingIds.slice(c, c + 50));
    }

    var completedChunks = 0;
    var onChunkFinish = function () {
      completedChunks++;
      if (completedChunks >= chunks.length) {
        for (var j = 0; j < items.length; j++) {
          var target = items[j];
          if (!target) continue;
          var tid = target.series_id || target.id;
          var entry = tid ? mapper._seriesMetaCache.get(tid) : null;
          if (entry) {
            mapper._applyCmsEntryToItem(target, entry);
          }
        }
        done();
      }
    };

    chunks.forEach(function (chunk) {
      service.cmsObjects({
        data: { ids: chunk },
        success: function (res) {
          var docs = (res && Array.isArray(res.data) && res.data) || [];
          for (var d = 0; d < docs.length; d++) {
            var entry = mapper._extractCmsSeriesEntry(docs[d]);
            if (entry && entry.id) {
              mapper._seriesMetaCache.set(entry.id, entry);
            }
          }
          onChunkFinish();
        },
        error: function () {
          onChunkFinish();
        },
      });
    });
  },

  triggerHeroEnrichment: function (item, targetRowId, debounceMs) {
    if (
      !item ||
      !item.title ||
      item.type === "movie" ||
      item.type === "movie_listing" ||
      item.seriesType === "movie_listing"
    ) {
      return;
    }
    var rowId = targetRowId || "hero-meta-row";
    var targetId = item.id || item.title;
    mapper._activeMetaTarget[rowId] = targetId;

    if (mapper._airingDebounceTimer) {
      clearTimeout(mapper._airingDebounceTimer);
      mapper._airingDebounceTimer = null;
    }

    if (mapper.applyCachedAiringInfo(item)) {
      var elNow = document.getElementById(rowId);
      if (elNow) {
        elNow.innerHTML = mapper.formatMetaBadges(item);
      }
      return;
    }
    var wait = typeof debounceMs === "number" ? debounceMs : 180;
    mapper._airingDebounceTimer = setTimeout(function () {
      mapper._airingDebounceTimer = null;
      mapper.enrichAiringInfo(item, function (updated) {
        if (!updated) return;
        if (mapper._activeMetaTarget[rowId] !== targetId) return;
        var el = document.getElementById(rowId);
        if (!el) return;
        // Verify the user is still viewing the same item before updating DOM
        if (rowId === "hero-meta-row") {
          var activeItem = null;
          if (
            typeof home_details !== "undefined" &&
            typeof main !== "undefined" &&
            main.state === home_details.id
          ) {
            activeItem = home_details.data && home_details.data.this;
          } else if (typeof home !== "undefined") {
            if (home._previewItem) {
              activeItem = home._previewItem;
            } else if (home.position === 0 && home.data && home.data.main) {
              activeItem = home.data.main.banner;
            } else if (
              home.position > 0 &&
              home.data &&
              home.data.main &&
              home.data.main.lists &&
              home.data.main.lists[home.position - 1]
            ) {
              var rEl = $(`#${home.id} .row-content`)[home.position - 1];
              if (rEl && rEl.slick) {
                activeItem =
                  home.data.main.lists[home.position - 1].items[
                    rEl.slick.currentSlide
                  ];
              }
            }
          }
          if (activeItem && (activeItem.id || activeItem.title) === targetId) {
            mapper.applyCachedAiringInfo(activeItem);
            el.innerHTML = mapper.formatMetaBadges(activeItem);
          }
        } else if (rowId === "generic-meta-row") {
          el.innerHTML = mapper.formatMetaBadges(item);
        }
      });
    }, wait);
  },

  _homeReqId: 0,
  _catReqId: 0,

  home: function (response, callback) {
    var reqId = ++mapper._homeReqId;
    var rawData = (response && Array.isArray(response.data)) ? response.data : [];
    var lists = rawData.filter((element) =>
      element &&
      [
        "recommendations",
        "history",
        "browse",
        "series",
        "because_you_watched",
      ].includes(element.response_type)
    );

    var banner = rawData.find((p) => p && p.resource_type === "panel" && p.panel);
    var bannerPanel = banner && banner.panel ? banner.panel : {};
    var bannerMeta = banner && banner.panel ? mapper.extractMeta(banner.panel) : {};
    var bannerEpMeta = bannerPanel.episode_metadata || {};
    var bannerId =
      bannerPanel.type === "episode" && bannerEpMeta.series_id
        ? bannerEpMeta.series_id
        : bannerPanel.id || "";

    var mainData = {
      banner: {
        id: bannerId,
        type: bannerPanel.type || "",
        title:
          (bannerPanel.type === "episode" && bannerEpMeta.series_title) ||
          bannerPanel.title ||
          "",
        description: bannerPanel.description || "",
        background: bannerPanel.id
          ? mapper.preventImageErrorTest(function () {
              if (
                bannerPanel.images &&
                bannerPanel.images.poster_wide &&
                bannerPanel.images.poster_wide[0]
              ) {
                var w = bannerPanel.images.poster_wide[0];
                return (w[4] || w[w.length - 1]).source;
              }
              var th = bannerPanel.images.thumbnail[0];
              return (th[4] || th[th.length - 1]).source;
            }, bannerPanel.id)
          : "",
        rating: bannerMeta.rating,
        ratingTotal: bannerMeta.ratingTotal,
        subDub: bannerMeta.subDub,
        maturity: bannerMeta.maturity,
        seasonCount: bannerMeta.seasonCount,
        episodeCount: bannerMeta.episodeCount,
        categories: bannerMeta.categories,
        isSimulcast: bannerMeta.isSimulcast,
        isComplete: bannerMeta.isComplete,
        launchYear: bannerMeta.launchYear,
        airingStatus: bannerMeta.airingStatus,
      },
      lists: lists.map((list) => ({
        title: list.title,
        items: [],
      })),
    };
    home.data.main = mainData;

    if (!lists.length) {
      if (mainData.banner && mainData.banner.id) {
        mapper.enrichItemsWithSeriesMeta([mainData.banner], function () {
          if (reqId !== mapper._homeReqId) return;
          callback.success();
        });
      } else {
        callback.success();
      }
      return;
    }

    var loadedCount = 0;
    var checkHomeLoaded = function () {
      if (reqId !== mapper._homeReqId) return;
      loadedCount++;
      if (loadedCount === lists.length) {
        mainData.lists = mainData.lists.filter(
          (e) => e.items && e.items.length > 0
        );
        if (
          !mainData.banner.id &&
          mainData.lists[0] &&
          mainData.lists[0].items[0]
        ) {
          mainData.banner = mainData.lists[0].items[0];
        }
        var toEnrich = [];
        if (mainData.banner && mainData.banner.id) {
          toEnrich.push(mainData.banner);
        }
        mainData.lists.forEach(function (lst) {
          (lst.items || []).forEach(function (it) {
            if (it && (!it.rating || it.display === "episode")) {
              toEnrich.push(it);
            }
          });
        });
        home.data.main = mainData;
        mapper.enrichItemsWithSeriesMeta(toEnrich, function () {
          if (reqId !== mapper._homeReqId) return;
          home.data.main = mainData;
          callback.success();
        });
      }
    };

    for (var index = 0; index < lists.length; index++) {
      mapper.load(lists[index], index, {
        success: function (test, on) {
          if (reqId !== mapper._homeReqId) return;
          mainData.lists[on].items = mapper.mapItems((test && test.data) || []);
          checkHomeLoaded();
        },
        error: function () {
          checkHomeLoaded();
        },
      });
    }
  },

  load: (item, index, callback) => {
    service._authedRequest(
      {
        success: function (json) {
          callback.success(json, index);
        },
        error: function (error) {
          console.log(error);
          callback.error && callback.error(error, index);
        },
      },
      function (storage) {
        var locale = encodeURIComponent(service._locale(storage));
        var audio = encodeURIComponent(service._audio(storage));
        var url;
        if (item.resource_type === "dynamic_collection") {
          url =
            item.link +
            (item.link.indexOf("?") >= 0 ? "&ratings=true" : "?ratings=true");
          if (url.indexOf("locale=") === -1) {
            url += `&locale=${locale}`;
          }
          if (audio && url.indexOf("preferred_audio_language=") === -1) {
            url += `&preferred_audio_language=${audio}`;
          }
        } else {
          url = `/content/v2/cms/objects/${(item.ids || []).join()}?ratings=true&preferred_audio_language=${audio}&locale=${locale}`;
        }
        return {
          url: `${service.api.url}${url}`,
        };
      }
    );
  },

  continue: function (response) {
    if (!response || !Array.isArray(response.data) || !response.data[0] || !response.data[0].panel) {
      return null;
    }
    var item = response.data[0];
    var panel = item.panel;
    var isMovie = panel.type === "movie";
    var epMeta = panel.episode_metadata || {};
    var mvMeta = panel.movie_metadata || {};
    var durMs = (isMovie ? mvMeta.duration_ms : epMeta.duration_ms) || 0;
    var meta = mapper.extractMeta(item);
    return {
      id: panel.id,
      type: panel.type || "episode",
      series_id: epMeta.series_id || mvMeta.movie_listing_id || undefined,
      season_id: epMeta.season_id,
      stream: panel.streams_link
        ? panel.streams_link.substr(
            panel.streams_link.indexOf("/videos/") + 8,
            9
          )
        : undefined,
      serie: epMeta.series_title || mvMeta.movie_listing_title || panel.title,
      episode: panel.title,
      season_number: isMovie ? undefined : epMeta.season_number || 0,
      episode_number: isMovie ? undefined : epMeta.episode_number || 0,
      description: panel.description,
      background: mapper.preventImageErrorTest(function () {
        var th = panel.images.thumbnail[0];
        return (th[4] || th[th.length - 1]).source;
      }, panel.id),
      watched: Boolean(!item.never_watched || item.fully_watched),
      playhead: item.fully_watched
        ? Math.round(durMs / 60000)
        : item.playhead
        ? item.playhead / 60
        : 0,
      duration: Math.round(durMs / 60000),
      played: durMs ? ((item.playhead || 0) * 100) / (durMs / 1000) : 0,
      subDub: meta.subDub,
    };
  },

  seasons: function (response) {
    var items = (response && Array.isArray(response.items)) ? response.items : [];
    var seasons = items
      .filter((season) => {
        var is_audio_match =
          season.audio_locale === session.storage.account.audio ||
          (Array.isArray(season.audio_locales) &&
            season.audio_locales.includes(session.storage.account.audio));
        var has_audio_match =
          Array.isArray(season.versions) &&
          season.versions.some(
            (version) => version && version.audio_locale === session.storage.account.audio,
          );
        return is_audio_match || (!season.is_dubbed && !has_audio_match);
      });

    if (!seasons?.length) {
      seasons = items;
    }

    return seasons.map((season) => {
      try {
        var audio_locale = season.audio_locale.split("-")[0].toUpperCase();
      } catch (e) {
        console.error(e);
        audio_locale = "";
      }
      return {
        id: season.id,
        title: season.title,
        number: season.season_number,
        audio_locale,
        is_complete: typeof season.is_complete === "boolean" ? season.is_complete : null,
        is_simulcast: Boolean(season.is_simulcast),
      };
    });
  },

  episodes: function (response, callback) {
    if (!response || !Array.isArray(response.items)) {
      callback && callback([]);
      return;
    }
    var episodes = response.items.map((episode) => {
      var meta = mapper.extractMeta(episode);
      return {
        id: episode.id,
        series_id: episode.series_id,
        season_id: episode.season_id,
        title: episode.title,
        episode: episode.title,
        serie: episode.series_title,
        description: episode.description,
        episode_number: episode.episode_number || 0,
        season_number: episode.season_number || 0,
        background: mapper.preventImageErrorTest(function () {
          return episode.images.thumbnail
            ? episode.images.thumbnail[0][1].source
            : "";
        }, episode.id),
        stream: episode.__links__ && episode.__links__.streams
          ? episode.__links__.streams.href.substr(
              episode.__links__.streams.href.indexOf("/videos/") + 8,
              9
            )
          : undefined,
        duration: Math.round(episode.duration_ms / 60000),
        premium: episode.is_premium_only,
        subDub: meta.subDub,
      };
    });

    mapper.playheads(episodes, function (playheads) {
      episodes = episodes.map((e) => {
        var element = playheads.get(e.id);
        e.playhead = element
          ? element.fully_watched
            ? e.duration
            : element.playhead
            ? element.playhead / 60
            : 0
          : 0;
        return e;
      });
      callback && callback(episodes);
    });
  },

  playheads: function (episodes, callback) {
    if (!episodes || !episodes.length) {
      callback && callback(new Map());
      return;
    }
    service.playheads({
      data: {
        ids: episodes.map((e) => e.id).join(),
      },
      success: function (response) {
        var arr = (response && Array.isArray(response.data)) ? response.data : [];
        var playheads = new Map(
          arr.map((obj) => [obj.content_id, obj])
        );
        callback && callback(playheads);
      },
      error: function (error) {
        console.log(error);
        callback && callback(new Map());
      },
    });
  },

  search: function (response) {
    return ((response && response.data) || []).reduce(
      (acum, elem) =>
        elem.type === "series" || elem.type === "movie_listing"
          ? [
              ...acum,
              ...(elem.items || []).map((item) => {
                var meta = mapper.extractMeta(item);
                return {
                  display: "serie",
                  type: item.type,
                  id: item.id,
                  title: item.title,
                  description: item.description,
                  background: mapper.preventImageErrorTest(function () {
                    var wide = item.images.poster_wide[0];
                    return (wide[4] || wide[wide.length - 1]).source;
                  }, item.id),
                  poster: mapper.preventImageErrorTest(function () {
                    var tall = item.images.poster_tall[0];
                    return (tall[2] || tall[tall.length - 1]).source;
                  }, item.id),
                  rating: meta.rating,
                  ratingTotal: meta.ratingTotal,
                  subDub: meta.subDub,
                  maturity: meta.maturity,
                  seasonCount: meta.seasonCount,
                  episodeCount: meta.episodeCount,
                  categories: meta.categories,
                  isSimulcast: meta.isSimulcast,
                  isComplete: meta.isComplete,
                  launchYear: meta.launchYear,
                  airingStatus: meta.airingStatus,
                };
              }),
            ]
          : acum,
      []
    );
  },

  history: function (response) {
    return ((response && response.data) || [])
      .filter(
        (element) =>
          element &&
          element.panel &&
          (element.panel.episode_metadata || element.panel.movie_metadata)
      )
      .map((element) => {
        var meta = mapper.extractMeta(element);
        var panel = element.panel;
        var isMovie = Boolean(!panel.episode_metadata && panel.movie_metadata);
        var epMeta = panel.episode_metadata || {};
        var mvMeta = panel.movie_metadata || {};
        var rawDurMs = (isMovie ? mvMeta.duration_ms : epMeta.duration_ms) || 0;
        var durMin = Math.round(rawDurMs / 60000);
        var seriesOrListingId = isMovie
          ? mvMeta.movie_listing_id || panel.id
          : epMeta.series_id || panel.id;
        return {
          id: seriesOrListingId,
          type: isMovie ? "movie" : "episode",
          display: "episode",
          content_id: element.id || panel.id || "",
          series_id: seriesOrListingId,
          season_id: epMeta.season_id || "",
          season_number: isMovie ? "" : epMeta.season_number || "",
          episode_number: isMovie ? "" : epMeta.episode_number || "",
          episode_title: panel.title || "",
          playhead: element.fully_watched
            ? durMin
            : element.playhead
            ? element.playhead / 60
            : 0,
          duration: durMin,
          title: isMovie
            ? mvMeta.movie_listing_title || panel.title
            : epMeta.series_title || panel.title,
          description: panel.description || panel.title || "",
          background: mapper.preventImageErrorTest(function () {
            var th = panel.images.thumbnail[0];
            return (th[4] || th[th.length - 1]).source;
          }, seriesOrListingId),
          rating: meta.rating,
          ratingTotal: meta.ratingTotal,
          subDub: meta.subDub,
          maturity: meta.maturity,
          categories: meta.categories,
          isSimulcast: meta.isSimulcast,
          isComplete: meta.isComplete,
          launchYear: meta.launchYear,
          airingStatus: meta.airingStatus,
        };
      });
  },

  preventImageErrorTest: function (callback, id) {
    try {
      return callback();
    } catch (error) {
      console.log(`error image #${id}`);
      return `https://dummyimage.com/600x400/f48321/fff.png&text=IMAGE+${id}`;
    }
  },

  listByCategories: function (id, subcategories, callback) {
    var reqId = ++mapper._catReqId;
    var effectiveSubcats =
      Array.isArray(subcategories) && subcategories.length > 0
        ? subcategories
        : [
            {
              parent_category: id,
              tenant_category: "",
              localization: { description: id },
            },
          ];
    var mainData = {
      category: effectiveSubcats[0] ? effectiveSubcats[0].parent_category : id,
      banner: {
        id: "",
        title: "",
        description: "",
        background: "",
      },
      lists: effectiveSubcats.map((subcategory) => ({
        lazy: true,
        id: subcategory.tenant_category,
        title:
          (subcategory.localization && subcategory.localization.description) ||
          id,
        items: [],
      })),
    };
    home.data.main = mainData;

    var loadedCount = 0;
    var checkSubcategoryComplete = function () {
      if (reqId !== mapper._catReqId) return;
      loadedCount++;
      if (loadedCount === effectiveSubcats.length) {
        mainData.lists = mainData.lists.filter(
          (e) => e.items && e.items.length > 0
        );
        if (mainData.lists[0] && mainData.lists[0].items[0]) {
          mainData.banner = mainData.lists[0].items[0];
        }
        home.data.main = mainData;
        callback.success();
      }
    };

    for (var index = 0; index < effectiveSubcats.length; index++) {
      var catQuery = effectiveSubcats[index].tenant_category
        ? `${id},${effectiveSubcats[index].tenant_category}`
        : `${id}`;
      mapper.loadCategoryListAsync(
        catQuery,
        0,
        20,
        index,
        {
          success: function (response, listPosition) {
            if (reqId !== mapper._catReqId) return;
            var rawItems =
              (response && (response.data || response.items)) || [];
            mainData.lists[listPosition].items = mapper.mapItems(rawItems);
            checkSubcategoryComplete();
          },
          error: function (error) {
            console.log("fail on load subcategorie list.", error);
            checkSubcategoryComplete();
          },
        }
      );
    }
  },

  mapItems: function (items) {
    if (!Array.isArray(items)) return [];
    var result = [];
    for (var i = 0; i < items.length; i++) {
      try {
        var rawItem = items[i];
        if (!rawItem) continue;
        var meta = mapper.extractMeta(rawItem);
        var playhead = rawItem.playhead
          ? rawItem.playhead / 60
          : undefined;
        var item = rawItem.panel ? rawItem.panel : rawItem;
        var id = item.id;
        var display = "serie";
        var title = item.title;
        var duration = undefined;
        var background = "";
        var poster = undefined;
        var categories = meta.categories;

        if (item.type === "episode") {
          var epMeta = item.episode_metadata || {};
          id = epMeta.series_id || item.id;
          duration = epMeta.duration_ms ? Math.round(epMeta.duration_ms / 60000) : undefined;
          if (rawItem.fully_watched && duration) {
            playhead = duration;
          }
          display = "episode";
          title = epMeta.series_title || item.title;
          background = mapper.preventImageErrorTest(function () {
            var thumbs = item.images.thumbnail[0];
            return (thumbs[4] || thumbs[thumbs.length - 1]).source;
          }, id);
          poster = undefined;
          categories = epMeta.tenant_categories || meta.categories;
        } else if (item.type == "movie") {
          var mvMeta = item.movie_metadata || {};
          duration = mvMeta.duration_ms ? Math.round(mvMeta.duration_ms / 60000) : undefined;
          if (rawItem.fully_watched && duration) {
            playhead = duration;
          }
          display = "episode";
          background = mapper.preventImageErrorTest(function () {
            var thumbs = item.images.thumbnail[0];
            return (thumbs[4] || thumbs[thumbs.length - 1]).source;
          }, id);
          poster = undefined;
          categories = mvMeta.tenant_categories
            ? mvMeta.tenant_categories
            : [];
        } else {
          background = mapper.preventImageErrorTest(function () {
            var wide = item.images.poster_wide[0];
            return (wide[4] || wide[wide.length - 1]).source;
          }, id);
          poster = mapper.preventImageErrorTest(function () {
            var tall = item.images.poster_tall[0];
            return (tall[2] || tall[tall.length - 1]).source;
          }, id);
          categories = meta.categories;
        }

        result.push({
          id,
          display,
          duration,
          playhead,
          background,
          poster,
          title,
          description: item.description,
          type: item.type,
          categories: categories || meta.categories,
          rating: meta.rating,
          ratingTotal: meta.ratingTotal,
          subDub: meta.subDub,
          maturity: meta.maturity,
          seasonCount: meta.seasonCount,
          episodeCount: meta.episodeCount,
          isSimulcast: meta.isSimulcast,
          isComplete: meta.isComplete,
          launchYear: meta.launchYear,
          airingStatus: meta.airingStatus,
        });
      } catch (error) {
        console.log("WARN: error on map element:", error);
      }
    }
    return result;
  },

  loadCategoryListAsync: function (categories, offset, size, index, callback) {
    service._authedRequest(
      {
        success: function (json) {
          callback.success(json, index);
        },
        error: function (error) {
          callback.error && callback.error(error);
        },
      },
      function (storage) {
        var audio = encodeURIComponent(service._audio(storage));
        var locale = encodeURIComponent(service._locale(storage));
        var cats = encodeURIComponent(String(categories || "").replace(/,+$/, ""));
        return {
          url: `${service.api.url}/content/v2/discover/browse?categories=${cats}&n=${size}&start=${offset}&ratings=true&preferred_audio_language=${audio}&locale=${locale}`,
        };
      }
    );
  },
};
