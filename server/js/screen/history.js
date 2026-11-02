window.historyScreen = {
  id: "history-screen",
  data: [],

  init: function () {
    var history_element = document.createElement("div");
    history_element.id = historyScreen.id;

    history_element.innerHTML = `
    <div class="content">
      <div class="screen-header">
        <div class="screen-header-left">
          <span class="screen-eyebrow">Activity</span>
          <h1 class="screen-title">Watch History</h1>
        </div>
        <button type="button" id="history-clear-all-btn" class="history-clear-all-btn" style="display:none;" title="Clear all watch history">
          <i class="fa-solid fa-trash-can"></i>
          <span>Clear History</span>
        </button>
      </div>
      <div class="list-container">
        <div class="list-container-over" id="history-list"></div>
      </div>
      <div class="logo-fixed">
        <img src="server/img/logo-big.png"/>
      </div>
    </div>`;

    document.body.appendChild(history_element);

    historyScreen.loadHistory();
  },

  loadHistory: function () {
    loading.start();
    service.history({
      success: function (response) {
        var elements = "";
        historyScreen.data = mapper.history(response);
        var listEl = document.getElementById("history-list");
        var clearBtn = document.getElementById("history-clear-all-btn");
        if (!listEl) {
          loading.end();
          return;
        }
        if (!historyScreen.data || historyScreen.data.length === 0) {
          listEl.innerHTML = `<div class="history-empty">No watch history yet.</div>`;
          if (clearBtn) clearBtn.style.display = "none";
          loading.end();
          return;
        }
        if (clearBtn) clearBtn.style.display = "inline-flex";
        var esc =
          typeof mapper !== "undefined" && mapper.escapeHtml
            ? mapper.escapeHtml
            : function (s) {
                return String(s == null ? "" : s);
              };
        historyScreen.data.forEach((element, index) => {
          var badges =
            typeof mapper !== "undefined" && mapper.formatCardBadges
              ? mapper.formatCardBadges(element)
              : "";
          var epNum = element.episode || element.episode_number || "";
          var epTitle = element.episode_title || "";
          var epMeta = epNum ? `E${epNum}${epTitle ? " - " + epTitle : ""}` : epTitle;
          var safeContentId = esc(element.content_id || "");
          var safeLabel = esc(
            (element.title || "Episode") + (epNum ? " E" + epNum : "")
          );
          var removeBtn = safeContentId
            ? `<button type="button" class="history-quick-remove" data-content-id="${safeContentId}" data-label="${safeLabel}" title="Remove from Watch History"><i class="fa-solid fa-trash-can"></i></button>`
            : "";
          elements += `
          <div class="item${index === 0 ? " selected" : ""}">
            <img src="${esc(element.background)}" alt="">
            ${badges}
            ${removeBtn}
            <div class="history-card-info">
              <div class="history-series-title">${esc(element.title || "")}</div>
              ${epMeta ? `<div class="history-ep-title">${esc(epMeta)}</div>` : ""}
            </div>
            ${historyScreen.view(element)}
          </div>`;
        });
        listEl.innerHTML = elements;
        loading.end();
      },
      error: function (error) {
        loading.end();
        console.log(error);
      },
    });
  },

  removeHistoryItem: function (contentId, label) {
    if (!contentId) return;
    var displayLabel = label || "item";
    loading.start();
    service.deleteHistoryItem({
      data: { content_id: contentId },
      success: function () {
        loading.end();
        historyScreen.loadHistory();
        if (typeof window.showToast === "function") {
          window.showToast(
            'Removed "' + displayLabel + '" from Watch History',
            "removed"
          );
        }
      },
      error: function () {
        loading.end();
        if (typeof window.showToast === "function") {
          window.showToast(
            'Failed to remove "' + displayLabel + '" from Watch History',
            "error"
          );
        }
      },
    });
  },

  clearAllHistory: function () {
    var performClear = function () {
      loading.start();
      service.clearHistory({
        success: function () {
          loading.end();
          historyScreen.loadHistory();
          if (typeof window.showToast === "function") {
            window.showToast("Cleared Watch History", "removed");
          }
        },
        error: function () {
          loading.end();
          if (typeof window.showToast === "function") {
            window.showToast("Failed to clear Watch History", "error");
          }
        },
      });
    };
    if (typeof window.showConfirmDialog === "function") {
      window.showConfirmDialog({
        title: "Clear Watch History?",
        message:
          "Do you really want to clear your entire Watch History? This cannot be undone.",
        confirmText: "Clear History",
        cancelText: "Cancel",
        onConfirm: performClear,
      });
    } else {
      performClear();
    }
  },

  destroy: function () {
    if (typeof window.closeConfirmDialog === "function") {
      window.closeConfirmDialog();
    }
    historyScreen.data = [];
    $("[id='history-screen']").remove();
  },

  view: function (item) {
    if (!item.playhead || !item.duration) return "";
    var pct = Math.min(100, Math.max(0, (item.playhead * 100) / item.duration));
    var remMin = Math.max(1, item.duration - item.playhead);
    return `<div class="progress" style="width: ${pct}%" value="${
      item.playhead >= item.duration
        ? translate.go("home.episodes.watched")
        : remMin + "m"
    }"></div>`;
  },

  keyDown: function (event) {
    switch (event.keyCode) {
      case tvKey.IS_KEY_BACK(event.keyCode):
        menu.open();
        break;
      case tvKey.KEY_NEXT:
        break;
      case tvKey.KEY_UP:
        var options = $(`#${historyScreen.id} .list-container-over .item`);
        if (!options.length) break;
        var current = options.index($(`#${historyScreen.id} .list-container-over .item.selected`));

        options.removeClass("selected");
        var newCurrent = current > 4 ? current - 5 : current;
        options.eq(newCurrent).addClass("selected");

        var row = Math.ceil((newCurrent + 1) / 5);
        var containerEl = $(`#${historyScreen.id} .list-container-over`).get(0);
        if (containerEl) {
          var rowPitch = options.get(0) ? options.get(0).offsetHeight + 24 : 210;
          containerEl.style.marginTop = `${row > 3 ? (row - 3) * -rowPitch : 0}px`;
        }
        break;
      case tvKey.KEY_DOWN:
        var options = $(`#${historyScreen.id} .list-container-over .item`);
        if (!options.length) break;
        var current = options.index($(`#${historyScreen.id} .list-container-over .item.selected`));

        options.removeClass("selected");
        var newCurrent = current < options.length - 5 ? current + 5 : current;
        options.eq(newCurrent).addClass("selected");

        var row = Math.ceil((newCurrent + 1) / 5);
        var containerEl = $(`#${historyScreen.id} .list-container-over`).get(0);
        if (containerEl) {
          var rowPitch = options.get(0) ? options.get(0).offsetHeight + 24 : 210;
          containerEl.style.marginTop = `${row > 3 ? (row - 3) * -rowPitch : 0}px`;
        }
        break;
      case tvKey.KEY_LEFT:
        var options = $(`#${historyScreen.id} .list-container-over .item`);
        if (!options.length) {
          menu.open();
          break;
        }
        var current = options.index($(`#${historyScreen.id} .list-container-over .item.selected`));
        if (current > 0 && current % 5 !== 0) {
          options.removeClass("selected");
          options.eq(current - 1).addClass("selected");
        } else {
          menu.open();
        }
        break;
      case tvKey.KEY_RIGHT:
        var options = $(`#${historyScreen.id} .list-container-over .item`);
        if (!options.length) break;
        var current = options.index($(`#${historyScreen.id} .list-container-over .item.selected`));

        options.removeClass("selected");
        var newCurrent =
          current + 1 < options.length && (current + 1) % 5 !== 0
            ? current + 1
            : current;
        options.eq(newCurrent).addClass("selected");
        break;
      case tvKey.KEY_ENTER:
      case tvKey.KEY_PANEL_ENTER:
        var options = $(`#${historyScreen.id} .list-container-over .item`);
        if (!options.length) break;
        var current = options.index($(`#${historyScreen.id} .list-container-over .item.selected`));
        var targetItem = historyScreen.data[current];
        if (!targetItem || !targetItem.id) break;
        home_details.init(
          targetItem,
          function (item) {
            var esc =
              typeof mapper !== "undefined" && mapper.escapeHtml
                ? mapper.escapeHtml
                : function (s) {
                    return String(s == null ? "" : s);
                  };
            $("[id='home-screen']").remove();
            var home_element = document.createElement("div");
            home_element.id = home.id;
            home_element.innerHTML = `
            <div class="content">
              <div class="details full">
                <div class="background">
                  <img src="${esc(item.background)}">
                </div>
                <div class="info">
                  <div class="title resize">${esc(item.title)}</div>
                  <div class="cr-meta-row" id="hero-meta-row">${
                    typeof mapper !== "undefined" && mapper.formatMetaBadges
                      ? mapper.formatMetaBadges(item)
                      : ""
                  }</div>
                  <div class="description resize">${esc(item.description)}</div>
                  <div class="buttons">
                    <a class="selected">${translate.go('home.banner.play')}</a>
                    <a>${translate.go('home.banner.info')}</a>
                  </div>
                </div>
              </div>
              <div class="logo-fixed">
                <img src="server/img/logo-big.png"/>
              </div>
            </div>`;

            var histEl = document.getElementById(historyScreen.id);
            if (histEl) histEl.style.display = "none";
            document.body.appendChild(home_element);
          },
          function () {
            home.destroy();
            var histEl = document.getElementById(historyScreen.id);
            if (histEl) {
              histEl.style.display = "block";
            }
          }
        );
        break;
    }
  },
};
