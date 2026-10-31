window.historyScreen = {
  id: "history-screen",
  data: [],

  init: function () {
    var history_element = document.createElement("div");
    history_element.id = historyScreen.id;

    history_element.innerHTML = `
    <div class="content">
      <div class="screen-header">
        <span class="screen-eyebrow">Activity</span>
        <h1 class="screen-title">Watch History</h1>
      </div>
      <div class="list-container">
        <div class="list-container-over" id="history-list"></div>
      </div>
      <div class="logo-fixed">
        <img src="server/img/logo-big.png"/>
      </div>
    </div>`;

    document.body.appendChild(history_element);

    loading.start();
    service.history({
      success: function (response) {
        var elements = "";
        historyScreen.data = mapper.history(response);
        if (!historyScreen.data || historyScreen.data.length === 0) {
          document.getElementById("history-list").innerHTML =
            `<div class="history-empty">No watch history yet.</div>`;
          loading.end();
          return;
        }
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
          elements += `
          <div class="item${index === 0 ? " selected" : ""}">
            <img src="${esc(element.background)}" alt="">
            ${badges}
            <div class="history-card-info">
              <div class="history-series-title">${esc(element.title || "")}</div>
              ${epMeta ? `<div class="history-ep-title">${esc(epMeta)}</div>` : ""}
            </div>
            ${historyScreen.view(element)}
          </div>`;
        });
        document.getElementById("history-list").innerHTML = elements;
        loading.end();
      },
      error: function (error) {
        loading.end();
        console.log(error);
      },
    });
  },

  destroy: function () {
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
