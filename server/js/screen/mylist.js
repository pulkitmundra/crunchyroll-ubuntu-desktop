window.mylist = {
  id: "mylist-screen",
  previous: NaN,
  data: {
    loadedLists: 0,
    lists: [],
  },
  selectedRow: 0,

  init: function () {
    var mylist_element = document.createElement("div");
    mylist_element.id = mylist.id;
    loading.start();
    mylist.loadLists({
      success: function () {
        mylist_element.innerHTML = `
        <div class="content">
          <div class="details">
            <div class="background">
              <img id="generic-background"/>
            </div>
            <div class="information">
              <div id="generic-title"></div>
              <div class="extra-info"><div class="cr-meta-row" id="generic-meta-row"></div></div>
              <div id="generic-description"></div>
            </div>
          </div>
          <div class="lists">
            <div class="inner-lists">
              ${mylist.generateLists()}
              <div class="list-end">
                <img src="server/img/empty_data.png"/>
                <div class="text">${translate.go("lists.empty")}</div>
              </div>
            </div>
          </div>
          <div class="logo-fixed">
            <img src="server/img/logo-big.png"/>
          </div>
        </div>`;

        document.body.appendChild(mylist_element);

        $(`#${mylist.id} .lists .row-content`).slick({
          dots: false,
          arrows: false,
          infinite: false,
          slidesToShow: 6.5,
          slidesToScroll: 1,
          speed: 150,
        });
        mylist.details();
        loading.end();
      },
      error: function (error) {
        console.log(error);
        mylist_element.innerHTML = `
        <div class="content">
          <div class="lists">
            <div class="inner-lists">
              <div class="list-end">
                <img src="server/img/empty_data.png"/>
                <div class="text">${translate.go("lists.empty")}</div>
              </div>
            </div>
          </div>
          <div class="logo-fixed">
            <img src="server/img/logo-big.png"/>
          </div>
        </div>`;
        document.body.appendChild(mylist_element);
        loading.end();
      },
    });
  },

  destroy: function () {
    mylist.data.lists = [];
    mylist.data.loadedLists = 0;
    mylist.selectedRow = 0;
    $("[id='mylist-screen']").remove();
  },

  keyDown: function (event) {
    switch (event.keyCode) {
      case tvKey.IS_KEY_BACK(event.keyCode):
      case tvKey.KEY_BACK:
      case tvKey.KEY_ESCAPE:
        menu.open();
        break;
      case tvKey.KEY_UP:
        var options = $(`#${mylist.id} .row`);
        if (!options.length) break;
        var current = mylist.selectedRow;

        options.removeClass("selected");
        var newCurrent = current > 0 ? current - 1 : current;
        options.eq(newCurrent).addClass("selected");
        mylist.selectedRow = newCurrent;
        var rowPitch = options.get(0) ? options.get(0).offsetHeight + 28 : 300;
        var marginTop = 0;
        var max = 1;
        if (options.length > max && newCurrent > max - 1) {
          marginTop = -((newCurrent - (max - 1)) * rowPitch);
        }

        if ($(`#${mylist.id} .inner-lists`)[0]) {
          $(`#${mylist.id} .inner-lists`)[0].style.marginTop = `${marginTop}px`;
        }
        mylist.details();
        break;
      case tvKey.KEY_DOWN:
        var options = $(`#${mylist.id} .row`);
        if (!options.length) break;
        var current = mylist.selectedRow;

        options.removeClass("selected");
        var newCurrent = current < options.length - 1 ? current + 1 : current;
        options.eq(newCurrent).addClass("selected");
        mylist.selectedRow = newCurrent;

        var rowPitch = options.get(0) ? options.get(0).offsetHeight + 28 : 300;
        var marginTop = 0;
        var max = 1;
        if (options.length > max && newCurrent > max - 1) {
          marginTop = -((newCurrent - (max - 1)) * rowPitch);
        }

        if ($(`#${mylist.id} .inner-lists`)[0]) {
          $(`#${mylist.id} .inner-lists`)[0].style.marginTop = `${marginTop}px`;
        }
        mylist.details();
        break;
      case tvKey.KEY_LEFT:
        var rowEl = $(`#${mylist.id} .row-content`)[mylist.selectedRow];
        if (!rowEl || !rowEl.slick || rowEl.slick.currentSlide === 0) {
          menu.open();
        } else {
          rowEl.slick.prev();
          mylist.details();
        }
        break;
      case tvKey.KEY_RIGHT:
        var rowEl = $(`#${mylist.id} .row-content`)[mylist.selectedRow];
        var listObj = mylist.data.lists[mylist.selectedRow];
        if (
          rowEl &&
          rowEl.slick &&
          listObj &&
          rowEl.slick.currentSlide < listObj.items.length - 1
        ) {
          rowEl.slick.next();
          mylist.details();
        }
        break;
      case tvKey.KEY_ENTER:
      case tvKey.KEY_PANEL_ENTER:
        var rowEl = $(`#${mylist.id} .row-content`)[mylist.selectedRow];
        var listObj = mylist.data.lists[mylist.selectedRow];
        if (!rowEl || !rowEl.slick || !listObj) break;
        var item = listObj.items[rowEl.slick.currentSlide];
        if (!item || !item.id) break;
        home_details.init(
          item,
          function (item) {
            $("[id='home-screen']").remove();
            var home_element = document.createElement("div");
            home_element.id = home.id;
            home_element.innerHTML = `
            <div class="content">
              <div class="details full">
                <div class="background">
                  <img src="${mylist.escapeHtml(item.background)}">
                </div>
                <div class="info">
                  <div class="title resize">${mylist.escapeHtml(item.title)}</div>
                  <div class="cr-meta-row" id="hero-meta-row">${
                    typeof mapper !== "undefined" && mapper.formatMetaBadges
                      ? mapper.formatMetaBadges(item)
                      : ""
                  }</div>
                  <div class="description resize">${mylist.escapeHtml(item.description)}</div>
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

            var mlEl = document.getElementById(mylist.id);
            if (mlEl) mlEl.style.display = "none";
            document.body.appendChild(home_element);
          },
          function () {
            home.destroy();
            var mlEl = document.getElementById(mylist.id);
            if (mlEl) {
              mlEl.style.display = "block";
              if (typeof window.refreshSlickLayouts === "function") {
                window.refreshSlickLayouts();
              }
            }
          }
        );
        break;
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

  loadLists: function (callback) {
    service.getCustomLists({
      success: function (responseList) {
        var listToFetch = [
          {
            order: 0,
            title: "lists.watchlist",
            method: "getWatchList",
          },
        ];

        var customLists = (responseList && Array.isArray(responseList.data)) ? responseList.data : [];
        customLists.forEach((customList, index) => {
          listToFetch.push({
            order: index + 1,
            title: customList.title,
            method: "getCustomListItems",
            data: customList.list_id,
          });
        });

        listToFetch.forEach((item) => {
          service[item.method]({
            data: item.data,
            success: function (responseItems) {
              mylist.data.loadedLists++;

              if (responseItems && Array.isArray(responseItems.data) && responseItems.data.length > 0) {
                mylist.data.lists.push({
                  order: item.order,
                  title: item.title,
                  list_id: item.data || "watchlist",
                  items: mapper.mapItems(responseItems.data),
                });
              }

              if (mylist.data.loadedLists === listToFetch.length) {
                mylist.data.lists.sort(function (a, b) {
                  return a.order - b.order;
                });
                callback.success();
              }
            },
            error: function (error) {
              console.log(error);
              mylist.data.loadedLists++;
              if (mylist.data.loadedLists === listToFetch.length) {
                mylist.data.lists.sort(function (a, b) {
                  return a.order - b.order;
                });
                callback.success();
              }
            },
          });
        });
      },
      error: function (error) {
        callback.error(error);
      },
    });
  },

  generateLists: function () {
    var poster_items = ``;
    mylist.data.lists.forEach((element, index) => {
      if (element.items.length > 0) {
        var rowTitleText =
          element.title === "lists.watchlist"
            ? translate.go(element.title)
            : mylist.escapeHtml(element.title);
        var safeListId = mylist.escapeHtml(element.list_id || "watchlist");
        poster_items += `
      <div class="row ${index === mylist.selectedRow ? "selected" : ""}" data-list-id="${safeListId}">
        <div class="row-title">${rowTitleText}</div>
        <div class="row-content fixed-error">`;
        element.items.forEach((item) => {
          poster_items += mylist.createItem(item, element.list_id || "watchlist");
        });
        for (var index = 0; index < 9; index++) {
          poster_items += mylist.createEmptyItem();
        }
        poster_items += `</div></div>`;
      }
    });

    return poster_items;
  },

  createItem: function (item, listId) {
    var remMin =
      item.duration && item.playhead
        ? Math.max(1, Math.round(item.duration - item.playhead))
        : 0;
    var playhead = item.playhead
      ? `<div class="progress" style="width: ${Math.min(
          100,
          (item.playhead * 100) / item.duration
        )}%" value="${remMin}m"></div>`
      : "";
    var badges =
      typeof mapper !== "undefined" && mapper.formatCardBadges
        ? mapper.formatCardBadges(item)
        : "";
    var titleOverlay = item.title
      ? `<div class="cr-card-title">${mylist.escapeHtml(item.title)}</div>`
      : "";
    var safeId = mylist.escapeHtml(item.id || "");
    var safeListId = mylist.escapeHtml(listId || "watchlist");
    var removeBtn = item.id
      ? `<button type="button" class="mylist-quick-remove" data-content-id="${safeId}" data-list-id="${safeListId}" title="Remove from this list"><i class="fa-solid fa-trash-can"></i></button>`
      : "";
    return `
    <div class="item">
      <div class="poster">
        <img src="${mylist.escapeHtml(item.background)}"/>
        ${playhead}
        ${badges}
        ${removeBtn}
        ${titleOverlay}
      </div>
    </div>`;
  },

  removeItemFromList: function (listId, contentId) {
    if (!contentId) return;
    loading.start();
    var onDone = function () {
      loading.end();
      mylist.destroy();
      mylist.init();
    };
    if (!listId || listId === "watchlist") {
      service.removeWatchlist({
        data: { content_id: contentId },
        success: onDone,
        error: onDone,
      });
    } else {
      service.removeCustomListItem({
        data: { list_id: listId, content_id: contentId },
        success: onDone,
        error: onDone,
      });
    }
  },

  createEmptyItem: function (type) {
    return `
    <div class="item empty">
      <div class="poster">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=">
      </div>
    </div>`;
  },

  details: function () {
    try {
      var rowEl = $(`#${mylist.id} .row-content`)[mylist.selectedRow];
      var listObj = mylist.data.lists[mylist.selectedRow];
      if (!rowEl || !rowEl.slick || !listObj) return;
      var item = listObj.items[rowEl.slick.currentSlide];
      if (!item) return;
      $(`#${mylist.id} .details .background img`).attr("src", item.background);
      var title = $(`#${mylist.id} .details .information #generic-title`)[0];
      if (title) {
        title.innerText = item.title;
      }

      var description = $(`#${mylist.id} .details .information #generic-description`)[0];
      if (description) {
        description.innerText = item.description;
      }

      var extraEl = $(`#${mylist.id} .details .information .extra-info`)[0];
      if (extraEl && typeof mapper !== "undefined" && mapper.formatMetaBadges) {
        extraEl.innerHTML = `<div class="cr-meta-row" id="generic-meta-row">${mapper.formatMetaBadges(item)}</div>`;
      }
    } catch (error) {
      console.log(error);
    }
  },

  toggleStatus: function (id, status, callback) {
    var action = status ? "addWatchlist" : "removeWatchlist";
    service[action]({
      data: {
        content_id: id,
      },
      success: callback.success,
      error: callback.error,
    });
  },
};
