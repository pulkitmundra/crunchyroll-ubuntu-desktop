window.player = {
  drmLock: false,
  states: {
    STOPPED: 0,
    PLAYING: 1,
    PAUSED: 2,
    FORWARD: 3,
    REWIND: 4,
  },
  values: {
    forward_rewind: 0,
  },
  timers: {
    forward_rewind: NaN,
  },
  state: -1,
  plugin: NaN,
  video: NaN,
  duration: 0,
  levelId: -1,
  playhead: null,

  getVideo: function () {
    player.video = document.getElementById("videoplayer");
    if (!player.video) {
      var newVideo = document.createElement("video");
      newVideo.id = "videoplayer";
      newVideo.style.height = "100%";
      newVideo.style.width = "100%";
      if (
        typeof video !== "undefined" &&
        video.aspects &&
        video.aspects[video.aspect]
      ) {
        newVideo.style.objectFit = video.aspects[video.aspect];
      }

      $("#video-screen .content").prepend(newVideo);
      player.video = newVideo;
    }
    return player.video;
  },

  deleteVideo: function () {
    player.video = document.getElementById("videoplayer");
    if (player.video && player.video.parentNode) {
      player.video.parentNode.removeChild(player.video);
    }
  },

  config: function (timeFunction, endFunction) {
    player.deleteVideo();
    var v = player.getVideo();
    try {
      var savedVol = parseFloat(localStorage.getItem("cr_volume"));
      if (!isNaN(savedVol) && savedVol >= 0 && savedVol <= 1) {
        v.volume = savedVol;
      }
      var savedMuted = localStorage.getItem("cr_muted");
      if (savedMuted === "true") {
        v.muted = true;
      }
    } catch (e) {}
    v.addEventListener("timeupdate", timeFunction);
    v.addEventListener("ended", endFunction);
    v.addEventListener("waiting", player.onbufferingstart);
    v.addEventListener("playing", player.onbufferingcomplete);
    v.addEventListener("volumechange", function () {
      if (typeof video !== "undefined" && typeof video.syncVolumeUI === "function") {
        video.syncVolumeUI();
      }
    });
    v.addEventListener("seeked", function () {
      if (player.getVideo().paused) {
        video.showBTN("pause");
      } else {
        video.hideBTN();
      }
    });
    //player.getVideo().addEventListener("play", player.onPlay);
  },

  getPlayed: function () {
    return player.getVideo().currentTime;
  },

  getDuration: function () {
    return player.getVideo().duration;
  },

  // esto debe ejecutarse despues de el video_v2
  deleteSession: function (callback) {
    session.refresh({
      success: function (storage) {
        var headers = new Headers();
        headers.append("Authorization", `Bearer ${storage.access_token}`);
        headers.append("Content-Type", "application/x-www-form-urlencoded");
        fetch(
          `${service.api.drm}/v1/token/${callback.data.id}/${callback.data.token}`,
          {
            method: "DELETE",
            headers: headers,
          }
        )
          .then((response) => {
            return true;
          })
          .then((json) => {
            player.drmLock = false;
            callback.success && callback.success();
          })
          .catch((error) => callback.error && callback.error(error));
      },
    });
  },

  play: function (drm, url, playhead, noplay) {
    if (player.plugin && typeof player.plugin.reset === "function") {
      try {
        player.plugin.reset();
      } catch (e) {}
    }
    player.config(video.setPlayingTime, video.end);
    session.refresh({
      success: function (storage) {
        player.plugin = dashjs.MediaPlayer().create();
        player.plugin.extend(
          "RequestModifier",
          () => {
            return {
              modifyRequestHeader: (xhr) => {
                xhr.setRequestHeader(
                  "Authorization",
                  "Bearer " + storage.access_token
                );
                return xhr;
              },
            };
          },
          true
        );

        if (session.storage.quality !== "auto") {
          player.plugin.updateSettings({
            streaming: {
              abr: { autoSwitchBitrate: { video: false } },
            },
          });
        }

        player.plugin.initialize(player.getVideo(), url, true);

        var drmConfig = {
          "com.widevine.alpha": {
            priority: 1,
            serverURL:
              "https://cr-license-proxy.prd.crunchyrollsvc.com/v1/license/widevine",
            httpRequestHeaders: {
              "X-Cr-Content-Id": drm.id,
              "X-Cr-Video-Token": drm.token,
            },
            serverCertificate:
              "CrsCCAMSEKDc0WAwLAQT1SB2ogyBJEwYv4Tx7gUijgIwggEKAoIBAQC8Xc/GTRwZDtlnBThq8V382D1oJAM0F/YgCQtNDLz7vTWJ+QskNGi5Dd2qzO4s48Cnx5BLvL4H0xCRSw2Ed6ekHSdrRUwyoYOE+M/t1oIbccwlTQ7o+BpV1X6TB7fxFyx1jsBtRsBWphU65w121zqmSiwzZzJ4xsXVQCJpQnNI61gzHO42XZOMuxytMm0F6puNHTTqhyY3Z290YqvSDdOB+UY5QJuXJgjhvOUD9+oaLlvT+vwmV2/NJWxKqHBKdL9JqvOnNiQUF0hDI7Wf8Wb63RYSXKE27Ky31hKgx1wuq7TTWkA+kHnJTUrTEfQxfPR4dJTquE+IDLAi5yeVVxzbAgMBAAE6DGNhc3RsYWJzLmNvbUABEoADMmGXpXg/0qxUuwokpsqVIHZrJfu62ar+BF8UVUKdK5oYQoiTZd9OzK3kr29kqGGk3lSgM0/p499p/FUL8oHHzgsJ7Hajdsyzn0Vs3+VysAgaJAkXZ+k+N6Ka0WBiZlCtcunVJDiHQbz1sF9GvcePUUi2fM/h7hyskG5ZLAyJMzTvgnV3D8/I5Y6mCFBPb/+/Ri+9bEvquPF3Ff9ip3yEHu9mcQeEYCeGe9zR/27eI5MATX39gYtCnn7dDXVxo4/rCYK0A4VemC3HRai2X3pSGcsKY7+6we7h4IycjqtuGtYg8AbaigovcoURAZcr1d/G0rpREjLdVLG0Gjqk63Gx688W5gh3TKemsK3R1jV0dOfj3e6uV/kTpsNRL9KsD0v7ysBQVdUXEbJotcFz71tI5qc3jwr6GjYIPA3VzusD17PN6AGQniMwxJV12z/EgnUopcFB13osydpD2AaDsgWo5RWJcNf+fzCgtUQx/0Au9+xVm5LQBdv8Ja4f2oiHN3dw",
            audioRobustness: "SW_SECURE_CRYPTO",
            videoRobustness: "SW_SECURE_CRYPTO",
            sessionType: "temporary",
          },
        };

        player.plugin.setProtectionData(drmConfig);

        player.plugin.registerLicenseRequestFilter(function (request) {
          request.headers["Content-Type"] = "application/octet-stream";
          request.headers["Authorization"] = "Bearer " + storage.access_token;
        });

        player.plugin.registerLicenseResponseFilter(function (response) {
          var responseDataUint8Array = new Uint8Array(response.data);
          var decodedString = new TextDecoder("utf-8").decode(
            responseDataUint8Array
          );
          var licenseObject = JSON.parse(decodedString);
          var binaryLicenseString = atob(licenseObject.license);
          var binaryLicenseUint8Array = new Uint8Array(
            binaryLicenseString.length
          );
          for (var i = 0; i < binaryLicenseString.length; i++) {
            binaryLicenseUint8Array[i] = binaryLicenseString.charCodeAt(i);
          }
          response.data = binaryLicenseUint8Array.buffer;
          player.drmLock = true;
        });

        player.noplay = noplay;
        player.playhead = playhead && playhead > 0 ? playhead * 60 : null;
      },
    });
  },

  pause: function () {
    player.getVideo().pause();
    player.state = player.states.PAUSED;
    video.showBTN("pause");
  },

  resume: function () {
    player.getVideo().play();
    video.hideBTN();
    player.state = player.states.PLAYING;
  },

  playPause: function () {
    if (player.getVideo().paused) {
      player.resume();
    } else {
      player.pause();
    }
  },

  seekBy: function (deltaSeconds, callback) {
    var v = player.getVideo();
    if (!v) return;
    var dur = player.getDuration();
    if (!dur || isNaN(dur)) return;
    clearTimeout(player.timers.forward_rewind);
    player.values.forward_rewind = 0;
    var target = Math.max(0, Math.min(dur - 0.5, (v.currentTime || 0) + deltaSeconds));
    v.currentTime = target;
    video.showBTN(deltaSeconds < 0 ? "rewind" : "forward");
    if (typeof callback === "function") {
      callback(0);
    }
    player.timers.forward_rewind = setTimeout(function () {
      if (v.paused) {
        video.showBTN("pause");
      } else {
        video.hideBTN();
      }
    }, 350);
  },

  rewind: function (callback, seconds) {
    player.seekBy(-(seconds || 10), callback);
  },

  forward: function (callback, seconds) {
    player.seekBy(seconds || 10, callback);
  },

  forwardTo: function (seconds) {
    player.getVideo().currentTime = seconds;
  },

  setVolume: function (vol) {
    var v = player.getVideo();
    if (!v) return 1;
    var clamped = Math.max(0, Math.min(1, vol));
    v.volume = clamped;
    if (clamped > 0 && v.muted) {
      v.muted = false;
    }
    try {
      localStorage.setItem("cr_volume", String(clamped));
      localStorage.setItem("cr_muted", String(v.muted));
    } catch (e) {}
    if (typeof video !== "undefined" && typeof video.syncVolumeUI === "function") {
      video.syncVolumeUI(true);
    }
    return clamped;
  },

  adjustVolume: function (delta) {
    var v = player.getVideo();
    if (!v) return 1;
    var base = v.muted ? 0 : v.volume;
    return player.setVolume(Math.round((base + delta) * 20) / 20);
  },

  toggleMute: function () {
    var v = player.getVideo();
    if (!v) return false;
    v.muted = !v.muted;
    if (!v.muted && v.volume === 0) {
      v.volume = 0.5;
    }
    try {
      localStorage.setItem("cr_muted", String(v.muted));
      localStorage.setItem("cr_volume", String(v.volume));
    } catch (e) {}
    if (typeof video !== "undefined" && typeof video.syncVolumeUI === "function") {
      video.syncVolumeUI(true);
    }
    return v.muted;
  },

  getQuality: function () {
    if (!player.plugin || typeof player.plugin.getBitrateInfoListFor !== "function") {
      return -1;
    }
    var qualities = player.plugin.getBitrateInfoListFor("video") || [];
    if (!qualities.length) return -1;
    var targetHeight = Number(session.storage.quality);
    if (!targetHeight) return -1;
    var exactIdx = qualities.findIndex((q) => q && q.height === targetHeight);
    if (exactIdx >= 0) return exactIdx;
    var bestIdx = -1;
    var bestHeight = -1;
    for (var i = 0; i < qualities.length; i++) {
      var h = qualities[i] && qualities[i].height ? qualities[i].height : 0;
      if (h <= targetHeight && h > bestHeight) {
        bestHeight = h;
        bestIdx = i;
      }
    }
    return bestIdx >= 0 ? bestIdx : 0;
  },

  stop: function () {
    if (player.state != player.states.STOPPED) {
      player.getVideo().pause();
      if (player.plugin && typeof player.plugin.reset === "function") {
        try {
          player.plugin.reset();
        } catch (e) {}
      }
      player.plugin = NaN;
      player.video = NaN;
      player.STOP_CALLBACK && player.STOP_CALLBACK();
      player.state = player.states.STOPPED;
    }
  },

  speed: function (rate) {
    player.getVideo().playbackRate = rate;
  },

  destroy: function () {
    player.stop();
  },

  onbufferingstart: function () {
    video.showBTN("loading");
  },

  onbufferingcomplete: function () {
    if (
      session.storage.quality !== "auto" &&
      player.plugin &&
      typeof player.plugin.setQualityFor === "function"
    ) {
      var qIdx = player.getQuality();
      if (qIdx >= 0) {
        player.plugin.setQualityFor("video", qIdx);
      }
    }

    if (typeof video !== "undefined" && video.speed && video.speed.active) {
      player.getVideo().playbackRate = video.speed.active;
    }

    if (typeof video !== "undefined" && typeof video.syncVolumeUI === "function") {
      video.syncVolumeUI();
    }

    if (player.playhead) {
      player.getVideo().currentTime = player.playhead;
      player.playhead = null;
    }

    if (player.noplay) {
      player.noplay = null;
      player.pause();
    } else if (!player.getVideo().paused || player.state !== player.states.PAUSED) {
      player.getVideo().play();
      player.state = player.states.PLAYING;
      video.hideBTN();
    }
  },

  oncurrentplaytime: function (currentTime) {
    video.setPlayingTime(currentTime);
  },

  onstreamcompleted: function () {
    console.log("onstreamcompleted");
    app.stop();
  },

  onevent: function (eventType, eventData) {
    console.log("onevent " + eventType + " - " + eventData);
  },

  onerror: function (eventType) {
    console.log("onerror " + eventType);
  },

  ondrmevent: function (drmEvent, drmData) {
    console.log("ondrmevent " + drmEvent + " - " + drmData);
  },

  onsubtitlechange: function (duration, text, type, attriCount, attributes) {
    console.log("onsubtitlechange");
  },
};
