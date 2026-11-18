window.player = {
  drmLock: false,
  states: {
    STOPPED: 0,
    PLAYING: 1,
    PAUSED: 2,
    FORWARD: 3,
    REWIND: 4,
    BUFFERING: 5,
  },
  values: {
    forward_rewind: 0,
  },
  timers: {
    forward_rewind: NaN,
  },
  state: -1,
  plugin: null,
  video: null,
  duration: 0,
  levelId: -1,
  playhead: null,
  _playSeq: 0,
  _pausedAt: 0,
  _audioDeviceChanged: false,
  _systemResumed: false,
  _watchersBound: false,
  _rebindPromise: null,
  _audioWatchdogTimer: null,
  _deviceChangeTimers: [],
  _recoveryTimestamps: [],

  initDeviceWatchers: function () {
    if (player._watchersBound) return;
    player._watchersBound = true;

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.addEventListener === "function"
      ) {
        navigator.mediaDevices.addEventListener("devicechange", function () {
          player._audioDeviceChanged = true;
          while (player._deviceChangeTimers.length) {
            clearTimeout(player._deviceChangeTimers.pop());
          }
          if (
            player.state === player.states.PLAYING &&
            document.getElementById("video-screen")
          ) {
            var seq = player._playSeq;
            // Rebind once PipeWire registers the sink and once more after Bluetooth A2DP settles
            [450, 1500].forEach(function (delayMs) {
              var tid = setTimeout(function () {
                if (
                  seq !== player._playSeq ||
                  player.state !== player.states.PLAYING ||
                  !document.getElementById("video-screen")
                ) {
                  return;
                }
                var curV = player.getVideo();
                if (curV && !curV.paused) {
                  player.rebindAudioOutput(curV, true);
                }
              }, delayMs);
              player._deviceChangeTimers.push(tid);
            });
          }
        });
      }
    } catch (_) {}

    try {
      if (
        window.electronUtilsRender &&
        typeof window.electronUtilsRender.onSystemPowerEvent === "function"
      ) {
        window.electronUtilsRender.onSystemPowerEvent(function (eventType) {
          if (eventType === "suspend") {
            player._systemResumed = true;
            if (!player._pausedAt) {
              player._pausedAt = Date.now();
            }
            player._syncPowerSave(false);
          } else if (eventType === "resume") {
            player._systemResumed = true;
            player._audioDeviceChanged = true;
            if (
              typeof session !== "undefined" &&
              typeof session.isExpired === "function" &&
              session.isExpired() &&
              session.storage &&
              session.storage.refresh_token
            ) {
              session.refresh({
                success: function () {},
                error: function () {},
              });
            }
            if (
              player.state === player.states.PLAYING &&
              document.getElementById("video-screen")
            ) {
              player._triggerStreamRecovery("system-resume-playing", false);
            }
          }
        });
      }
    } catch (_) {}
  },

  _syncPowerSave: function (playing) {
    try {
      if (
        window.electronUtilsRender &&
        typeof window.electronUtilsRender.setPlaybackPowerSave === "function"
      ) {
        window.electronUtilsRender.setPlaybackPowerSave(Boolean(playing));
      }
    } catch (_) {}
  },

  _clearAudioWatchdog: function () {
    if (player._audioWatchdogTimer) {
      clearTimeout(player._audioWatchdogTimer);
      player._audioWatchdogTimer = null;
    }
  },

  rebindAudioOutput: function (v, microSeek) {
    var targetVideo = v || player.getVideo();
    if (!targetVideo) return Promise.resolve();
    if (player._rebindPromise) {
      return player._rebindPromise;
    }

    var doMicroSeek = function () {
      if (microSeek !== false && targetVideo.readyState >= 1) {
        try {
          var curT = targetVideo.currentTime;
          if (curT > 0.05 && !targetVideo.seeking) {
            targetVideo.currentTime = curT;
          }
        } catch (_) {}
      }
    };

    if (typeof targetVideo.setSinkId !== "function") {
      player._audioDeviceChanged = false;
      doMicroSeek();
      return Promise.resolve();
    }

    // In Chromium Blink, calling setSinkId("") when sinkId is already "" is a no-op.
    // Cycling through a concrete sinkId (e.g. "default") and back to "" forces
    // AudioRendererMixerManager to tear down any dead PulseAudio/PipeWire stream
    // and bind a fresh stream to PipeWire's current default output sink.
    player._rebindPromise = Promise.resolve()
      .then(function () {
        if (
          typeof navigator !== "undefined" &&
          navigator.mediaDevices &&
          typeof navigator.mediaDevices.enumerateDevices === "function"
        ) {
          return navigator.mediaDevices.enumerateDevices().catch(function () {
            return [];
          });
        }
        return [];
      })
      .then(function (devices) {
        var curSink = targetVideo.sinkId || "";
        var alt = null;
        if (Array.isArray(devices)) {
          for (var i = 0; i < devices.length; i++) {
            var d = devices[i];
            if (
              d &&
              d.kind === "audiooutput" &&
              d.deviceId &&
              d.deviceId !== curSink
            ) {
              if (d.deviceId === "default") {
                alt = "default";
                break;
              }
              if (!alt) alt = d.deviceId;
            }
          }
        }
        var chain = Promise.resolve();
        if (alt) {
          chain = chain.then(function () {
            return targetVideo.setSinkId(alt).catch(function () {});
          });
        }
        return chain.then(function () {
          return targetVideo.setSinkId("").catch(function () {});
        });
      })
      .then(function () {
        player._audioDeviceChanged = false;
        player._rebindPromise = null;
        doMicroSeek();
      })
      .catch(function () {
        player._audioDeviceChanged = false;
        player._rebindPromise = null;
        doMicroSeek();
      });

    return player._rebindPromise;
  },

  _triggerStreamRecovery: function (reason, keepPaused) {
    if (
      typeof video === "undefined" ||
      typeof video.recoverPlayback !== "function" ||
      !document.getElementById("video-screen") ||
      !video.episode
    ) {
      return false;
    }
    var now = Date.now();
    player._recoveryTimestamps = player._recoveryTimestamps.filter(function (ts) {
      return now - ts < 30000;
    });
    if (player._recoveryTimestamps.length >= 2) {
      console.warn("Stream recovery rate-limited:", reason);
      return false;
    }
    player._recoveryTimestamps.push(now);
    video.recoverPlayback(Boolean(keepPaused), reason);
    return true;
  },

  _startAudioHealthWatchdog: function (seq, isSecondPass) {
    player._clearAudioWatchdog();
    player._audioWatchdogTimer = setTimeout(function () {
      if (
        seq !== player._playSeq ||
        player.state !== player.states.PLAYING ||
        !document.getElementById("video-screen")
      ) {
        return;
      }
      var v = player.getVideo();
      if (
        !v ||
        v.paused ||
        v.muted ||
        v.volume === 0 ||
        v.readyState < 3 ||
        typeof v.webkitAudioDecodedByteCount !== "number"
      ) {
        return;
      }
      var t0 = v.currentTime;
      var a0 = v.webkitAudioDecodedByteCount;
      player._audioWatchdogTimer = setTimeout(function () {
        player._audioWatchdogTimer = null;
        if (
          seq !== player._playSeq ||
          player.state !== player.states.PLAYING ||
          !document.getElementById("video-screen")
        ) {
          return;
        }
        var curV = player.getVideo();
        if (!curV || curV.paused || curV.muted || curV.volume === 0) return;
        var dt = curV.currentTime - t0;
        var da = curV.webkitAudioDecodedByteCount - a0;
        if (dt > 0.6 && da <= 0) {
          if (!isSecondPass) {
            player.rebindAudioOutput(curV, true).then(function () {
              if (seq === player._playSeq && !curV.paused) {
                curV.play().catch(function () {});
                player._startAudioHealthWatchdog(seq, true);
              }
            });
          } else {
            player._triggerStreamRecovery("silent-audio-watchdog", false);
          }
        }
      }, 1600);
    }, 450);
  },

  getVideo: function () {
    player.video = document.getElementById("videoplayer");
    if (!player.video) {
      var container = document.querySelector("#video-screen .content");
      if (!container) {
        return null;
      }
      var newVideo = document.createElement("video");
      newVideo.id = "videoplayer";
      newVideo.style.height = "100%";
      newVideo.style.width = "100%";
      if (
        typeof video !== "undefined" &&
        video.aspects &&
        video.aspects[video.aspect]
      ) {
        newVideo.className = video.aspects[video.aspect];
      }

      container.prepend(newVideo);
      player.video = newVideo;
    } else if (
      typeof video !== "undefined" &&
      video.aspects &&
      video.aspects[video.aspect] &&
      !player.video.className
    ) {
      player.video.className = video.aspects[video.aspect];
    }
    return player.video;
  },

  deleteVideo: function () {
    player.video = document.getElementById("videoplayer");
    if (player.video && player.video.parentNode) {
      player.video.parentNode.removeChild(player.video);
    }
    player.video = null;
  },

  applySubtitlePrefs: function () {
    var prefs =
      typeof settings !== "undefined" &&
      typeof settings.getSubtitlePrefs === "function"
        ? settings.getSubtitlePrefs()
        : { size: "default", background: "shadow" };
    if (document.body) {
      document.body.setAttribute("data-sub-size", prefs.size || "default");
      document.body.setAttribute("data-sub-bg", prefs.background || "shadow");
    }
    var vs = document.getElementById("video-screen");
    if (vs) {
      vs.setAttribute("data-sub-size", prefs.size || "default");
      vs.setAttribute("data-sub-bg", prefs.background || "shadow");
    }
  },

  config: function (timeFunction, endFunction) {
    player.deleteVideo();
    var v = player.getVideo();
    if (!v) return;
    player.applySubtitlePrefs();
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
    v.addEventListener("error", function () {
      var curV = player.getVideo();
      if (!curV || !curV.error) return;
      player._triggerStreamRecovery(
        "video-element-error-" + curV.error.code,
        player.state === player.states.PAUSED
      );
    });
    v.addEventListener("volumechange", function () {
      if (typeof video !== "undefined" && typeof video.syncVolumeUI === "function") {
        video.syncVolumeUI();
      }
    });
    v.addEventListener("seeked", function () {
      var curV = player.getVideo();
      if (curV && curV.paused) {
        video.showBTN("pause");
      } else {
        video.hideBTN();
      }
      if (typeof video !== "undefined" && typeof video.syncMediaSessionPosition === "function") {
        video.syncMediaSessionPosition();
      }
    });
  },

  getPlayed: function () {
    var v = player.getVideo();
    if (v && v.currentTime > 0) {
      return v.currentTime;
    }
    if (typeof player.playhead === "number" && player.playhead > 0) {
      return player.playhead;
    }
    return 0;
  },

  getDuration: function () {
    var v = player.getVideo();
    return v ? v.duration || 0 : 0;
  },

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
            keepalive: true,
          }
        )
          .then(function () {
            player.drmLock = false;
            callback.success && callback.success();
          })
          .catch(function (error) {
            callback.error && callback.error(error);
          });
      },
      error: function (error) {
        callback.error && callback.error(error);
      },
    });
  },

  play: function (drm, url, playhead, noplay) {
    player.initDeviceWatchers();
    player._clearAudioWatchdog();
    var seq = ++player._playSeq;
    player._pausedAt = noplay ? Date.now() : 0;
    player._systemResumed = false;
    player._audioDeviceChanged = false;
    player.state = player.states.BUFFERING;
    if (player.plugin) {
      try {
        player.plugin.reset();
      } catch (_) {}
      player.plugin = null;
    }
    var startSeconds =
      playhead && Number(playhead) > 0 ? Number(playhead) * 60 : null;
    player.playhead = startSeconds;
    player.noplay = noplay;

    player.config(video.setPlayingTime, video.end);
    session.refresh({
      success: function (storage) {
        if (seq !== player._playSeq || !document.getElementById("video-screen")) {
          return;
        }
        var videoEl = player.getVideo();
        if (!videoEl) {
          return;
        }
        player.state = player.states.BUFFERING;
        player.plugin = dashjs.MediaPlayer().create();
        player.plugin.extend(
          "RequestModifier",
          function () {
            return {
              modifyRequestHeader: function (xhr) {
                var liveToken =
                  (typeof session !== "undefined" &&
                    session.storage &&
                    session.storage.access_token) ||
                  storage.access_token;
                if (liveToken) {
                  xhr.setRequestHeader("Authorization", "Bearer " + liveToken);
                }
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

        // Initialize view first without attaching source so Widevine DRM & filters
        // are armed before MPD download starts, then attachSource at exact startSeconds.
        player.plugin.initialize(videoEl, null, !noplay);

        if (
          typeof player.plugin.on === "function" &&
          typeof dashjs !== "undefined" &&
          dashjs.MediaPlayer &&
          dashjs.MediaPlayer.events
        ) {
          var evs = dashjs.MediaPlayer.events;
          var onQualityChange = function () {
            if (
              typeof video !== "undefined" &&
              typeof video.syncQualityUI === "function"
            ) {
              video.syncQualityUI();
            }
          };
          if (evs.QUALITY_CHANGE_RENDERED) {
            player.plugin.on(evs.QUALITY_CHANGE_RENDERED, onQualityChange);
          }
          if (evs.STREAM_INITIALIZED) {
            player.plugin.on(evs.STREAM_INITIALIZED, function () {
              if (
                session.storage.quality !== "auto" &&
                player.plugin &&
                typeof player.plugin.setQualityFor === "function"
              ) {
                var initQIdx = player.getQuality();
                if (
                  initQIdx >= 0 &&
                  (typeof player.plugin.getQualityFor !== "function" ||
                    player.plugin.getQualityFor("video") !== initQIdx)
                ) {
                  try {
                    player.plugin.setQualityFor("video", initQIdx, true);
                  } catch (e) {
                    player.plugin.setQualityFor("video", initQIdx);
                  }
                }
              }
              onQualityChange();
            });
          }
          if (evs.ERROR) {
            player.plugin.on(evs.ERROR, function (errEvt) {
              if (seq !== player._playSeq) return;
              var errCode =
                (errEvt && errEvt.error && errEvt.error.code) ||
                (errEvt && errEvt.error) ||
                "unknown";
              var isKeyOrNetErr = Boolean(
                errEvt &&
                  (errEvt.error === "key_session" ||
                    errEvt.error === "download" ||
                    errEvt.error === "manifestError" ||
                    errEvt.error === "mediasource" ||
                    (errEvt.error &&
                      typeof errEvt.error === "object" &&
                      (errEvt.error.code >= 20 ||
                        (errEvt.error.data &&
                          errEvt.error.data.response &&
                          (errEvt.error.data.response.status === 401 ||
                            errEvt.error.data.response.status === 403 ||
                            errEvt.error.data.response.status === 404 ||
                            errEvt.error.data.response.status === 410)))))
              );
              if (isKeyOrNetErr) {
                player._triggerStreamRecovery(
                  "dash-error-" + errCode,
                  player.state === player.states.PAUSED
                );
              }
            });
          }
        }

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
          var liveToken =
            (typeof session !== "undefined" &&
              session.storage &&
              session.storage.access_token) ||
            storage.access_token;
          request.headers["Authorization"] = "Bearer " + liveToken;
        });

        player.plugin.registerLicenseResponseFilter(function (response) {
          try {
            var responseDataUint8Array = new Uint8Array(response.data);
            var decodedString = new TextDecoder("utf-8").decode(
              responseDataUint8Array
            );
            var licenseObject = JSON.parse(decodedString);
            if (!licenseObject || !licenseObject.license) {
              throw new Error("Missing Widevine license payload");
            }
            var binaryLicenseString = atob(licenseObject.license);
            var binaryLicenseUint8Array = new Uint8Array(
              binaryLicenseString.length
            );
            for (var i = 0; i < binaryLicenseString.length; i++) {
              binaryLicenseUint8Array[i] = binaryLicenseString.charCodeAt(i);
            }
            response.data = binaryLicenseUint8Array.buffer;
            player.drmLock = true;
          } catch (err) {
            console.error("Widevine license error:", err);
            player._triggerStreamRecovery(
              "license-response-error",
              player.state === player.states.PAUSED
            );
          }
        });

        if (startSeconds && startSeconds > 0) {
          player.plugin.attachSource(url, startSeconds);
        } else {
          player.plugin.attachSource(url);
        }
      },
      error: function () {
        if (seq !== player._playSeq) return;
        player._triggerStreamRecovery("session-refresh-error", Boolean(noplay));
      },
    });
  },

  pause: function () {
    var v = player.getVideo();
    if (!v) return;
    player._clearAudioWatchdog();
    if (!player._pausedAt) {
      player._pausedAt = Date.now();
    }
    v.pause();
    player.state = player.states.PAUSED;
    player._syncPowerSave(false);
    video.showBTN("pause");
    if (
      typeof video !== "undefined" &&
      typeof video.saveHistory === "function" &&
      !player.playhead &&
      v.currentTime > 0
    ) {
      video.saveHistory(Math.floor(v.currentTime));
    }
    if (
      typeof video !== "undefined" &&
      typeof video.syncMediaSessionPosition === "function"
    ) {
      video.syncMediaSessionPosition();
    }
  },

  resume: function () {
    var v = player.getVideo();
    if (!v) return;
    var seq = player._playSeq;
    var now = Date.now();
    var pausedMs = player._pausedAt > 0 ? now - player._pausedAt : 0;
    var hadSystemResume = player._systemResumed;
    var hadDeviceChange = player._audioDeviceChanged;
    player._pausedAt = 0;

    // After system sleep/resume, video element error, or >= 10 minutes paused
    // (where DRM token was released on start and signed CDN URLs/keys may have expired),
    // mint a fresh stream session at the exact current second.
    if (hadSystemResume || pausedMs >= 600000 || v.error) {
      player._systemResumed = false;
      player._audioDeviceChanged = false;
      video.showBTN("loading");
      if (
        typeof video !== "undefined" &&
        typeof video.recoverPlayback === "function"
      ) {
        video.recoverPlayback(false, hadSystemResume ? "system-resume" : "long-pause");
        return;
      }
    }

    if (
      typeof session !== "undefined" &&
      typeof session.isExpired === "function" &&
      session.isExpired()
    ) {
      session.refresh({
        success: function () {},
        error: function () {},
      });
    }

    var startPlay = function () {
      if (seq !== player._playSeq) return;
      var curV = player.getVideo();
      if (!curV) return;
      var playPromise;
      try {
        playPromise = curV.play();
      } catch (err) {
        player._triggerStreamRecovery("play-throw", false);
        return;
      }
      video.hideBTN();
      player.state = player.states.PLAYING;
      player._syncPowerSave(true);
      if (
        typeof video !== "undefined" &&
        typeof video.syncMediaSessionPosition === "function"
      ) {
        video.syncMediaSessionPosition();
      }
      if (playPromise && typeof playPromise.then === "function") {
        playPromise
          .then(function () {
            if (seq === player._playSeq) {
              player._startAudioHealthWatchdog(seq, false);
            }
          })
          .catch(function (err) {
            if (seq !== player._playSeq) return;
            if (err && err.name === "AbortError") return;
            player._syncPowerSave(false);
            player._triggerStreamRecovery("play-rejected", false);
          });
      } else {
        player._startAudioHealthWatchdog(seq, false);
      }
    };

    // WirePlumber suspends idle PipeWire/Bluetooth sinks after ~5s of pause.
    // Rebind the HTMLMediaElement audio output sink after >= 5s pause or any device change.
    if (pausedMs >= 5000 || hadDeviceChange) {
      player
        .rebindAudioOutput(v, pausedMs >= 15000 || hadDeviceChange)
        .then(startPlay);
    } else {
      startPlay();
    }
  },

  playPause: function () {
    var v = player.getVideo();
    if (!v) return;
    if (v.paused) {
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
    if (typeof video !== "undefined" && typeof video.updateNextEpisodeCount === "function") {
      video.updateNextEpisodeCount(target);
    }
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

  forwardTo: function (seconds, allowEnd) {
    var v = player.getVideo();
    if (!v) return;
    var dur = player.getDuration();
    var target = Math.max(0, Number(seconds) || 0);
    if (!allowEnd && dur && !isNaN(dur) && dur > 1) {
      target = Math.min(dur - 0.5, target);
    }
    v.currentTime = target;
    if (typeof video !== "undefined" && typeof video.updateNextEpisodeCount === "function") {
      video.updateNextEpisodeCount(target);
    }
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

  setVideoQuality: function (qualityVal) {
    var val = String(qualityVal || "auto");
    if (typeof session !== "undefined" && session.storage) {
      session.storage.quality = val;
      if (typeof session.update === "function") {
        session.update();
      }
    }
    if (player.plugin && typeof player.plugin.updateSettings === "function") {
      if (val === "auto") {
        player.plugin.updateSettings({
          streaming: {
            abr: { autoSwitchBitrate: { video: true } },
          },
        });
      } else {
        player.plugin.updateSettings({
          streaming: {
            abr: { autoSwitchBitrate: { video: false } },
          },
        });
        var qIdx = player.getQuality();
        if (qIdx >= 0 && typeof player.plugin.setQualityFor === "function") {
          try {
            player.plugin.setQualityFor("video", qIdx, true);
          } catch (e) {
            player.plugin.setQualityFor("video", qIdx);
          }
        }
      }
    }
    if (typeof video !== "undefined" && typeof video.syncQualityUI === "function") {
      video.syncQualityUI();
    }
    return val;
  },

  getLiveResolutionHeight: function () {
    try {
      if (
        player.plugin &&
        typeof player.plugin.getQualityFor === "function" &&
        typeof player.plugin.getBitrateInfoListFor === "function"
      ) {
        var qIdx = player.plugin.getQualityFor("video");
        var list = player.plugin.getBitrateInfoListFor("video") || [];
        if (qIdx >= 0 && list[qIdx] && list[qIdx].height) {
          return Number(list[qIdx].height) || 0;
        }
      }
    } catch (e) {}
    var v = player.getVideo();
    if (v && v.videoHeight > 0) {
      return Number(v.videoHeight) || 0;
    }
    return 0;
  },

  stop: function () {
    player._playSeq++;
    player._clearAudioWatchdog();
    while (player._deviceChangeTimers.length) {
      clearTimeout(player._deviceChangeTimers.pop());
    }
    clearTimeout(player.timers.forward_rewind);
    player._pausedAt = 0;
    player._syncPowerSave(false);
    var v = player.video || document.getElementById("videoplayer");
    if (v) {
      try {
        v.pause();
      } catch (_) {}
    }
    if (player.plugin) {
      try {
        player.plugin.reset();
      } catch (_) {}
      player.plugin = null;
    }
    player.video = null;
    player.noplay = null;
    player.playhead = null;
    if (player.state !== player.states.STOPPED) {
      player.STOP_CALLBACK && player.STOP_CALLBACK();
      player.state = player.states.STOPPED;
    }
  },

  speed: function (rate) {
    var v = player.getVideo();
    if (!v) return;
    v.playbackRate = rate;
  },

  destroy: function () {
    player.stop();
  },

  onbufferingstart: function () {
    video.showBTN("loading");
  },

  onbufferingcomplete: function () {
    var v = player.getVideo();
    if (!v) return;

    if (
      session.storage.quality !== "auto" &&
      player.plugin &&
      typeof player.plugin.setQualityFor === "function"
    ) {
      var qIdx = player.getQuality();
      if (
        qIdx >= 0 &&
        (typeof player.plugin.getQualityFor !== "function" ||
          player.plugin.getQualityFor("video") !== qIdx)
      ) {
        try {
          player.plugin.setQualityFor("video", qIdx, true);
        } catch (e) {
          player.plugin.setQualityFor("video", qIdx);
        }
      }
    }

    if (typeof video !== "undefined" && video.speed && video.speed.active) {
      v.playbackRate = video.speed.active;
    }

    if (typeof video !== "undefined" && typeof video.syncVolumeUI === "function") {
      video.syncVolumeUI();
    }

    if (typeof video !== "undefined" && typeof video.syncQualityUI === "function") {
      video.syncQualityUI();
    }

    if (typeof video !== "undefined" && typeof video.renderChapterMarkers === "function") {
      video.renderChapterMarkers();
    }

    if (player.playhead) {
      if (Math.abs((v.currentTime || 0) - player.playhead) > 1.5) {
        v.currentTime = player.playhead;
      }
      player.playhead = null;
    }

    if (player.noplay) {
      player.noplay = null;
      player.pause();
    } else if (!v.paused || player.state !== player.states.PAUSED) {
      var playP = v.play();
      if (playP && typeof playP.catch === "function") {
        playP.catch(function () {});
      }
      player.state = player.states.PLAYING;
      player._syncPowerSave(true);
      video.hideBTN();
      player._startAudioHealthWatchdog(player._playSeq, false);
    }

    if (typeof video !== "undefined" && typeof video.onPlaybackStarted === "function") {
      video.onPlaybackStarted(player._playSeq);
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
