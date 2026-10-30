window.main = {
  urls: {
    src: "server/img",
  },
  events: {},
  mac: null,
  token: null,
  state: null,
  timer: null,

  /* on init app */
  init: function () {
    loading.init();
    session.init();
    translate.init();
    main.events.login();

    // TODO: temporal config for LG
    tvKey.IS_KEY_BACK = function (keyCode) {
      return [10009, 27, 461].includes(keyCode) ? keyCode : -1;
    };
  },

  preventClickMessage: function () {
    var close = document.createElement("div");
    close.className = "no-cursor";
    close.innerHTML = `
    <div id="no-cursor-alert">
      <i class="fa-solid fa-computer-mouse"></i>
      <span></span>
    </div>`;

    close.addEventListener("click", function () {
      clearTimeout(main.timer);
      $("#no-cursor-alert").css("opacity", 1);
      $("#no-cursor-alert span").text(translate.go("generic.alert.cursor"));
      main.timer = setTimeout(() => {
        $("#no-cursor-alert").css("opacity", 0);
      }, 2000);
    });

    document.body.appendChild(close);
  },

  events: {
    logout: function () {
      const logout = () => {
        if (typeof video !== "undefined" && document.getElementById(video.id)) {
          video.destroy();
        }
        if (
          typeof home_episodes !== "undefined" &&
          document.body.classList.contains(home_episodes.id)
        ) {
          home_episodes.destroy();
        }
        if (
          typeof home_details !== "undefined" &&
          document.body.classList.contains(home_details.id)
        ) {
          home_details.destroy();
        }
        if (document.getElementById(menu.id) != null) menu.destroy();

        [
          typeof home !== "undefined" ? home : null,
          typeof mylist !== "undefined" ? mylist : null,
          typeof search !== "undefined" ? search : null,
          typeof historyScreen !== "undefined" ? historyScreen : null,
          typeof browse !== "undefined" ? browse : null,
          typeof settings !== "undefined" ? settings : null,
          typeof profilesScreen !== "undefined" ? profilesScreen : null,
        ].forEach(function (scr) {
          if (scr && document.getElementById(scr.id)) {
            scr.destroy();
          }
        });
        session.clear();
        login.init();
      };

      exit.init(logout);
    },

    login: function () {
      session.valid({
        success: function () {
          session.load_account({
            success: function () {
              main.events.profiles();
            },
            error: function (error) {
              console.log("load_account", error);
            },
          });
        },
        error: function (error) {
          console.log(error);
          loading.destroy();
          login.init();
        },
      });
    },

    profiles: function () {
      loading.destroy();
      profilesScreen.init();
    },
  },

  resolveState: function () {
    if (typeof exit !== "undefined" && document.getElementById(exit.id)) {
      main.state = exit.id;
      return main.state;
    }
    if (typeof changelog !== "undefined" && document.getElementById(changelog.id)) {
      main.state = changelog.id;
      return main.state;
    }
    if (typeof keyboard !== "undefined" && document.getElementById(keyboard.id)) {
      main.state = keyboard.id;
      return main.state;
    }
    if (typeof video !== "undefined" && document.getElementById(video.id)) {
      if (typeof menu !== "undefined" && menu.isOpen) {
        menu.isOpen = false;
      }
      main.state = video.id;
      return main.state;
    }
    var menuEl = typeof menu !== "undefined" && document.getElementById(menu.id);
    if (
      typeof menu !== "undefined" &&
      menu.isOpen &&
      menuEl &&
      menuEl.offsetParent !== null
    ) {
      main.state = menu.id;
      return main.state;
    }
    if (
      typeof home_episodes !== "undefined" &&
      document.body.classList.contains(home_episodes.id)
    ) {
      main.state = home_episodes.id;
      return main.state;
    }
    if (
      typeof home_details !== "undefined" &&
      document.body.classList.contains(home_details.id)
    ) {
      main.state = home_details.id;
      return main.state;
    }
    if (
      typeof profilesScreen !== "undefined" &&
      document.getElementById(profilesScreen.id)
    ) {
      main.state = profilesScreen.id;
      return main.state;
    }
    if (typeof login !== "undefined" && document.getElementById(login.id)) {
      main.state = login.id;
      return main.state;
    }
    if (typeof settings !== "undefined" && document.getElementById(settings.id)) {
      main.state = settings.id;
      return main.state;
    }
    if (typeof browse !== "undefined" && document.getElementById(browse.id)) {
      main.state = browse.id;
      return main.state;
    }
    var searchEl = typeof search !== "undefined" && document.getElementById(search.id);
    if (searchEl && searchEl.style.display !== "none") {
      main.state = search.id;
      return main.state;
    }
    var histEl =
      typeof historyScreen !== "undefined" && document.getElementById(historyScreen.id);
    if (histEl && histEl.style.display !== "none") {
      main.state = historyScreen.id;
      return main.state;
    }
    var mylistEl = typeof mylist !== "undefined" && document.getElementById(mylist.id);
    if (mylistEl && mylistEl.style.display !== "none") {
      main.state = mylist.id;
      return main.state;
    }
    if (typeof home !== "undefined" && document.getElementById(home.id)) {
      main.state = home.id;
      return main.state;
    }
    var loadEl = typeof loading !== "undefined" && document.getElementById(loading.id);
    if (loadEl && !loadEl.classList.contains("flat")) {
      main.state = loading.id;
      return main.state;
    }
    return main.state;
  },

  /* on exit app */
  destroy: function () {
    player.destroy();
  },

  log: function (text) {
    $("#console").html($("#console").html() + `${text}<br/>`);
    $("#console").scrollTop(3000000);
  },

  /* on key press */
  keyDown: function (event) {
    main.resolveState();
    if (loading.active && main.state !== exit.id) {
      if (tvKey.IS_KEY_BACK(event.keyCode)) {
        loading.end();
      }
    } else {
      if (event.keyCode == tvKey.KEY_EXIT && main.state != exit.id) {
        exit.init();
      } else {
        switch (main.state) {
          case changelog.id:
            changelog.keyDown(event);
            break;
          case loading.id:
            loading.keyDown(event);
            break;
          case exit.id:
            exit.keyDown(event);
            break;
          case login.id:
            login.keyDown(event);
            break;
          case keyboard.id:
            keyboard.keyDown(event);
            break;
          case menu.id:
            menu.keyDown(event);
            break;
          case mylist.id:
            mylist.keyDown(event);
            break;
          case search.id:
            search.keyDown(event);
            break;
          case historyScreen.id:
            historyScreen.keyDown(event);
            break;
          case profilesScreen.id:
            profilesScreen.keyDown(event);
            break;
          case browse.id:
            browse.keyDown(event);
            break;
          case home.id:
            home.keyDown(event);
            break;
          case home_details.id:
            home_details.keyDown(event);
            break;
          case home_episodes.id:
            home_episodes.keyDown(event);
            break;
          case video.id:
            video.keyDown(event);
            break;
          case settings.id:
            settings.keyDown(event);
            break;
          default:
            console.log(
              "keyboard action screen not defined.",
              main.state,
              event
            );
            break;
        }
      }
    }
  },
};
