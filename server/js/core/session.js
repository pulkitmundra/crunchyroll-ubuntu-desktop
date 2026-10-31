window.session = {
  languages: {
    audios: {},
    subtitles: {},
  },
  storage: {
    version: "v2.0.0",
    language: NaN,
    quality: "auto",
    account: {
      username: NaN,
      avatar: "0001-cr-white-orange.png",
      premium: false,
      language: NaN,
      audio: NaN,
    },
    profiles: [],
    cookies: {
      bucket: NaN,
      policy: NaN,
      signature: NaN,
      key_pair_id: NaN,
      expires: NaN,
    },
    profile_id: NaN,
    id: NaN,
    country: NaN,
    token_type: NaN,
    access_token: NaN,
    expires_in: NaN,
    refresh_token: NaN,
  },

  init: function () {
    service.languages({
      data: { type: "audio" },
      success: function (response) {
        session.languages.audios = response;
        session.languages.audios["ja-JP"] = "Japanese";
      },
      error: function (error) {
        console.log(error);
      },
    });

    service.languages({
      data: { type: "subtitle" },
      success: function (response) {
        session.languages.subtitles = response;
        session.languages.subtitles["Disabled"] = "Disabled";
      },
      error: function (error) {
        console.log(error);
      },
    });

    var storage = localStorage.getItem("session");
    if (storage) {
      try {
        storage = JSON.parse(storage);
        session.storage = storage || session.storage;
        if (session.storage && session.storage.account && "password" in session.storage.account) {
          delete session.storage.account.password;
        }
      } catch (error) {
        console.log("error parse session.");
      }
    }
    session.storage.version = "v2.0.0";

    session.update();
  },

  start: function (username, password, callback) {
    service.token({
      data: {
        password: password,
        username: username,
      },
      success: function (response) {
        if (!response || !response.access_token) {
          session.clear();
          return callback && callback.error && callback.error(response);
        }
        session.storage.expires_in = new Date().setSeconds(
          new Date().getSeconds() + response.expires_in,
        );
        session.storage.id = response.account_id;
        session.storage.account.username = username;
        if ("password" in session.storage.account) {
          delete session.storage.account.password;
        }
        session.storage.country = response.country;
        session.storage.token_type = response.token_type;
        session.storage.access_token = response.access_token;
        session.storage.refresh_token = response.refresh_token;

        //session.loadAccountInfo();
        return callback.success(session.update());
      },
      error: function (error) {
        session.clear();
        return callback.error(error);
      },
    });
  },

  _refreshing: false,
  _refreshQueue: [],
  _fetchingCookies: false,
  _cookiesQueue: [],

  refresh: function (callback) {
    if (session.isExpired()) {
      session._refreshQueue.push(callback);
      if (session._refreshing) {
        return;
      }
      session._refreshing = true;
      service.refresh({
        data: {
          refresh_token: session.storage.refresh_token,
        },
        success: function (response) {
          session._refreshing = false;
          var queue = session._refreshQueue.slice();
          session._refreshQueue = [];
          if (!response || !response.access_token) {
            queue.forEach(function (cb) {
              cb && cb.error && cb.error(response);
            });
            return;
          }
          session.storage.expires_in = new Date().setSeconds(
            new Date().getSeconds() + response.expires_in,
          );
          session.storage.id = response.account_id;
          if (response.profile_id) {
            session.storage.profile_id = response.profile_id;
          }
          session.storage.country = response.country;
          session.storage.token_type = response.token_type;
          session.storage.access_token = response.access_token;
          session.storage.refresh_token = response.refresh_token;

          var updated = session.update();
          queue.forEach(function (cb) {
            cb && cb.success && cb.success(updated);
          });
        },
        error: function (error) {
          session._refreshing = false;
          var queue = session._refreshQueue.slice();
          session._refreshQueue = [];
          queue.forEach(function (cb) {
            cb && cb.error && cb.error(error);
          });
        },
      });
      return;
    }
    callback && callback.success && callback.success(session.storage);
  },

  cookies: function (callback) {
    if (session.isExpired(true)) {
      session._cookiesQueue.push(callback);
      if (session._fetchingCookies) {
        return;
      }
      session._fetchingCookies = true;
      service.cookies({
        success: function (response) {
          session._fetchingCookies = false;
          var queue = session._cookiesQueue.slice();
          session._cookiesQueue = [];
          if (response && response.cms) {
            session.storage.cookies.bucket = response.cms.bucket;
            session.storage.account.premium =
              session.storage.cookies.bucket.includes("crunchyroll");
            session.storage.cookies.policy = response.cms.policy;
            session.storage.cookies.signature = response.cms.signature;
            session.storage.cookies.key_pair_id = response.cms.key_pair_id;
            session.storage.cookies.expires = new Date(
              response.cms.expires,
            ).getTime();
          }

          var updated = session.update();
          queue.forEach(function (cb) {
            cb && cb.success && cb.success(updated);
          });
        },
        error: function (error) {
          session._fetchingCookies = false;
          var queue = session._cookiesQueue.slice();
          session._cookiesQueue = [];
          queue.forEach(function (cb) {
            cb && cb.error && cb.error(error);
          });
        },
      });
    } else {
      callback && callback.success && callback.success(session.storage);
    }
  },

  load_account: function (callback) {
    service.profile({
      success: function (response) {
        session.storage.account.audio =
          response.preferred_content_audio_language;
        session.storage.account.language =
          response.preferred_content_subtitle_language;
        session.storage.account.avatar = response.avatar;
        session.storage.account.mature = response.maturity_rating;
        session.storage.account.username = response.username;
        session.update();
        // load additional profiles
        session.load_profiles(callback);
      },
      error: callback.error,
    });

    session.cookies({
      success: function (response) {},
      error: function (error) {},
    });
  },

  load_profiles: function (callback) {
    try {
      service.profiles({
        success: function (response) {
          session.storage.profiles = (response && response.profiles) || [];
          session.update();
          callback && callback.success && callback.success();
        },
        error: function (error) {
          console.error("load_profiles", error);
          callback && callback.error && callback.error(error);
        },
      });

      session.cookies({
        success: function (response) {},
        error: function (error) {},
      });
    } catch (e) {
      console.error("load_profiles", e);
      callback && callback.error && callback.error(e);
    }
  },

  switch_profile: function (callback, profile_id) {
    return service.switchProfile(
      {
        success: (json) => {
          if (!json || !json.access_token) {
            return callback && callback.error && callback.error(json);
          }
          session.storage.expires_in = new Date().setSeconds(
            new Date().getSeconds() + json.expires_in,
          );
          session.storage.id = json.account_id;
          session.storage.profile_id = json.profile_id;
          session.storage.country = json.country;
          session.storage.token_type = json.token_type;
          session.storage.access_token = json.access_token;
          session.storage.refresh_token = json.refresh_token;
          session.update();

          // refresh profiles to set correct is_selected status
          service.profiles({
            success: (response) => {
              session.storage.profiles = (response && response.profiles) || [];

              session.storage.profiles.forEach((profile) => {
                if (profile.is_selected) {
                  session.storage.account.audio =
                    profile.preferred_content_audio_language;
                  session.storage.account.language =
                    profile.preferred_content_subtitle_language;
                  session.storage.account.avatar = profile.avatar;
                }
              });

              session.update();

              return callback.success(json);
            },
            error: (err) => {
              console.error(err);
              return callback.success(json);
            },
          });
        },
        error: callback.error,
      },
      profile_id,
    );
  },

  // return session token, if expires refresh, if doesn't exist returns undefined
  valid: function (callback) {
    if (session.storage && session.storage.access_token) {
      return session.refresh(callback);
    }
    return callback.error();
  },

  isExpired: function (coockie_type) {
    var expire_date = coockie_type
      ? session.storage.cookies.expires
      : session.storage.expires_in;
    return !(expire_date && expire_date >= new Date().getTime());
  },

  update: function () {
    localStorage.setItem("session", JSON.stringify(session.storage));
    return session.storage;
  },

  get_active_profile_name: function () {
    var profiles = session.storage.profiles;

    for (var i = 0; i < profiles.length; i++) {
      var is_selected = profiles[i].is_selected;
      var profile_name = profiles[i].profile_name;
      var username = profiles[i].username;

      if (is_selected) {
        return profile_name ? profile_name : username;
      }
    }

    return session.storage.account.username;
  },

  clear: function () {
    session.storage = {
      language: "en-US",
      quality: "auto",
      account: {
        username: NaN,
        mature: NaN,
        avatar: "0001-cr-white-orange.png",
        premium: false,
        language: "en-US",
        audio: "",
      },
      profiles: [],
      cookies: {
        bucket: NaN,
        policy: NaN,
        signature: NaN,
        key_pair_id: NaN,
        expires: NaN,
      },
      profile_id: NaN,
      id: NaN,
      country: NaN,
      token_type: NaN,
      access_token: NaN,
      expires_in: NaN,
      refresh_token: NaN,
    };
    session.update();
  },
};
