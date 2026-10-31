const CONTROLLER_KEY = "controllerSupport";
const PLAYBACK_PREFS_KEY = "cr_playback_prefs";

window.settings = {
  id: "settings-screen",
  isDetails: false,
  defaultPlaybackPrefs: {
    autoSkipIntro: false,
    autoSkipCredits: false,
    autoSkipRecap: false,
    autoPlayNext: true,
    showSkipButton: true,
  },
  playbackToggleDefs: [
    {
      key: "autoSkipIntro",
      title: "Auto-Skip Intro",
      desc: "Automatically skip opening theme sequences after a brief countdown",
    },
    {
      key: "autoSkipCredits",
      title: "Auto-Skip Credits",
      desc: "Automatically skip ending credits after a brief countdown",
    },
    {
      key: "autoSkipRecap",
      title: "Auto-Skip Recap",
      desc: "Automatically skip previous-episode recap segments after a brief countdown",
    },
    {
      key: "autoPlayNext",
      title: "Auto-Play Next Episode",
      desc: "Automatically start the next episode when the current episode finishes",
    },
    {
      key: "showSkipButton",
      title: "Show Skip Buttons",
      desc: "Display on-screen Skip Intro, Skip Recap, and Skip Credits buttons during playback",
    },
  ],
  getPlaybackPrefs: function () {
    var base = Object.assign({}, settings.defaultPlaybackPrefs);
    try {
      var raw = window.localStorage.getItem(PLAYBACK_PREFS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          Object.keys(base).forEach(function (k) {
            if (typeof parsed[k] === "boolean") {
              base[k] = parsed[k];
            }
          });
        }
      }
    } catch (e) {}
    return base;
  },
  setPlaybackPref: function (key, val) {
    var prefs = settings.getPlaybackPrefs();
    prefs[key] = Boolean(val);
    try {
      window.localStorage.setItem(PLAYBACK_PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {}
    return prefs;
  },
  togglePlaybackPref: function (key) {
    var prefs = settings.getPlaybackPrefs();
    return settings.setPlaybackPref(key, !prefs[key]);
  },
  options: [
    {
      id: "playback",
      label: "settings.menu.playback",
      title: "Playback & Auto-Skip",
      type: "toggles",
    },
    {
      id: "videoquality",
      label: "settings.menu.video_quality",
      type: "list",
    },
    {
      id: "audiolang",
      label: "settings.menu.audio_lang",
      type: "list",
    },
    {
      id: "subtitlelang",
      label: "settings.menu.subtitle_lang",
      type: "list",
    },
    {
      id: "applicationlang",
      label: "settings.menu.application_lang",
      type: "list",
    },
    {
      id: "mature",
      label: "settings.menu.mature",
      type: "list",
    },
    {
      id: "controller",
      label: "settings.menu.controller",
      type: "list",
    },
    {
      id: "about",
      label: "settings.menu.about",
      type: "html",
    },
  ],
  qualities: {
    auto: "Auto",
    240: "240p",
    360: "360p",
    480: "480p",
    720: "720p HD",
    1080: "1080p HD",
  },
  bool: {
    M2: "NO",
    M3: "YES",
  },
  controllerSupport: {
    DISABLE: "Disable Game Controller Support",
    ENABLE: "Enable Game Controller Support",
  },
  previous: NaN,

  init: function () {
    var settings_element = document.createElement("div");
    settings_element.id = settings.id;

    settings_element.innerHTML = `
      <div class="content">
        <div class="container-mid">
          <ul class="options" id="settings-menu">${settings.generateMenu()}</ul>
        </div>
        <div class="container" id="settings-details"></div>
      </div>`;

    document.body.appendChild(settings_element);
    settings.details.show(settings.options[0]);
  },

  destroy: function () {
    settings.isDetails = false;
    $("[id='settings-screen']").remove();
  },

  keyDown: function (event) {
    switch (event.keyCode) {
      case tvKey.IS_KEY_BACK(event.keyCode):
        menu.open();
        break;
      case tvKey.KEY_UP:
        if (settings.isDetails) {
          var options = $(`#settings-menu li`);
          var current = options.index($(`#settings-menu li.active`));
          if (current < 0) current = options.index($(`#settings-menu li.selected`));
          if (current >= 0) {
            settings.details[settings.options[current].type].move(-1);
          }
        } else {
          var options = $(`#settings-menu li`);
          var current = options.index($(`#settings-menu li.selected`));

          options.removeClass("selected");
          var newCurrent = current > 0 ? current - 1 : current;
          options.eq(newCurrent).addClass("selected");
          if (options[newCurrent] && options[newCurrent].scrollIntoView) {
            options[newCurrent].scrollIntoView({ block: "nearest" });
          }
          settings.details.show(settings.options[newCurrent]);
        }
        break;
      case tvKey.KEY_DOWN:
        if (settings.isDetails) {
          var options = $(`#settings-menu li`);
          var current = options.index($(`#settings-menu li.active`));
          if (current < 0) current = options.index($(`#settings-menu li.selected`));
          if (current >= 0) {
            settings.details[settings.options[current].type].move(1);
          }
        } else {
          var options = $(`#settings-menu li`);
          var current = options.index($(`#settings-menu li.selected`));

          options.removeClass("selected");
          var newCurrent = current < options.length - 1 ? current + 1 : current;
          options.eq(newCurrent).addClass("selected");
          if (options[newCurrent] && options[newCurrent].scrollIntoView) {
            options[newCurrent].scrollIntoView({ block: "nearest" });
          }
          settings.details.show(settings.options[newCurrent]);
        }
        break;
      case tvKey.KEY_LEFT:
        if (settings.isDetails) {
          var options = $(`#settings-menu li`);
          var current = options.index($(`#settings-menu li.active`));
          if (current < 0) current = options.index($(`#settings-menu li.selected`));
          options.removeClass("active");
          options.eq(current).addClass("selected");
          settings.details[settings.options[current].type].move(false);
          settings.isDetails = false;
        } else {
          menu.open();
        }
        break;
      case tvKey.KEY_RIGHT:
        if (!settings.isDetails) {
          var options = $(`#settings-menu li`);
          var current = options.index($(`#settings-menu li.selected`));
          options.removeClass("selected");
          options.eq(current).addClass("active");

          settings.isDetails = true;
          settings.details[settings.options[current].type].move(0);
        }
        break;
      case tvKey.KEY_ENTER:
      case tvKey.KEY_PANEL_ENTER:
        if (settings.isDetails) {
          var options = $(`#settings-menu li`);
          var current = options.index($(`#settings-menu li.active`));
          if (current < 0) current = options.index($(`#settings-menu li.selected`));
          if (current >= 0) {
            var element = settings.options[current];
            settings.details[element.type].action(element.id);
          }
        }
        break;
    }
  },

  generateMenu: function (index) {
    var className = index === undefined ? "selected" : "active";
    var selected = index === undefined ? 0 : index;
    return settings.options
      .map(
        (option, index) =>
          `<li class="${index === selected ? className : ""}">${
            option.title || translate.go(option.label)
          }</li>`
      )
      .join("");
  },

  resetLang: function () {
    var options = $(`#settings-menu li`);
    var current = options.index($(`#settings-menu li.active`));
    if (current < 0) current = options.index($(`#settings-menu li.selected`));
    if (current < 0) current = 0;

    $("#settings-menu").html(settings.generateMenu(current));

    menu.destroy();
    menu.init(true);
  },

  details: {
    show: function (element) {
      var detailsEl = document.getElementById("settings-details");
      if (detailsEl) {
        detailsEl.scrollTop = 0;
      }
      $("#settings-details").html(
        settings.details[element.type].create(element.id)
      );
      var activeLi = detailsEl && detailsEl.querySelector("li.active");
      if (activeLi && activeLi.scrollIntoView) {
        activeLi.scrollIntoView({ block: "nearest" });
      }
    },

    toggles: {
      create: function () {
        var prefs = settings.getPlaybackPrefs();
        return (
          '<ul class="list-active playback-toggles-list" id="list-details-offset">' +
          settings.playbackToggleDefs
            .map(function (def) {
              var isOn = Boolean(prefs[def.key]);
              return `
                <li class="playback-toggle-item ${isOn ? " toggle-on" : ""}" data-pref-key="${def.key}">
                  <div class="toggle-text">
                    <div class="toggle-title">${def.title}</div>
                    <div class="toggle-desc">${def.desc}</div>
                  </div>
                  <div class="toggle-switch ${isOn ? "on" : "off"}">
                    <span class="toggle-knob"></span>
                    <span class="toggle-state-label">${isOn ? "ON" : "OFF"}</span>
                  </div>
                </li>`;
            })
            .join("") +
          "</ul>"
        );
      },

      action: function () {
        var items = $(`#settings-details li.playback-toggle-item`);
        var selected = items.filter(".selected");
        if (!selected.length) return;
        var key = selected.attr("data-pref-key");
        if (!key) return;
        var prefs = settings.togglePlaybackPref(key);
        var isOn = Boolean(prefs[key]);
        selected.toggleClass("toggle-on", isOn);
        var sw = selected.find(".toggle-switch");
        sw.removeClass("on off").addClass(isOn ? "on" : "off");
        selected.find(".toggle-state-label").text(isOn ? "ON" : "OFF");
      },

      move: function (index) {
        var options = $(`#settings-details li.playback-toggle-item`);
        if (index === false) {
          options.removeClass("selected");
          return;
        }
        var currentSelected = options.index(options.filter(".selected"));
        var current = currentSelected >= 0 ? currentSelected : 0;
        options.removeClass("selected");
        var newCurrent = current;
        if (index < 0) {
          newCurrent = current > 0 ? current + index : 0;
        } else if (index > 0) {
          newCurrent = current + index < options.length ? current + index : options.length - 1;
        }
        options.eq(newCurrent).addClass("selected");
        if (options[newCurrent] && options[newCurrent].scrollIntoView) {
          options[newCurrent].scrollIntoView({ block: "nearest" });
        }
      },
    },

    list: {
      create: function (id) {
        switch (id) {
          case "audiolang":
            var options = session.languages.audios;
            var active = session.storage.account.audio;
            break;
          case "applicationlang":
            var options = JSON.parse(
              JSON.stringify(session.languages.subtitles)
            );
            delete options[""];
            var active = session.storage.language;
            break;
          case "subtitlelang":
            var options = session.languages.subtitles;
            var active = session.storage.account.language;
            break;
          case "videoquality":
            var options = settings.qualities;
            var active = session.storage.quality || "auto";
            break;
          case "mature":
            var options = settings.bool;
            var active = session.storage.account.mature;
            break;
          case "controller":
            var options = settings.controllerSupport;
            var active = window.localStorage.getItem(CONTROLLER_KEY);
            break;
        }

        return (
          '<ul class="list-active" id="list-details-offset">' +
          Object.keys(options)
            .map(
              (option) =>
                `<li class="${option === active ? "active" : ""}">${
                  options[option]
                }</li>`
            )
            .join("") +
          "</ul>"
        );
      },

      adjust: function (index, size, elementId) {
        var el = document.getElementById(elementId);
        if (!el) return;
        el.style.marginTop = "0px";
        var items = el.querySelectorAll("li");
        if (items[index] && items[index].scrollIntoView) {
          items[index].scrollIntoView({ block: "nearest" });
        }
      },

      action: function (id) {
        var optionsMenu = $(`#settings-details li`);
        var index = optionsMenu.index($(`#settings-details li.selected`));
        if (index < 0) return;

        console.log(id, index);
        switch (id) {
          case "audiolang":
            var options = session.languages.audios;
            var method = function (value) {
              service.setProfile({
                data: {
                  preferred_content_audio_language: value,
                },
                success: function (response) {
                  session.storage.account.audio = value;
                  session.update();
                },
                error: function (error) {
                  console.log(error);
                },
              });
            };
            break;
          case "applicationlang":
            var options = JSON.parse(
              JSON.stringify(session.languages.subtitles)
            );
            delete options[""];
            var method = function (value) {
              translate.updateLanguage(value);
              settings.resetLang();
            };
            break;
          case "subtitlelang":
            var options = session.languages.subtitles;
            var method = function (value) {
              service.setProfile({
                data: {
                  preferred_content_subtitle_language: value,
                },
                success: function (response) {
                  session.storage.account.language = value;
                  session.update();
                },
                error: function (error) {
                  console.log(error);
                },
              });
            };
            break;
          case "videoquality":
            var options = settings.qualities;
            var method = function (value) {
              session.storage.quality = value;
              session.update();
            };
            break;
          case "mature":
            var options = settings.bool;
            var method = function (value) {
              service.setProfile({
                data: {
                  maturity_rating: value,
                },
                success: function (response) {
                  session.storage.account.mature = value;
                  session.update();
                },
                error: function (error) {
                  console.log(error);
                },
              });
            };
            break;
          case "controller":
            var options = settings.controllerSupport;
            // DISABLE ENABLE
            var method = function (value) {
              console.log("controllerSupport", value);
              if (value === "DISABLE") {
                window.localStorage.setItem(CONTROLLER_KEY, "DISABLE");
              } else if (value === "ENABLE") {
                window.localStorage.setItem(CONTROLLER_KEY, "ENABLE");
              }
              window.setControllerEnabled &&
                window.setControllerEnabled(value === "ENABLE");
              session.update();
            };
        }
        method(Object.keys(options)[index]);
        optionsMenu.removeClass("active");
        optionsMenu.eq(index).addClass("active");
      },

      move: function (index) {
        var options = $(`#settings-details li`);
        if (index === false) {
          options.removeClass("selected");
          return;
        }
        var currentSelected = options.index($(`#settings-details li.selected`));
        var current =
          currentSelected >= 0
            ? currentSelected
            : options.index($(`#settings-details li.active`));
        if (current < 0) current = 0;

        options.removeClass("selected");
        if (index < 0) {
          var newCurrent = current > 0 ? current + index : current;
        } else {
          var newCurrent =
            current + index < options.length ? current + index : current;
        }

        options.eq(newCurrent).addClass("selected");
        settings.details.list.adjust(
          newCurrent,
          options.length,
          "list-details-offset"
        );
      },
    },

    html: {
      create: function (id) {
        var ver =
          (typeof changelog !== "undefined" &&
            changelog.data &&
            changelog.data.version) ||
          "v2.0.0";
        return `
        <div id="about-panel">
          <div class="about-header">
            <div class="about-title-block">
              <div class="about-app-name">Crunchyroll Ubuntu Desktop</div>
              <div class="about-tagline">Modernist Glassmorphic UI, Custom Lists, Auto-Skip HUD, Mouse/Trackpad &amp; Smart Auto-PiP Edition</div>
            </div>
            <span class="about-version-badge">${ver}</span>
          </div>

          <div class="about-section">
            <div class="about-section-title">Developer &amp; Links</div>
            <div class="about-author-row">
              <i class="fa-solid fa-code"></i>
              <span>Built &amp; Maintained by <strong>Pulkit Mundra</strong></span>
            </div>
            <div class="about-links">
              <a class="about-link-pill" data-external-url="https://github.com/pulkitmundra/crunchyroll-ubuntu-desktop">
                <i class="fa-solid fa-code-branch"></i>
                <span>github.com/pulkitmundra/crunchyroll-ubuntu-desktop</span>
              </a>
              <a class="about-link-pill" data-external-url="https://pulkit-mundra-portfolio.vercel.app">
                <i class="fa-solid fa-globe"></i>
                <span>pulkit-mundra-portfolio.vercel.app</span>
              </a>
              <a class="about-link-pill" data-external-url="https://github.com/pulkitmundra/crunchyroll-ubuntu-desktop/issues">
                <i class="fa-solid fa-bug"></i>
                <span>Report an Issue / Request Feature</span>
              </a>
            </div>
          </div>

          <div class="about-section">
            <div class="about-section-title">Desktop Shortcuts</div>
            <div class="about-shortcuts-grid">
              <div class="shortcut-item"><kbd>F9</kbd><span>Mini Floating Player</span></div>
              <div class="shortcut-item"><kbd>F10</kbd><span>Smart Auto-PiP Pin</span></div>
              <div class="shortcut-item"><kbd>F11 / F</kbd><span>Fullscreen</span></div>
              <div class="shortcut-item"><kbd>Space</kbd><span>Play / Pause</span></div>
              <div class="shortcut-item"><kbd>J / L</kbd><span>Seek -10s / +10s</span></div>
              <div class="shortcut-item"><kbd>M / Wheel</kbd><span>Mute &amp; Volume</span></div>
              <div class="shortcut-item"><kbd>[ / ]</kbd><span>Playback Speed</span></div>
              <div class="shortcut-item"><kbd>C / E / S / Z</kbd><span>Subs / Eps / Skip / Aspect</span></div>
            </div>
          </div>

          <div class="about-credits">
            Based on <span class="about-credit-link" data-external-url="https://github.com/jhassan8/crunchyroll-tizen">jhassan8/crunchyroll-tizen</span> &amp; <span class="about-credit-link" data-external-url="https://github.com/aarron-lee/crunchyroll-linux">aarron-lee/crunchyroll-linux</span> | Icon by <span class="about-credit-link" data-external-url="https://www.flaticon.com/free-icons/crunchyroll">Enamo Studios</span>
          </div>
        </div>`;
      },

      move: function () {},
      action: function () {},
    },
  },
};
