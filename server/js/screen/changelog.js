window.changelog = {
  id: "changelog-modal",
  data: {
    version: "v2.4.0",
    changes: [
      {
        title: "Long-Pause & Sleep/Wake Audio Recovery + Live Token Self-Healing",
        description:
          "Eliminated silent audio after long pauses, Bluetooth sink switches, or laptop suspend/resume via in-process PipeWire/PulseAudio routing, automatic sink re-binding, silent-audio watchdog recovery, live DASH token refresh, and exact-timestamp Widevine stream reload.",
      },
      {
        title: "Star Ratings, Sub/Dub/Airing Badges & Movie Support Across All Tabs",
        description:
          "Added star ratings, launch years, Ongoing/Completed airing status, and Sub/Dub badges across Watchlist, Custom Crunchylists, Watch History, Browse (v2 API), and Home cards, plus full Movie playback in History/Lists and reliable Mark as Unwatched.",
      },
      {
        title: "See-Through Player Translucency (20% - 100%), Quality Selector & Sleep Timer",
        description:
          "Includes see-through ARGB player translucency with standing vertical Volume/Translucency sliders, live Video Quality selector (Q), Sleep Timer (T), timeline chapter markers, and GNOME MPRIS media keys.",
      },
    ],
  },

  init: function (force) {
    if (document.getElementById(changelog.id)) return;
    if (
      !force &&
      typeof session !== "undefined" &&
      session.storage &&
      session.storage.version === changelog.data.version
    ) {
      return;
    }

    var changelog_element = document.createElement("div");
    changelog_element.id = changelog.id;
    changelog_element.innerHTML = `
      <div class="content">
        <div class="header">What's New in ${changelog.data.version}</div>
        <div class="body">
          <ul class="changes">
            ${changelog.getChanges()}
          </ul>
        </div>
        <div class="footer">
          <a id="changelog-support-btn" class="button changelog-support-btn">
            <i class="fa-solid fa-mug-hot"></i>
            <span>Buy Me a Coffee</span>
          </a>
          <a id="changelog-close-btn" class="button changelog-close-btn selected">Continue</a>
        </div>
      </div>`;

    if (typeof session !== "undefined" && session.storage) {
      session.storage.version = changelog.data.version;
      session.update();
    }
    document.body.appendChild(changelog_element);
    main.state = changelog.id;
  },

  destroy: function () {
    var modalEl = document.getElementById(changelog.id);
    if (modalEl && modalEl.parentNode) {
      modalEl.parentNode.removeChild(modalEl);
    }
    if (typeof main !== "undefined" && typeof main.resolveState === "function") {
      main.state = main.resolveState() || home.id;
    } else {
      main.state = home.id;
    }
  },

  getChanges: function () {
    var content_changes = "";
    changelog.data.changes.forEach((element) => {
      content_changes += `
      <li>
        <div class="change-title">
          ${element.title}
        </div>
        <div class="change-description">
          ${element.description}
        </div>
      </li>`;
    });
    return content_changes;
  },

  keyDown: function (event) {
    var supportBtn = document.getElementById("changelog-support-btn");
    var closeBtn = document.getElementById("changelog-close-btn");
    switch (event.keyCode) {
      case tvKey.KEY_LEFT:
        if (supportBtn && closeBtn) {
          supportBtn.classList.add("selected");
          closeBtn.classList.remove("selected");
        }
        break;
      case tvKey.KEY_RIGHT:
        if (supportBtn && closeBtn) {
          closeBtn.classList.add("selected");
          supportBtn.classList.remove("selected");
        }
        break;
      case tvKey.KEY_PANEL_ENTER:
      case tvKey.KEY_ENTER:
        if (supportBtn && supportBtn.classList.contains("selected")) {
          if (
            window.electronUtilsRender &&
            typeof window.electronUtilsRender.openExternal === "function"
          ) {
            window.electronUtilsRender.openExternal(
              "https://buymeacoffee.com/pulkitmundra"
            );
          }
        } else {
          changelog.destroy();
        }
        break;
      case tvKey.IS_KEY_BACK(event.keyCode):
        changelog.destroy();
        break;
    }
  },
};
