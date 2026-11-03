window.changelog = {
  id: "changelog-modal",
  data: {
    version: "v2.1.0",
    changes: [
      {
        title: "GNOME Media Keys, Frame Capture, Season Switcher & History Controls",
        description:
          "Added Linux/GNOME MediaSession (MPRIS) integration, HUD-free frame capture (Ctrl+Shift+S), in-drawer season switcher, custom list rename, watch history removal, recent searches, episode watched toggles, and subtitle appearance settings.",
      },
      {
        title: "Delete Custom List Confirmation Dialog & Toast Notifications",
        description:
          "Added a safety confirmation modal before deleting any Custom List, a Delete List button on My List row headers, empty-name validation on Create & Add, and confirmation toasts across all Watchlist and Custom List actions.",
      },
      {
        title: "Star Ratings, Sub | Dub Badges & Custom Lists",
        description:
          "Added Crunchyroll star ratings, Sub | Dub badges on cards and banners, and a Manage Lists modal for Watchlist and Custom Lists.",
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
