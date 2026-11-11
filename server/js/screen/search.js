window.search = {
  id: "search-screen",
  previous: NaN,
  input: NaN,
  position: -1,
  last_postion: 0,
  items_per_row: 9,
  scroll_data: {
    item_padding: 30,
    item_height: 390,
    rows: 10,
  },
  data: {
    result: [],
  },

  recentKey: "cr_recent_searches",

  getRecentSearches: function () {
    try {
      var raw = window.localStorage.getItem(search.recentKey);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter(function (q) {
            return typeof q === "string" && q.trim().length >= 2;
          });
        }
      }
    } catch (e) {}
    return [];
  },

  saveRecentSearch: function (query) {
    var clean = String(query || "").trim();
    if (clean.length < 2) return;
    var list = search.getRecentSearches().filter(function (q) {
      return q.toLowerCase() !== clean.toLowerCase();
    });
    list.unshift(clean);
    if (list.length > 6) {
      list = list.slice(0, 6);
    }
    try {
      window.localStorage.setItem(search.recentKey, JSON.stringify(list));
    } catch (e) {}
    search.renderRecentSearches();
  },

  removeRecentSearch: function (query) {
    var clean = String(query || "").trim();
    var list = search.getRecentSearches().filter(function (q) {
      return q.toLowerCase() !== clean.toLowerCase();
    });
    try {
      window.localStorage.setItem(search.recentKey, JSON.stringify(list));
    } catch (e) {}
    search.renderRecentSearches();
  },

  clearRecentSearches: function () {
    try {
      window.localStorage.removeItem(search.recentKey);
    } catch (e) {}
    search.renderRecentSearches();
    if (typeof window.showToast === "function") {
      window.showToast("Cleared recent searches", "removed");
    }
  },

  renderRecentSearches: function () {
    var barEl = document.getElementById("search-recent-bar");
    if (!barEl) return;
    var list = search.getRecentSearches();
    if (!list.length) {
      barEl.innerHTML = "";
      barEl.style.display = "none";
      return;
    }
    var esc =
      typeof mapper !== "undefined" && mapper.escapeHtml
        ? mapper.escapeHtml
        : function (s) {
            return String(s == null ? "" : s)
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#39;");
          };
    barEl.style.display = "flex";
    barEl.innerHTML =
      `<span class="search-recent-label"><i class="fa-solid fa-clock-rotate-left"></i> Recent:</span>` +
      list
        .map(function (q) {
          var safeQ = esc(q);
          return `<div class="recent-search-chip" data-query="${safeQ}"><span class="recent-chip-text">${safeQ}</span><button type="button" class="recent-chip-remove" data-remove-query="${safeQ}" title="Remove from recent searches"><i class="fa-solid fa-xmark"></i></button></div>`;
        })
        .join("") +
      `<button type="button" id="search-recent-clear" class="recent-clear-all" title="Clear all recent searches">Clear All</button>`;
  },

  _liveTimer: null,

  init: function () {
    if (search._liveTimer) {
      clearTimeout(search._liveTimer);
      search._liveTimer = null;
    }
    $("[id='search-screen']").remove();
    search.position = -1;
    search.last_postion = 0;
    search.data.result = [];

    var search_element = document.createElement("div");
    search_element.id = search.id;

    search_element.innerHTML = `
      <div class="content">
        <div class="input focus" id="search-screen_input">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input type="text" tabindex="1" spellcheck="false" placeholder="${translate.go("search.placeholder")}">
          <button type="button" id="search-clear-btn" tabindex="-1" title="Clear search">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div id="search-recent-bar" class="search-recent-bar" style="display:none;"></div>
        <div class="list-container">
          <div class="list-container-over" style="grid-template-columns: repeat(${search.items_per_row}, 1fr);"></div>
        </div>
        <div class="logo-fixed">
          <img src="server/img/logo-big.png"/>
        </div>
      </div>`;

    document.body.appendChild(search_element);
    search.renderRecentSearches();
    var inputBox = document.getElementById("search-screen_input");
    search.input = inputBox ? inputBox.querySelector("input") : null;
    var clearBtn = document.getElementById("search-clear-btn");
    if (search.input) {
      search.input.addEventListener("input", function () {
        if (clearBtn) {
          clearBtn.style.display = search.input.value.length > 0 ? "inline-flex" : "none";
        }
        if (search._liveTimer) {
          clearTimeout(search._liveTimer);
          search._liveTimer = null;
        }
        search._liveTimer = setTimeout(function () {
          search._liveTimer = null;
          if (
            document.getElementById(search.id) &&
            search.input &&
            search.input.value.trim().length >= 2
          ) {
            search.start();
          }
        }, 450);
      });
      setTimeout(function () {
        if (search.input) search.input.focus();
      }, 50);
    }
    if (clearBtn && search.input) {
      clearBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (search._liveTimer) {
          clearTimeout(search._liveTimer);
          search._liveTimer = null;
        }
        search.input.value = "";
        clearBtn.style.display = "none";
        $("#search-screen .list-container-over").html("");
        search.data.result = [];
        search.toggleFocus(-1);
        search.input.focus();
      });
    }
  },

  destroy: function () {
    if (search._liveTimer) {
      clearTimeout(search._liveTimer);
      search._liveTimer = null;
    }
    search._reqId++;
    search.data.result = [];
    search.input = null;
    $("[id='search-screen']").remove();
  },

  _reqId: 0,

  start: function (saveImmediate) {
    if (!search.input || !search.input.value.trim()) return;
    var queryStr = search.input.value.trim();
    if (saveImmediate) {
      search.saveRecentSearch(queryStr);
    }
    var currentReq = ++search._reqId;
    loading.start();
    service.search({
      data: {
        query: queryStr,
      },
      success: function (response) {
        if (currentReq !== search._reqId || !document.getElementById(search.id)) {
          loading.end();
          return;
        }
        loading.end();
        search.data.result = mapper.search(response);
        var elements_content = "";
        var esc =
          typeof mapper !== "undefined" && mapper.escapeHtml
            ? mapper.escapeHtml
            : function (s) {
                return String(s == null ? "" : s)
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#39;");
              };
        if (!search.data.result || search.data.result.length === 0) {
          $("#search-screen .list-container-over").html(
            `<div style="grid-column: 1 / -1; color: rgba(255,255,255,0.55); font-size: 1.5rem; padding: 3rem 1rem;">No results found for "${esc(queryStr)}"</div>`
          );
          search.last_postion = 0;
          search.scroll_data.rows = 0;
          return;
        }
        if (queryStr.length >= 3) {
          search.saveRecentSearch(queryStr);
        }
        search.data.result.forEach((element, index) => {
          var badges =
            typeof mapper !== "undefined" && mapper.formatCardBadges
              ? mapper.formatCardBadges(element)
              : "";
          elements_content += `
              <div class="item${index === 0 ? " selected" : ""}">
                <div class="search-poster-wrap">
                  <img src="${esc(element.poster)}" alt="">
                  ${badges}
                </div>
                <div class="title">${esc(element.title)}</div>
              </div>`;
        });

        $("#search-screen .list-container-over").html(elements_content);
        search.last_postion = 0;
        var firstItemEl = $(`#search-screen .list-container-over .item`).get(0);
        if (firstItemEl) {
          search.scroll_data.item_height =
            parseFloat(window.getComputedStyle(firstItemEl).height.replace("px", "")) || 390;
        }
        search.scroll_data.rows = Math.ceil(
          search.data.result.length / search.items_per_row
        );
      },
      error: function (error) {
        if (currentReq !== search._reqId) return;
        loading.end();
        console.log(error);
      },
    });
  },

  toggleFocus: function (newIndex) {
    if (newIndex < 0 || !search.data.result || search.data.result.length === 0) {
      $("#search-screen_input").addClass("focus");
      $(`#${search.id} .list-container`).removeClass("focus");
      search.last_postion = search.position >= 0 ? search.position : search.last_postion;
      newIndex = -1;
    } else {
      if (search.position == -1) {
        $("#search-screen_input").removeClass("focus");
        $(`#${search.id} .list-container`).addClass("focus");
      }
      if (newIndex >= search.data.result.length) newIndex = search.data.result.length - 1;
      $(`#${search.id} .list-container .item`).removeClass("selected");
      $(`#${search.id} .list-container .item`).eq(newIndex).addClass("selected");
    }
    search.position = newIndex;
  },

  scroll: function () {
    if (!search.data.result || search.data.result.length === 0 || search.position < 0) return;
    var current_row = Math.floor(search.position / search.items_per_row);
    var containerEl = $(`#${search.id} .list-container-over`).get(0);
    if (!containerEl) return;
    var firstItemEl = containerEl.querySelector(".item");
    var rowPitch =
      firstItemEl && firstItemEl.offsetHeight
        ? firstItemEl.offsetHeight + 22
        : search.scroll_data.item_height + search.scroll_data.item_padding;
    if (current_row < 2) {
      containerEl.style.marginTop = "0px";
    } else if (!(current_row + 1 >= search.scroll_data.rows)) {
      current_row = current_row - 1;
      containerEl.style.marginTop = `-${current_row * rowPitch}px`;
    } else {
      current_row = Math.max(0, search.scroll_data.rows - 2);
      containerEl.style.marginTop = `-${current_row * rowPitch}px`;
    }
  },

  keyDown: function (event) {
    switch (event.keyCode) {
      case tvKey.IS_KEY_BACK(event.keyCode):
        if (search.position === -1) {
          menu.open();
        } else {
          search.toggleFocus(-1);
        }
        break;
      case tvKey.KEY_NEXT:
        break;
      case tvKey.KEY_UP:
        search.toggleFocus(search.position - search.items_per_row);
        search.scroll();
        break;
      case tvKey.KEY_DOWN:
        if (!search.data.result || search.data.result.length === 0) break;
        var to_index = search.position + search.items_per_row;
        if (search.position == -1) to_index = search.last_postion || 0;
        search.toggleFocus(to_index);
        search.scroll();
        break;
      case tvKey.KEY_LEFT:
        if (search.position <= 0 || search.position % search.items_per_row == 0)
          menu.open();
        else
          search.toggleFocus(search.position - 1);
        break;
      case tvKey.KEY_RIGHT:
        if (
          search.position < 0 ||
          !search.data.result ||
          search.data.result.length === 0 ||
          (search.position + 1) % search.items_per_row == 0
        )
          return;
        search.toggleFocus(search.position + 1);
        break;
      case tvKey.KEY_ENTER:
      case tvKey.KEY_PANEL_ENTER:
        if (this.position === -1) {
          if (search.input && search.input.value.trim().length > 0) {
            search.start();
          } else if (search.input) {
            search.input.focus();
          }
        } else {
          var targetItem = search.data.result && search.data.result[search.position];
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
              if (typeof home !== "undefined" && typeof home.unslick === "function") {
                home.unslick();
              }
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
                    <a class="selected">${translate.go("home.banner.play")}</a>
                    <a>${translate.go("home.banner.info")}</a>
                  </div>
                </div>
              </div>
              <div class="logo-fixed">
                <img src="server/img/logo-big.png"/>
              </div>
            </div>`;

              var sEl = document.getElementById(search.id);
              if (sEl) sEl.style.display = "none";
              document.body.appendChild(home_element);
            },
            function () {
              home.destroy();
              var sEl = document.getElementById(search.id);
              if (sEl) {
                sEl.style.display = "block";
                search.toggleFocus(search.position);
              }
            }
          );
        }
        break;
    }
  },
};
