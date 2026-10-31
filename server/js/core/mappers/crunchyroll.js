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
    return {
      rating: rating,
      ratingTotal: ratingTotal,
      subDub: subDub,
      maturity: maturity,
      seasonCount: seasonCount,
      episodeCount: episodeCount,
      categories: categories,
    };
  },

  formatMetaBadges: function (item) {
    if (!item) return "";
    var parts = [];
    if (item.rating && Number(item.rating) > 0) {
      var totalStr = item.ratingTotal ? " (" + mapper.formatCount(item.ratingTotal) + ")" : "";
      parts.push(
        `<span class="cr-badge cr-rating"><i class="fa-solid fa-star"></i> ${mapper.escapeHtml(item.rating)}${mapper.escapeHtml(totalStr)}</span>`
      );
    }
    if (item.subDub) {
      parts.push(`<span class="cr-badge cr-subdub">${mapper.escapeHtml(item.subDub)}</span>`);
    }
    if (item.maturity) {
      parts.push(`<span class="cr-badge cr-maturity">${mapper.escapeHtml(item.maturity)}</span>`);
    }
    if (item.seasonCount || item.episodeCount) {
      var sc = Number(item.seasonCount)
        ? Number(item.seasonCount) + (Number(item.seasonCount) === 1 ? " Season" : " Seasons")
        : "";
      var ec = Number(item.episodeCount) ? Number(item.episodeCount) + " Eps" : "";
      parts.push(
        `<span class="cr-badge cr-counts">${sc}${sc && ec ? " - " : ""}${ec}</span>`
      );
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
    var hasRating = item.rating && Number(item.rating) > 0;
    var hasSubDub = Boolean(item.subDub);
    if (!hasRating && !hasSubDub) return "";
    return `<div class="cr-card-badges">${
      hasRating
        ? `<span class="cr-card-rating"><i class="fa-solid fa-star"></i> ${mapper.escapeHtml(item.rating)}</span>`
        : `<span></span>`
    }${hasSubDub ? `<span class="cr-card-subdub">${mapper.escapeHtml(item.subDub)}</span>` : ""}</div>`;
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

    var mainData = {
      banner: {
        id: bannerPanel.id || "",
        title: bannerPanel.title || "",
        description: bannerPanel.description || "",
        background: bannerPanel.id
          ? mapper.preventImageErrorTest(function () {
              return bannerPanel.images.poster_wide[0][4].source;
            }, bannerPanel.id)
          : "",
        rating: bannerMeta.rating,
        ratingTotal: bannerMeta.ratingTotal,
        subDub: bannerMeta.subDub,
        maturity: bannerMeta.maturity,
        seasonCount: bannerMeta.seasonCount,
        episodeCount: bannerMeta.episodeCount,
        categories: bannerMeta.categories,
      },
      lists: lists.map((list) => ({
        title: list.title,
        items: [],
      })),
    };
    home.data.main = mainData;

    if (!lists.length) {
      callback.success();
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
        home.data.main = mainData;
        callback.success();
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
    session.refresh({
      success: function (storage) {
        var url;
        if (item.resource_type === "dynamic_collection") {
          url =
            item.link +
            (item.link.indexOf("?") >= 0 ? "&ratings=true" : "?ratings=true");
        } else {
          url = `/content/v2/cms/objects/${(item.ids || []).join()}?ratings=true&locale=${
            storage.account.language
          }`;
        }

        var headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/x-www-form-urlencoded");

        return fetch(`${service.api.url}${url}`, { headers: headers })
          .then((response) => response.json())
          .then((json) => callback.success(json, index))
          .catch((error) => {
            console.log(error);
            callback.error && callback.error(error, index);
          });
      },
      error: function (error) {
        callback.error && callback.error(error, index);
      },
    });
  },

  continue: function (response) {
    if (!response || !Array.isArray(response.data) || !response.data[0] || !response.data[0].panel) {
      return null;
    }
    var item = response.data[0];
    var epMeta = item.panel.episode_metadata || {};
    var meta = mapper.extractMeta(item);
    return {
      id: item.panel.id,
      series_id: epMeta.series_id,
      season_id: epMeta.season_id,
      stream: item.panel.streams_link
        ? item.panel.streams_link.substr(
            item.panel.streams_link.indexOf("/videos/") + 8,
            9
          )
        : undefined,
      serie: epMeta.series_title,
      episode: item.panel.title,
      season_number: epMeta.season_number || 0,
      episode_number: epMeta.episode_number || 0,
      description: item.panel.description,
      background: mapper.preventImageErrorTest(function () {
        return item.panel.images.thumbnail[0][4].source;
      }, item.panel.id),
      watched: !item.never_watched,
      playhead: item.playhead ? item.playhead / 60 : 0,
      duration: Math.round(epMeta.duration_ms / 60000),
      played: (item.playhead * 100) / (epMeta.duration_ms / 1000),
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
                    return item.images.poster_wide[0][5].source;
                  }, item.id),
                  poster: mapper.preventImageErrorTest(function () {
                    return item.images.poster_tall[0][2].source;
                  }),
                  rating: meta.rating,
                  ratingTotal: meta.ratingTotal,
                  subDub: meta.subDub,
                  maturity: meta.maturity,
                  seasonCount: meta.seasonCount,
                  episodeCount: meta.episodeCount,
                  categories: meta.categories,
                };
              }),
            ]
          : acum,
      []
    );
  },

  history: function (response) {
    return ((response && response.data) || [])
      .filter((element) => element && element.panel && element.panel.episode_metadata)
      .map((element) => {
        var meta = mapper.extractMeta(element);
        var epMeta = element.panel.episode_metadata || {};
        return {
          id: epMeta.series_id,
          series_id: epMeta.series_id,
          season_id: epMeta.season_id || "",
          season_number: epMeta.season_number || "",
          episode_number: epMeta.episode_number || "",
          episode_title: element.panel.title || "",
          playhead: element.playhead ? Math.round(element.playhead / 60) : 0,
          duration: Math.round(
            (element.panel
              ? epMeta.duration_ms
              : element.episode_metadata.duration_ms) / 60000
          ),
          title: element.panel
            ? epMeta.series_title
            : element.title,
          description: element.panel.title,
          background: mapper.preventImageErrorTest(function () {
            return element.panel
              ? element.panel.images.thumbnail[0][4].source
              : element.images.thumbnail[0][4].source;
          }, epMeta.series_id),
          subDub: meta.subDub,
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
    var mainData = {
      category: subcategories[0] ? subcategories[0].parent_category : id,
      banner: {
        id: "",
        title: "",
        description: "",
        background: "",
      },
      lists: subcategories.map((subcategory) => ({
        lazy: true,
        id: subcategory.tenant_category,
        title: subcategory.localization.description,
        items: [],
      })),
    };
    home.data.main = mainData;

    if (!subcategories.length) {
      callback.success();
      return;
    }

    var loadedCount = 0;
    var checkSubcategoryComplete = function () {
      if (reqId !== mapper._catReqId) return;
      loadedCount++;
      if (loadedCount === subcategories.length) {
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

    for (var index = 0; index < subcategories.length; index++) {
      mapper.loadCategoryListAsync(
        `${id},${subcategories[index].tenant_category}`,
        0,
        20,
        index,
        {
          success: function (response, listPosition) {
            if (reqId !== mapper._catReqId) return;
            mainData.lists[listPosition].items = mapper.mapItems(
              (response && response.items) || []
            );
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
          ? Math.round(rawItem.playhead / 60)
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
        });
      } catch (error) {
        console.log("WARN: error on map element:", error);
      }
    }
    return result;
  },

  loadCategoryListAsync: function (categories, offset, size, index, callback) {
    session.refresh({
      success: function (storage) {
        var headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/x-www-form-urlencoded");

        return fetch(
          `${service.api.url}/content/v1/browse?categories=${categories}&n=${size}&start=${offset}&ratings=true`,
          { headers: headers }
        )
          .then((response) => response.json())
          .then((json) => callback.success(json, index))
          .catch((error) => {
            callback.error && callback.error(error);
          });
      },
      error: function (error) {
        callback.error && callback.error(error);
      },
    });
  },
};
