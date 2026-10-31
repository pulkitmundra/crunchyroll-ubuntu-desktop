window.home_details = {
  id: "home_details-screen",
  previous: NaN,
  listModalOpen: false,
  customLists: [],
  data: {
    this: NaN,
    continue: NaN,
  },
  callbacks: {
    init: NaN,
    destroy: NaN,
  },

  init: function (item, init, destroy) {
    $(`.${home_details.id}`).remove();
    $("#crunchylist-modal").remove();
    home_details.listModalOpen = false;
    home_details.callbacks.init = init;
    home_details.callbacks.destroy = destroy;
    home_details.callbacks.init && home_details.callbacks.init(item);

    // Ensure #hero-meta-row exists and populate initial metadata badges
    var infoEl = document.querySelector(`#${home.id} .details .info`);
    var metaRow = document.getElementById("hero-meta-row");
    if (!metaRow && infoEl) {
      var titleNode = infoEl.querySelector(".title");
      metaRow = document.createElement("div");
      metaRow.id = "hero-meta-row";
      metaRow.className = "cr-meta-row";
      if (titleNode && titleNode.nextSibling) {
        infoEl.insertBefore(metaRow, titleNode.nextSibling);
      } else {
        infoEl.prepend(metaRow);
      }
    }
    if (metaRow && typeof mapper !== "undefined" && mapper.formatMetaBadges) {
      metaRow.innerHTML = mapper.formatMetaBadges(item);
    }

    // Fetch live seriesInfo so star rating, Sub/Dub, maturity, and episode counts are always shown
    if (item && item.id && typeof service.seriesInfo === "function") {
      service.seriesInfo({
        data: { id: item.id },
        success: function (res) {
          if (res && res.data && res.data[0] && typeof mapper !== "undefined") {
            var enriched = mapper.extractMeta(res.data[0]);
            Object.keys(enriched).forEach(function (k) {
              if (enriched[k] && (!item[k] || (Array.isArray(enriched[k]) && enriched[k].length))) {
                item[k] = enriched[k];
              }
            });
            var mRow = document.getElementById("hero-meta-row");
            if (mRow) {
              mRow.innerHTML = mapper.formatMetaBadges(item);
            }
          }
        },
      });
    }

    service.inWatchList({
      data: item.id,
      success: function (response) {
        home_details.inWatchList = response.data.length > 0;
        if (!home_details.inWatchList) {
          var content = `<i class="fa-regular fa-bookmark"></i>
          <p>${translate.go("home.details.add")}</p>`;
        } else {
          var content = `<i class="fa-solid fa-bookmark"></i>
          <p>${translate.go("home.details.remove")}</p>`;
        }
        var wlEl = document.getElementById("watchlist-status");
        if (wlEl) wlEl.innerHTML = content;
      },
      error: function (error) {
        home_details.inWatchList = false;
        console.log(error);
      },
    });
    var buttons = document.createElement("div");
    buttons.className = `${home_details.id} ${home_details.id}_buttons`;
    buttons.innerHTML = `
    <a class="selected" data-action="play">
      <i class="fa-solid fa-play"></i>
      <p>${translate.go("home.details.play", { season: 1, episode: 1 })}</p>
      <span></span>
    </a>
    <a id="watchlist-status" data-action="watchlist">
      <i class="fa-regular fa-bookmark"></i>
      <p>${translate.go("home.details.add")}</p>
    </a>
    <a id="manage-lists-btn" data-action="lists">
      <i class="fa-solid fa-folder-plus"></i>
      <p>Manage Lists</p>
    </a>
    <a data-action="episodes">
      <i class="fa-solid fa-list"></i>
      <p>${translate.go("home.details.episodes")}</p>
    </a>`;

    home_details.data.this = item;
    home_details.data.continue = null;
    $(`#${home.id} .details .info`).append(buttons);

    home_details.refreshContinue(true);

    $(`#${home.id} .details`).addClass("full");
    $(`body`).addClass(`${home_details.id}`);

    if (main.state !== home_details.id) {
      home_details.previous = main.state;
    }
    main.state = home_details.id;
  },

  refreshContinue: function (showLoader) {
    var item = home_details.data.this;
    if (!item || !item.id) return;
    if (item.type === "movie") {
      home_details.data.continue = item;
      $(`.${home_details.id}.${home_details.id}_buttons a[data-action='episodes']`).remove();
      $(`.${home_details.id}.${home_details.id}_buttons a`)
        .eq(0)
        .addClass(`${item.playhead > 0 ? "played" : ""}`)
        .attr("percent", (item.playhead * 100) / item.duration);

      var text = translate.go(
        `home.details.${item.playhead > 0 ? "continue" : "play"}`,
        { season: 0, episode: 0 }
      );
      $(`.${home_details.id}.${home_details.id}_buttons a p`).eq(0).text(text);
      $(`.${home_details.id}.${home_details.id}_buttons a span`)
        .eq(0)
        .width((item.playhead * 100) / item.duration + "%");
    } else {
      if (showLoader) loading.start();
      service.continue({
        data: {
          ids: item.id,
        },
        success: function (response) {
          if (showLoader) loading.end();
          home_details.data.continue = mapper.continue(response);
          if (!home_details.data.continue) {
            return;
          }
          if (!home_details.data.continue.series_id) {
            home_details.data.continue.series_id = item.id;
          }
          $(`.${home_details.id}.${home_details.id}_buttons a`)
            .eq(0)
            .addClass(
              `${home_details.data.continue.played > 0 ? "played" : ""}`
            )
            .attr("percent", home_details.data.continue.played);

          var text = translate.go(
            `home.details.${
              home_details.data.continue.played > 0 ? "continue" : "play"
            }`,
            {
              season: home_details.data.continue.season_number,
              episode: home_details.data.continue.episode_number,
            }
          );
          $(`.${home_details.id}.${home_details.id}_buttons a p`)
            .eq(0)
            .text(text);
          $(`.${home_details.id}.${home_details.id}_buttons a span`)
            .eq(0)
            .width(home_details.data.continue.played + "%");
        },
        error: function (error) {
          if (showLoader) loading.end();
          console.log(error);
        },
      });
    }
  },

  escapeHtml: function (str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  playItem: function (item) {
    if (!item || !item.id) return;
    if (item.type === "movie") {
      video.init(item);
      return;
    }
    loading.start();
    var fallbackFirstEpisode = function () {
      service.seasons({
        data: { id: item.id },
        success: function (sRes) {
          var seasons = mapper.seasons(sRes);
          if (!seasons || !seasons.length) {
            loading.end();
            return;
          }
          service.episodes({
            data: { id: seasons[0].id },
            success: function (epRes) {
              mapper.episodes(epRes, function (episodes) {
                loading.end();
                if (episodes && episodes[0]) {
                  if (!episodes[0].series_id) {
                    episodes[0].series_id = item.id;
                  }
                  home_details.data.continue = episodes[0];
                  video.init(episodes[0]);
                }
              });
            },
            error: function () {
              loading.end();
            },
          });
        },
        error: function () {
          loading.end();
        },
      });
    };

    service.continue({
      data: { ids: item.id },
      success: function (response) {
        var cont = mapper.continue(response);
        if (cont && cont.id) {
          if (!cont.series_id) {
            cont.series_id = item.id;
          }
          home_details.data.continue = cont;
          loading.end();
          video.init(cont);
        } else {
          fallbackFirstEpisode();
        }
      },
      error: function () {
        fallbackFirstEpisode();
      },
    });
  },

  openListManager: function () {
    $("#crunchylist-modal").remove();
    home_details.listModalOpen = true;
    var item = home_details.data.this;
    if (!item) return;

    var modal = document.createElement("div");
    modal.id = "crunchylist-modal";
    modal.className = "open";
    modal.innerHTML = `
      <div class="crunchylist-card">
        <div class="crunchylist-header">
          <div class="crunchylist-title">
            <i class="fa-solid fa-folder-plus"></i>
            <span>Manage Lists</span>
          </div>
          <button type="button" id="crunchylist-close" title="Close (Esc)">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="crunchylist-subtitle">${home_details.escapeHtml(item.title || "")}</div>
        <div class="crunchylist-section">
          <div class="crunchylist-section-label">Main Watchlist</div>
          <div class="crunchylist-row watchlist-row ${home_details.inWatchList ? "active" : ""}" id="crunchylist-watchlist-toggle">
            <div class="crunchylist-row-left">
              <i class="fa-${home_details.inWatchList ? "solid" : "regular"} fa-bookmark"></i>
              <span>Watchlist</span>
            </div>
            <span class="crunchylist-status-pill">${home_details.inWatchList ? "In Watchlist - Click to Remove" : "+ Add to Watchlist"}</span>
          </div>
        </div>
        <div class="crunchylist-section">
          <div class="crunchylist-section-label">Your Custom Lists (Click a list to Add or Remove this anime)</div>
          <div id="custom-lists-body" class="crunchylist-items">
            <div class="crunchylist-empty"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading your custom lists...</div>
          </div>
          <div class="crunchylist-create">
            <input type="text" id="crunchylist-new-input" placeholder="Create a new custom list (e.g. Favorites, Action)..." maxlength="60" spellcheck="false" />
            <button type="button" id="crunchylist-create-btn"><i class="fa-solid fa-plus"></i> Create &amp; Add</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    var closeBtn = document.getElementById("crunchylist-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        home_details.closeListManager();
      });
    }

    var wlToggle = document.getElementById("crunchylist-watchlist-toggle");
    if (wlToggle) {
      wlToggle.addEventListener("click", function (e) {
        e.stopPropagation();
        home_details.toggleWatchlistFromModal();
      });
    }

    var createBtn = document.getElementById("crunchylist-create-btn");
    var newInput = document.getElementById("crunchylist-new-input");
    if (createBtn && newInput) {
      createBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var name = newInput.value.trim();
        if (name) {
          home_details.createNewCustomList(name);
          newInput.value = "";
        }
      });
      newInput.addEventListener("keydown", function (e) {
        if (e.keyCode === 13) {
          e.preventDefault();
          e.stopPropagation();
          var name = newInput.value.trim();
          if (name) {
            home_details.createNewCustomList(name);
            newInput.value = "";
          }
        } else if (e.keyCode === 27) {
          e.preventDefault();
          e.stopPropagation();
          home_details.closeListManager();
        }
      });
    }

    home_details.refreshCustomLists();
  },

  closeListManager: function () {
    home_details.listModalOpen = false;
    $("#crunchylist-modal").remove();
  },

  toggleWatchlistFromModal: function () {
    var item = home_details.data.this;
    if (!item) return;
    mylist.toggleStatus(item.id, !home_details.inWatchList, {
      success: function () {
        home_details.inWatchList = !home_details.inWatchList;
        home_details.listsChanged = true;
        var content = !home_details.inWatchList
          ? `<i class="fa-regular fa-bookmark"></i><p>${translate.go("home.details.add")}</p>`
          : `<i class="fa-solid fa-bookmark"></i><p>${translate.go("home.details.remove")}</p>`;
        var wlEl = document.getElementById("watchlist-status");
        if (wlEl) wlEl.innerHTML = content;
        var modalRow = document.getElementById("crunchylist-watchlist-toggle");
        if (modalRow) {
          modalRow.classList.toggle("active", home_details.inWatchList);
          modalRow.innerHTML = `
            <div class="crunchylist-row-left">
              <i class="fa-${home_details.inWatchList ? "solid" : "regular"} fa-bookmark"></i>
              <span>Watchlist</span>
            </div>
            <span class="crunchylist-status-pill">${home_details.inWatchList ? "In Watchlist - Click to Remove" : "+ Add to Watchlist"}</span>
          `;
        }
      },
      error: function (err) {
        console.log(err);
      },
    });
  },

  refreshCustomLists: function () {
    var item = home_details.data.this;
    var container = document.getElementById("custom-lists-body");
    if (!item || !container) return;

    service.getCustomLists({
      success: function (res) {
        var lists = (res && res.data) || [];
        home_details.customLists = lists;
        if (!lists.length) {
          container.innerHTML = `<div class="crunchylist-empty">You do not have any custom lists yet. Type a name below to create one!</div>`;
          return;
        }
        var remaining = lists.length;
        var membership = {};
        var counts = {};
        lists.forEach(function (lst) {
          service.getCustomListItems({
            data: lst.list_id,
            success: function (itemsRes) {
              var arr = (itemsRes && itemsRes.data) || [];
              counts[lst.list_id] = arr.length;
              membership[lst.list_id] = arr.some(function (entry) {
                var cid =
                  entry.id ||
                  entry.content_id ||
                  (entry.panel && entry.panel.id);
                return cid === item.id;
              });
              remaining--;
              if (remaining === 0) {
                home_details.renderCustomListRows(lists, membership, counts);
              }
            },
            error: function () {
              counts[lst.list_id] = lst.total || 0;
              remaining--;
              if (remaining === 0) {
                home_details.renderCustomListRows(lists, membership, counts);
              }
            },
          });
        });
      },
      error: function () {
        if (container) {
          container.innerHTML = `<div class="crunchylist-empty">Could not load custom lists.</div>`;
        }
      },
    });
  },

  renderCustomListRows: function (lists, membership, counts) {
    var container = document.getElementById("custom-lists-body");
    if (!container) return;
    counts = counts || {};
    container.innerHTML = lists
      .map(function (lst) {
        var isMember = Boolean(membership[lst.list_id]);
        var count = typeof counts[lst.list_id] === "number" ? counts[lst.list_id] : (lst.total || 0);
        var safeTitle = home_details.escapeHtml(lst.title || "");
        var safeId = home_details.escapeHtml(lst.list_id || "");
        return `
        <div class="crunchylist-row custom-list-item ${isMember ? "active" : ""}" data-list-id="${safeId}" data-in-list="${isMember ? "1" : "0"}" data-count="${count}">
          <div class="crunchylist-row-left">
            <i class="${isMember ? "fa-solid fa-square-check" : "fa-regular fa-square"}"></i>
            <span>${safeTitle}</span>
            <span class="crunchylist-row-count">${count} ${count === 1 ? "item" : "items"}</span>
          </div>
          <div class="crunchylist-row-actions">
            <span class="crunchylist-status-pill">${isMember ? "Added - Click to Remove" : "+ Add to List"}</span>
            <button type="button" class="crunchylist-delete-btn" data-delete-list-id="${safeId}" data-delete-list-title="${safeTitle}" title="Delete Custom List">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>`;
      })
      .join("");
  },

  toggleCustomListMembership: function (rowEl) {
    var item = home_details.data.this;
    if (!item || !rowEl) return;
    var listId = rowEl.getAttribute("data-list-id");
    var inList = rowEl.getAttribute("data-in-list") === "1";
    var curCount = parseInt(rowEl.getAttribute("data-count") || "0", 10);
    var method = inList ? "removeCustomListItem" : "addCustomListItem";
    service[method]({
      data: { list_id: listId, content_id: item.id },
      success: function () {
        home_details.listsChanged = true;
        var nowInList = !inList;
        var newCount = Math.max(0, curCount + (nowInList ? 1 : -1));
        rowEl.setAttribute("data-in-list", nowInList ? "1" : "0");
        rowEl.setAttribute("data-count", String(newCount));
        rowEl.classList.toggle("active", nowInList);
        var iconEl = rowEl.querySelector(".crunchylist-row-left i");
        if (iconEl) {
          iconEl.className = nowInList ? "fa-solid fa-square-check" : "fa-regular fa-square";
        }
        var countEl = rowEl.querySelector(".crunchylist-row-count");
        if (countEl) {
          countEl.textContent = newCount + (newCount === 1 ? " item" : " items");
        }
        var pillEl = rowEl.querySelector(".crunchylist-status-pill");
        if (pillEl) {
          pillEl.textContent = nowInList ? "Added - Click to Remove" : "+ Add to List";
        }
      },
    });
  },

  deleteCustomListById: function (listId) {
    if (!listId) return;
    service.deleteCustomList({
      data: { list_id: listId },
      success: function () {
        home_details.listsChanged = true;
        home_details.refreshCustomLists();
      },
    });
  },

  createNewCustomList: function (title) {
    var item = home_details.data.this;
    if (!item || !title) return;
    service.createCustomList({
      data: { title: title },
      success: function (res) {
        home_details.listsChanged = true;
        var newListId =
          (res && res.data && res.data[0] && res.data[0].list_id) ||
          (res && res.list_id);
        if (newListId) {
          service.addCustomListItem({
            data: { list_id: newListId, content_id: item.id },
            success: function () {
              home_details.refreshCustomLists();
            },
            error: function () {
              home_details.refreshCustomLists();
            },
          });
        } else {
          home_details.refreshCustomLists();
        }
      },
    });
  },

  destroy: function () {
    var hadChanges = Boolean(home_details.listsChanged);
    home_details.listsChanged = false;
    home_details.closeListManager();
    $(`body`).removeClass(`${home_details.id}`);
    var vTrack = document.querySelector("#home-screen .rows > .slick-list > .slick-track");
    var isScrolledDown = Boolean(vTrack && typeof vTrack._posY === "number" && vTrack._posY > 10);
    if (document.body.classList.contains("mouse-mode") && !isScrolledDown && typeof home !== "undefined") {
      home.position = 0;
      $(`#${home.id} .content > .details`).addClass("full");
    } else if (typeof home !== "undefined" && home.position > 0) {
      $(`#${home.id} .details.full`).removeClass("full");
    } else if (typeof home !== "undefined" && home.position === 0) {
      $(`#${home.id} .content > .details`).addClass("full");
    }
    $(`.${home_details.id}`).remove();
    home_details.data.continue = NaN;
    home_details.data.this = NaN;
    home_details.inWatchList = false;

    var destroyCb = home_details.callbacks.destroy;
    home_details.callbacks.init = NaN;
    home_details.callbacks.destroy = NaN;
    if (typeof destroyCb === "function") {
      destroyCb();
    }
    if (typeof main !== "undefined" && typeof main.resolveState === "function") {
      main.state = main.resolveState() || home_details.previous;
    } else {
      main.state = home_details.previous;
    }
    if (typeof window.refreshSlickLayouts === "function") {
      window.refreshSlickLayouts();
    }
    if (hadChanges && typeof mylist !== "undefined" && main.state === mylist.id && document.getElementById(mylist.id)) {
      mylist.destroy();
      mylist.init();
    }
  },

  keyDown: function (event) {
    if (home_details.listModalOpen) {
      if (event.keyCode === 27 || tvKey.IS_KEY_BACK(event.keyCode)) {
        home_details.closeListManager();
      }
      return;
    }
    switch (event.keyCode) {
      case tvKey.IS_KEY_BACK(event.keyCode):
      case 27:
        home_details.destroy();
        break;
      case tvKey.KEY_UP:
        var buttons = $(`.${home_details.id}.${home_details.id}_buttons a`);
        var current = buttons.index(
          $(`.${home_details.id}.${home_details.id}_buttons a.selected`)
        );
        buttons.removeClass("selected");
        buttons.eq(current > 0 ? current - 1 : current).addClass("selected");
        break;
      case tvKey.KEY_DOWN:
        var buttons = $(`.${home_details.id}.${home_details.id}_buttons a`);
        var current = buttons.index(
          $(`.${home_details.id}.${home_details.id}_buttons a.selected`)
        );
        buttons.removeClass("selected");
        buttons
          .eq(current < buttons.length - 1 ? current + 1 : current)
          .addClass("selected");
        break;
      case tvKey.KEY_ENTER:
      case tvKey.KEY_PANEL_ENTER:
        var selectedBtn = $(`.${home_details.id}.${home_details.id}_buttons a.selected`);
        var action = selectedBtn.attr("data-action");

        switch (action) {
          case "play":
            if (home_details.data.continue) {
              video.init(home_details.data.continue);
            } else if (home_details.data.this) {
              home_details.playItem(home_details.data.this);
            }
            break;
          case "watchlist":
            loading.start();
            mylist.toggleStatus(
              home_details.data.this.id,
              !home_details.inWatchList,
              {
                success: function () {
                  home_details.inWatchList = !home_details.inWatchList;
                  home_details.listsChanged = true;
                  if (!home_details.inWatchList) {
                    var content = `<i class="fa-regular fa-bookmark"></i>
                    <p>${translate.go("home.details.add")}</p>`;
                  } else {
                    var content = `<i class="fa-solid fa-bookmark"></i>
                    <p>${translate.go("home.details.remove")}</p>`;
                  }
                  var wlEl = document.getElementById("watchlist-status");
                  if (wlEl) wlEl.innerHTML = content;
                  loading.end();
                },
                error: function (error) {
                  console.log(error);
                  loading.end();
                },
              }
            );
            break;
          case "lists":
            home_details.openListManager();
            break;
          case "episodes":
            home_episodes.init(home_details.data.this);
            break;
        }
        break;
    }
  },
};
