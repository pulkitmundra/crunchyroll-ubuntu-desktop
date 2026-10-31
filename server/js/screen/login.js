window.login = {
  id: "login-screen",
  selected: 0,
  lastUsername: "",
  isSubmitting: false,
  capsLockOn: false,
  _capsKeyDownHandler: null,
  _capsKeyUpHandler: null,
  _capsMouseHandler: null,

  updateCapsBadge: function (isOn) {
    login.capsLockOn = Boolean(isOn);
    var capsBadge = document.getElementById("login-capslock-warning");
    if (capsBadge) {
      capsBadge.style.display = login.capsLockOn ? "inline-flex" : "none";
    }
  },

  init: function (errorMessage) {
    login.destroy();
    login.isSubmitting = false;
    var login_element = document.createElement("div");
    login_element.id = login.id;

    var savedEmail = login.lastUsername || "";
    if (!savedEmail) {
      try {
        savedEmail = localStorage.getItem("cr_saved_email") || "";
      } catch (e) {}
    }

    login_element.innerHTML = `
  <div class="content">
    <div class="box">
      <div class="logo">
        <img src="server/img/logo-big.png" alt="Crunchyroll">
      </div>
      <div class="login-subtitle">Sign in with your Crunchyroll account</div>
      <div class="form">
        <div class="input ${login.id}-option" data-index="0">
          <i class="fa-solid fa-envelope input-icon"></i>
          <input id="login-username" type="email" tabindex="1" autocomplete="username" spellcheck="false" placeholder="${translate.go("login.username")}">
        </div>
        <div class="input ${login.id}-option" data-index="1">
          <i class="fa-solid fa-lock input-icon"></i>
          <input id="login-password" type="password" tabindex="2" autocomplete="current-password" placeholder="${translate.go("login.password")}">
          <span id="login-capslock-warning" title="Caps Lock is ON">CAPS</span>
          <button type="button" id="toggle-password-visibility" tabindex="-1" title="Show / Hide Password">
            <i class="fa-solid fa-eye"></i>
          </button>
        </div>
        <div id="login-error-message">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span id="login-error-text"></span>
        </div>
        <a id="login-submit-btn" class="button ${login.id}-option" data-index="2" tabindex="3" translate>${translate.go("login.enter")}</a>
        <div class="login-hint">Press <kbd>Tab</kbd> to switch fields, <kbd>Enter</kbd> to sign in</div>
      </div>
    </div>
  </div>`;
    document.body.appendChild(login_element);

    var userEl = document.getElementById("login-username");
    var passEl = document.getElementById("login-password");
    var toggleBtn = document.getElementById("toggle-password-visibility");

    if (userEl && savedEmail) {
      userEl.value = savedEmail;
    }

    if (userEl) {
      userEl.addEventListener("focus", function () {
        login.move(0);
      });
    }
    if (passEl) {
      passEl.addEventListener("focus", function () {
        login.move(1);
      });
    }

    // X11 / Linux CapsLock tracking:
    // Under X11 XKB, LockMask is latched on KeyPress when turning CapsLock ON and unlatched
    // AFTER KeyRelease when turning CapsLock OFF, meaning e.getModifierState("CapsLock")
    // still returns true during both keydown and keyup of the CapsLock key itself when turning OFF.
    login._capsKeyDownHandler = function (e) {
      if (e.key === "CapsLock" || e.code === "CapsLock" || e.keyCode === 20) {
        if (!e.repeat) {
          login.updateCapsBadge(!login.capsLockOn);
        }
        return;
      }
      if (typeof e.getModifierState === "function") {
        login.updateCapsBadge(e.getModifierState("CapsLock"));
      }
    };
    login._capsKeyUpHandler = function (e) {
      if (e.key === "CapsLock" || e.code === "CapsLock" || e.keyCode === 20) {
        return;
      }
      if (typeof e.getModifierState === "function") {
        login.updateCapsBadge(e.getModifierState("CapsLock"));
      }
    };
    login._capsMouseHandler = function (e) {
      if (typeof e.getModifierState === "function") {
        login.updateCapsBadge(e.getModifierState("CapsLock"));
      }
    };
    window.addEventListener("keydown", login._capsKeyDownHandler, true);
    window.addEventListener("keyup", login._capsKeyUpHandler, true);
    window.addEventListener("mousedown", login._capsMouseHandler, true);
    window.addEventListener("mousemove", login._capsMouseHandler, { capture: true, passive: true });

    if (toggleBtn && passEl) {
      toggleBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        e.preventDefault();
        var isPwd = passEl.type === "password";
        passEl.type = isPwd ? "text" : "password";
        var icon = toggleBtn.querySelector("i");
        if (icon) {
          icon.className = isPwd ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
        }
        passEl.focus();
      });
    }

    login.selected = savedEmail ? 1 : 0;
    login.move(login.selected);
    main.state = login.id;

    setTimeout(function () {
      var targetInput = savedEmail ? passEl : userEl;
      if (targetInput) {
        targetInput.focus();
      }
    }, 50);

    if (errorMessage) {
      login.error(errorMessage);
    }
  },

  destroy: function () {
    login.isSubmitting = false;
    if (login._capsKeyDownHandler) {
      window.removeEventListener("keydown", login._capsKeyDownHandler, true);
      login._capsKeyDownHandler = null;
    }
    if (login._capsKeyUpHandler) {
      window.removeEventListener("keyup", login._capsKeyUpHandler, true);
      login._capsKeyUpHandler = null;
    }
    if (login._capsMouseHandler) {
      window.removeEventListener("mousedown", login._capsMouseHandler, true);
      window.removeEventListener("mousemove", login._capsMouseHandler, true);
      login._capsMouseHandler = null;
    }
    $("[id='login-screen']").remove();
  },

  keyDown: function (event) {
    switch (event.keyCode) {
      case tvKey.IS_KEY_BACK(event.keyCode):
        exit.init();
        break;
      case tvKey.KEY_UP:
        login.move(login.selected == 0 ? 0 : login.selected - 1, true);
        break;
      case tvKey.KEY_DOWN:
        login.move(login.selected == 2 ? 2 : login.selected + 1, true);
        break;
      case tvKey.KEY_ENTER:
      case tvKey.KEY_PANEL_ENTER:
        login.action(this.selected);
        break;
    }
  },

  move: function (selected, focusInput) {
    login.selected = selected;
    var options = document.getElementsByClassName(login.id + "-option");
    for (var i = 0; i < options.length; i++) {
      options[i].className = options[i].className.replace(" focus", "");
      if (i == selected) {
        options[i].className = options[i].className + " focus";
        if (focusInput) {
          var inp = options[i].querySelector("input");
          if (inp && document.activeElement !== inp) {
            inp.focus();
          } else if (!inp && document.activeElement && document.activeElement.tagName === "INPUT") {
            document.activeElement.blur();
          }
        }
      }
    }
  },

  error: function (message) {
    var container = $("#login-error-message");
    var textEl = $("#login-error-text");
    if (textEl.length) {
      textEl.text(message);
    } else {
      container.text(message);
    }
    container.css("display", "flex").hide().fadeIn(180);
    clearTimeout(login._errorTimer);
    login._errorTimer = setTimeout(function () {
      container.fadeOut(220);
    }, 4500);
  },

  action: function (selected) {
    if (login.isSubmitting) return;
    var userEl = document.getElementById("login-username");
    var passEl = document.getElementById("login-password");
    if (selected === 0 && userEl && passEl && !passEl.value) {
      login.move(1, true);
      return;
    }
    if (selected === 1 && passEl && !passEl.value) {
      passEl.focus();
      return;
    }
    var username = userEl ? userEl.value.trim() : "";
    var password = passEl ? passEl.value : "";
    login.lastUsername = username;
    if (!/\S+@\S+\.\S+/.test(username) || password.length < 5) {
      login.error(translate.go("login.error.invalid"));
      if (!/\S+@\S+\.\S+/.test(username) && userEl) {
        login.move(0, true);
      } else if (passEl) {
        login.move(1, true);
      }
    } else {
      try {
        localStorage.setItem("cr_saved_email", username);
      } catch (e) {}
      login.isSubmitting = true;
      var submitBtn = document.getElementById("login-submit-btn");
      if (submitBtn) {
        submitBtn.classList.add("submitting");
        submitBtn.innerText = "Signing in...";
      }
      session.start(username, password, {
        success: function () {
          login.isSubmitting = false;
          login.lastUsername = "";
          login.destroy();
          main.events.login();
        },
        error: function (err) {
          login.isSubmitting = false;
          var msg =
            (err && err.message) ||
            translate.go("login.error.invalid") ||
            "Invalid email or password. Please try again.";
          if (document.getElementById(login.id)) {
            if (submitBtn) {
              submitBtn.classList.remove("submitting");
              submitBtn.innerText = translate.go("login.enter");
            }
            login.error(msg);
            if (passEl) {
              passEl.focus();
              passEl.select();
            }
          } else {
            login.init(msg);
          }
        },
      });
    }
  },
};
