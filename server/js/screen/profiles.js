// GET /accounts/v1/me/multiprofile

// # Request Headers
// Authorization: Bearer ${TOKEN}

window.profilesScreen = {
  id: "profiles-screen",

  init: function () {
    var profiles_element = document.createElement("div");

    profiles_element.id = profilesScreen.id;

    profiles_element.innerHTML = `
    <div class="content">
      <div class="container">
        <div class="legend">${translate.go("profiles.label")}</div>
        <ul class="options" id="settings-menu">${profilesScreen.getOptions()}</ul>
      </div>
    </div>
    `;

    menu.destroy();
    document.body.appendChild(profiles_element);
    main.state = profilesScreen.id;
  },

  destroy: function () {
    $("[id='profiles-screen']").remove();
  },

  escapeHtml: function (str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  getOptions: function () {
    const profiles = session.storage.profiles || [];
    const hasSelected = profiles.some((p) => Boolean(p.is_selected));

    return profiles
      .map((profile, idx) => {
        var is_selected = Boolean(profile.is_selected) || (!hasSelected && idx === 0);
        var profile_name = profilesScreen.escapeHtml(
          String(profile.profile_name || "").trim().toUpperCase()
        );
        var profile_id = profilesScreen.escapeHtml(profile.profile_id || "");
        var rawAvatar = String(profile.avatar || "0001-cr-white-orange.png");
        var safeAvatar = /^[A-Za-z0-9._-]+$/.test(rawAvatar)
          ? rawAvatar
          : "0001-cr-white-orange.png";

        return `<li class="${
          is_selected ? "selected active" : ""
        }" id="${profile_id}">
        <img src="https://static.crunchyroll.com/assets/avatar/170x170/${safeAvatar}"/>
        <span>${profile_name}</span>
      </li>`;
      })
      .join("");
  },

  keyDown: function (event) {
    switch (event.keyCode) {
      case tvKey.IS_KEY_BACK(event.keyCode):
      case 27:
        if (typeof home !== "undefined" && home.data && home.data.main) {
          profilesScreen.destroy();
          menu.selected = 2;
          menu.init();
          home.init();
        } else {
          exit.init();
        }
        break;
      case tvKey.KEY_RIGHT:
        var options = $(`#${profilesScreen.id} .options li`);
        if (!options.length) break;
        var current = options.index($(`#${profilesScreen.id} .options li.selected`));
        if (current < 0) current = 0;
        options.removeClass("selected");

        var newCurrent = current < options.length - 1 ? current + 1 : current;
        options.eq(newCurrent).addClass("selected");
        break;
      case tvKey.KEY_LEFT:
        var options = $(`#${profilesScreen.id} .options li`);
        if (!options.length) break;
        var current = options.index($(`#${profilesScreen.id} .options li.selected`));
        if (current < 0) current = 0;
        options.removeClass("selected");

        var newCurrent = current > 0 ? current - 1 : current;
        options.eq(newCurrent).addClass("selected");
        break;
      case tvKey.KEY_ENTER:
      case tvKey.KEY_PANEL_ENTER:
        var options = $(`#${profilesScreen.id} .options li`);
        if (!options.length) break;
        var current = options.index($(`#${profilesScreen.id} .options li.selected`));
        if (current < 0) current = 0;

        var element = options[current];
        if (!element || !element.id) break;

        session.switch_profile(
          {
            success: (responseJson) => {
              profilesScreen.destroy();
              menu.selected = 2;
              menu.init();
              home.restart();
            },
            error: console.error,
          },
          element.id,
        );

        break;
    }
  },
};
