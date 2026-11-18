window.service = {
  api: {
    url: "https://beta-api.crunchyroll.com",
    static: "https://static.crunchyroll.com",
    drm: "https://cr-play-service.prd.crunchyrollsvc.com",
    //url: "http://api.crunchyroll.local",
    //static: "http://static.crunchyroll.local",
    auth: "Basic eHVuaWh2ZWRidDNtYmlzdWhldnQ6MWtJUzVkeVR2akUwX3JxYUEzWWVBaDBiVVhVbXhXMTE=",
  },

  _locale: function (storage) {
    return storage && typeof storage.language === "string" && storage.language
      ? storage.language
      : "en-US";
  },

  _audio: function (storage) {
    return storage &&
      storage.account &&
      typeof storage.account.audio === "string"
      ? storage.account.audio
      : "";
  },

  _parseResponse: function (response, responseType) {
    if (!response.ok) {
      return response.text().then(function (txt) {
        var err = new Error("HTTP " + response.status);
        err.status = response.status;
        err.body = txt;
        throw err;
      });
    }
    if (responseType === "null") {
      return Promise.resolve(null);
    }
    if (responseType === "text") {
      return response.text();
    }
    return response.text().then(function (txt) {
      if (!txt) return {};
      try {
        return JSON.parse(txt);
      } catch (e) {
        throw e;
      }
    });
  },

  _authedRequest: function (request, buildSpec, isRetry) {
    return session.refresh({
      success: function (storage) {
        var spec;
        try {
          spec = buildSpec(storage);
        } catch (err) {
          request && request.error && request.error(err);
          return;
        }
        var headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append(
          "Content-Type",
          spec.contentType || "application/x-www-form-urlencoded"
        );
        var fetchOpts = {
          method: spec.method || "GET",
          headers: headers,
        };
        if (spec.body !== undefined) {
          fetchOpts.body = spec.body;
        }
        if (spec.keepalive) {
          fetchOpts.keepalive = true;
        }
        fetch(spec.url, fetchOpts)
          .then(function (response) {
            if (
              response.status === 401 &&
              !isRetry &&
              typeof session !== "undefined" &&
              session.storage &&
              session.storage.refresh_token
            ) {
              session.storage.expires_in = 0;
              service._authedRequest(request, buildSpec, true);
              return "__CR_RETRYING__";
            }
            return service._parseResponse(response, spec.responseType || "json");
          })
          .then(function (data) {
            if (data === "__CR_RETRYING__") return;
            request && request.success && request.success(data);
          })
          .catch(function (error) {
            request && request.error && request.error(error);
          });
      },
      error: function (error) {
        request && request.error && request.error(error);
      },
    });
  },

  _cookieRequest: function (request, buildUrl, isRetry) {
    return session.cookies({
      success: function (storage) {
        var url;
        try {
          url = buildUrl(storage);
        } catch (err) {
          request && request.error && request.error(err);
          return;
        }
        var headers = new Headers();
        headers.append("Content-Type", "application/x-www-form-urlencoded");
        fetch(url, { headers: headers })
          .then(function (response) {
            if (
              (response.status === 401 || response.status === 403) &&
              !isRetry &&
              typeof session !== "undefined" &&
              session.storage &&
              session.storage.cookies
            ) {
              session.storage.cookies.expires = 0;
              service._cookieRequest(request, buildUrl, true);
              return "__CR_RETRYING__";
            }
            return service._parseResponse(response, "json");
          })
          .then(function (json) {
            if (json === "__CR_RETRYING__") return;
            request && request.success && request.success(json);
          })
          .catch(function (error) {
            request && request.error && request.error(error);
          });
      },
      error: function (error) {
        request && request.error && request.error(error);
      },
    });
  },

  token: function (request) {
    var headers = new Headers();
    headers.append("Authorization", service.api.auth);
    headers.append("Content-Type", "application/x-www-form-urlencoded");

    var params = service.format({
      username: request.data.username,
      password: request.data.password,
      grant_type: "password",
      scope: "offline_access",
    });

    fetch(`${service.api.url}/auth/v1/token`, {
      method: "POST",
      headers: headers,
      body: params,
    })
      .then((response) =>
        response.json().then((json) => {
          if (!response.ok || !json || !json.access_token) {
            throw json || new Error(`HTTP ${response.status}`);
          }
          return json;
        })
      )
      .then((json) => request.success && request.success(json))
      .catch((error) => {
        console.log(error);
        request.error && request.error(error);
      });
  },

  refresh: function (request) {
    var headers = new Headers();
    headers.append("Authorization", service.api.auth);
    headers.append("Content-Type", "application/x-www-form-urlencoded");

    var hasProfile = Boolean(
      session.storage &&
        session.storage.profile_id &&
        typeof session.storage.profile_id === "string"
    );
    var payload = {
      refresh_token:
        (request && request.data && request.data.refresh_token) ||
        session.storage.refresh_token,
      grant_type: hasProfile ? "refresh_token_profile_id" : "refresh_token",
      scope: "offline_access",
    };
    if (hasProfile) {
      payload.profile_id = session.storage.profile_id;
    }

    var params = service.format(payload);

    fetch(`${service.api.url}/auth/v1/token`, {
      method: "POST",
      headers: headers,
      body: params,
    })
      .then((response) =>
        response.json().then((json) => {
          if (!response.ok || !json || !json.access_token) {
            throw json || new Error(`HTTP ${response.status}`);
          }
          return json;
        })
      )
      .then((json) => request.success && request.success(json))
      .catch((error) => request.error && request.error(error));
  },

  profile: function (request) {
    return service._authedRequest(request, function () {
      return {
        url: `${service.api.url}/accounts/v1/me/profile`,
      };
    });
  },

  profiles: function (request) {
    return service._authedRequest(request, function () {
      return {
        url: `${service.api.url}/accounts/v1/me/multiprofile`,
      };
    });
  },

  setProfile: function (request) {
    return service._authedRequest(request, function () {
      return {
        url: `${service.api.url}/accounts/v1/me/profile`,
        method: "PATCH",
        contentType: "application/json",
        body: JSON.stringify(request.data),
        responseType: "null",
      };
    });
  },

  switchProfile: function (request, profile_id) {
    return session.refresh({
      success: function (storage) {
        var headers = new Headers();
        headers.append("Authorization", service.api.auth);
        headers.append("Content-Type", "application/x-www-form-urlencoded");

        const params = service.format({
          refresh_token: storage.refresh_token,
          grant_type: "refresh_token_profile_id",
          profile_id,
          scope: "offline_access",
        });

        fetch(`${service.api.url}/auth/v1/token`, {
          method: "POST",
          headers: headers,
          body: params,
        })
          .then((response) =>
            response.json().then((json) => {
              if (!response.ok || !json || !json.access_token) {
                throw json || new Error(`HTTP ${response.status}`);
              }
              return json;
            })
          )
          .then((json) => {
            return request.success && request.success(json);
          })
          .catch((error) => request.error && request.error(error));
      },
      error: function (error) {
        request.error && request.error(error);
      },
    });
  },

  cookies: function (request) {
    return service._authedRequest(request, function () {
      return {
        url: `${service.api.url}/index/v2`,
      };
    });
  },

  home: function (request) {
    return service._authedRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return {
        url: `${service.api.url}/content/v2/discover/${storage.id}/home_feed?start=0&n=100&ratings=true&preferred_audio_language=${audio}&locale=${locale}`,
      };
    });
  },

  continue: function (request) {
    return service._authedRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return {
        url: `${service.api.url}/content/v2/discover/up_next/${request.data.ids}?ratings=true&locale=${locale}&preferred_audio_language=${audio}`,
      };
    });
  },

  playheads: function (request) {
    return service._authedRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return {
        url: `${service.api.url}/content/v2/${storage.id}/playheads?content_ids=${request.data.ids}&preferred_audio_language=${audio}&locale=${locale}`,
      };
    });
  },

  seasons: function (request) {
    return service._cookieRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return `${service.api.url}/cms/v2${storage.cookies.bucket}/seasons?series_id=${request.data.id}&preferred_audio_language=${audio}&locale=${locale}&Signature=${storage.cookies.signature}&Policy=${storage.cookies.policy}&Key-Pair-Id=${storage.cookies.key_pair_id}`;
    });
  },

  episodes: function (request) {
    return service._cookieRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return `${service.api.url}/cms/v2${storage.cookies.bucket}/episodes?season_id=${request.data.id}&preferred_audio_language=${audio}&locale=${locale}&Signature=${storage.cookies.signature}&Policy=${storage.cookies.policy}&Key-Pair-Id=${storage.cookies.key_pair_id}`;
    });
  },

  video_v2: function (request) {
    return service._authedRequest(request, function () {
      return {
        url: `${service.api.drm}/v1/${request.data.id}/tv/samsung/play`,
      };
    });
  },

  video: function (request) {
    return service._cookieRequest(request, function (storage) {
      return `${service.api.url}/cms/v2${storage.cookies.bucket}/videos/${request.data.id}/streams?Signature=${storage.cookies.signature}&Policy=${storage.cookies.policy}&Key-Pair-Id=${storage.cookies.key_pair_id}`;
    });
  },

  search: function (request) {
    return service._authedRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return {
        url: `${service.api.url}/content/v2/discover/search?q=${encodeURIComponent(request.data.query)}&type=series,movie_listing&n=100&ratings=true&preferred_audio_language=${audio}&locale=${locale}`,
      };
    });
  },

  seriesInfo: function (request) {
    return service._authedRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return {
        url: `${service.api.url}/content/v2/cms/objects/${request.data.id}?ratings=true&preferred_audio_language=${audio}&locale=${locale}`,
      };
    });
  },

  cmsObjects: function (request) {
    var rawIds = request && request.data && request.data.ids;
    var idsList = Array.isArray(rawIds)
      ? rawIds.filter(Boolean)
      : String(rawIds || "")
          .split(",")
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean);
    if (!idsList.length) {
      request && request.success && request.success({ data: [] });
      return;
    }
    return service._authedRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      var encodedIds = idsList
        .map(function (id) {
          return encodeURIComponent(id);
        })
        .join(",");
      return {
        url: `${service.api.url}/content/v2/cms/objects/${encodedIds}?ratings=true&preferred_audio_language=${audio}&locale=${locale}`,
      };
    });
  },

  history: function (request) {
    return service._authedRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return {
        url: `${service.api.url}/content/v2/${storage.id}/watch-history?page_size=100&ratings=true&preferred_audio_language=${audio}&locale=${locale}`,
      };
    });
  },

  setHistory: function (request) {
    return service._authedRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return {
        url: `${service.api.url}/content/v2/${storage.id}/playheads?preferred_audio_language=${audio}&locale=${locale}`,
        method: "POST",
        contentType: "application/json",
        body: JSON.stringify(request.data),
        responseType: "text",
      };
    });
  },

  deleteHistoryItem: function (request) {
    return service._authedRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return {
        url: `${service.api.url}/content/v2/${storage.id}/watch-history/${request.data.content_id}?preferred_audio_language=${audio}&locale=${locale}`,
        method: "DELETE",
        contentType: "application/json",
        responseType: "text",
      };
    });
  },

  clearHistory: function (request) {
    return service._authedRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return {
        url: `${service.api.url}/content/v2/${storage.id}/watch-history?preferred_audio_language=${audio}&locale=${locale}`,
        method: "DELETE",
        contentType: "application/json",
        responseType: "text",
      };
    });
  },

  languages: function (request) {
    fetch(
      `${service.api.static}/config/i18n/v3/${
        request.data.type === "subtitle"
          ? "timed_text_languages.json"
          : "audio_languages.json"
      }`
    )
      .then((response) => service._parseResponse(response, "json"))
      .then((json) => request.success && request.success(json))
      .catch((error) => request.error && request.error(error));
  },

  intro: function (request) {
    fetch(
      `${service.api.static}/skip-events/production/${request.data.id}.json`
    )
      .then((response) => service._parseResponse(response, "json"))
      .then((json) => request.success && request.success(json))
      .catch((error) => request.error && request.error(error));
  },

  categories: function (request) {
    return service._authedRequest(request, function (storage) {
      var locale = encodeURIComponent(service._locale(storage));
      return {
        url: `${service.api.url}/content/v1/tenant_categories?include_subcategories=true&locale=${locale}`,
      };
    });
  },

  getCustomLists: function (request) {
    return service._authedRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return {
        url: `${service.api.url}/content/v2/${storage.id}/custom-lists?preferred_audio_language=${audio}&locale=${locale}`,
        contentType: "application/json",
      };
    });
  },

  getCustomListItems: function (request) {
    return service._authedRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return {
        url: `${service.api.url}/content/v2/${storage.id}/custom-lists/${request.data}?ratings=true&preferred_audio_language=${audio}&locale=${locale}`,
        contentType: "application/json",
      };
    });
  },

  createCustomList: function (request) {
    return service._authedRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return {
        url: `${service.api.url}/content/v2/${storage.id}/custom-lists?preferred_audio_language=${audio}&locale=${locale}`,
        method: "POST",
        contentType: "application/json",
        body: JSON.stringify({ title: request.data.title }),
      };
    });
  },

  addCustomListItem: function (request) {
    return service._authedRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return {
        url: `${service.api.url}/content/v2/${storage.id}/custom-lists/${request.data.list_id}?preferred_audio_language=${audio}&locale=${locale}`,
        method: "POST",
        contentType: "application/json",
        body: JSON.stringify({ content_id: request.data.content_id }),
        responseType: "text",
      };
    });
  },

  removeCustomListItem: function (request) {
    return service._authedRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return {
        url: `${service.api.url}/content/v2/${storage.id}/custom-lists/${request.data.list_id}/${request.data.content_id}?preferred_audio_language=${audio}&locale=${locale}`,
        method: "DELETE",
        contentType: "application/json",
        responseType: "text",
      };
    });
  },

  deleteCustomList: function (request) {
    return service._authedRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return {
        url: `${service.api.url}/content/v2/${storage.id}/custom-lists/${request.data.list_id}?preferred_audio_language=${audio}&locale=${locale}`,
        method: "DELETE",
        contentType: "application/json",
        responseType: "text",
      };
    });
  },

  renameCustomList: function (request) {
    return service._authedRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return {
        url: `${service.api.url}/content/v2/${storage.id}/custom-lists/${request.data.list_id}?preferred_audio_language=${audio}&locale=${locale}`,
        method: "PATCH",
        contentType: "application/json",
        body: JSON.stringify({ title: request.data.title }),
        responseType: "text",
      };
    });
  },

  getWatchList: function (request) {
    return service._authedRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return {
        url: `${service.api.url}/content/v2/discover/${storage.id}/watchlist?order=desc&n=1000&ratings=true&preferred_audio_language=${audio}&locale=${locale}`,
        contentType: "application/json",
      };
    });
  },

  inWatchList: function (request) {
    return service._authedRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return {
        url: `${service.api.url}/content/v2/${storage.id}/watchlist?content_ids=${request.data}&preferred_audio_language=${audio}&locale=${locale}`,
        contentType: "application/json",
      };
    });
  },

  addWatchlist: function (request) {
    return service._authedRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return {
        url: `${service.api.url}/content/v2/${storage.id}/watchlist?preferred_audio_language=${audio}&locale=${locale}`,
        method: "POST",
        contentType: "application/json",
        body: JSON.stringify(request.data),
        responseType: "text",
      };
    });
  },

  removeWatchlist: function (request) {
    return service._authedRequest(request, function (storage) {
      var audio = encodeURIComponent(service._audio(storage));
      var locale = encodeURIComponent(service._locale(storage));
      return {
        url: `${service.api.url}/content/v2/${storage.id}/watchlist/${request.data.content_id}?preferred_audio_language=${audio}&locale=${locale}`,
        method: "DELETE",
        contentType: "application/json",
        responseType: "text",
      };
    });
  },

  format: function (params) {
    return Object.keys(params)
      .map(function (k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
      })
      .join("&");
  },
};
