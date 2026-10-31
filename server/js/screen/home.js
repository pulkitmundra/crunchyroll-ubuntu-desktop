window.home = {
  id: "home-screen",
  data: {
    main: NaN,
  },
  position: 0,
  fromCategory: {
    index: NaN,
    state: false,
  },

  init: function () {
    $("[id='home-screen']").remove();
    home.position = 0;
    home._previewItem = null;
    var home_element = document.createElement("div");
    home_element.id = home.id;

    var poster_items = ``;
    var mainLists = (home.data && home.data.main && Array.isArray(home.data.main.lists))
      ? home.data.main.lists
      : [];
    mainLists.forEach((element, index) => {
      if (element.items && element.items.length > 0) {
        var safeRowTitle =
          typeof mapper !== "undefined" && mapper.escapeHtml
            ? mapper.escapeHtml(element.title)
            : element.title;
        var safeDisplay =
          typeof mapper !== "undefined" && mapper.escapeHtml
            ? mapper.escapeHtml(element.items[0].display)
            : element.items[0].display;
        poster_items += `
      <div class="row">
        <div class="row-title">${safeRowTitle}</div>
        <div class="row-content ${safeDisplay}">`;
        element.items.forEach((item) => {
          poster_items += home.createItem(item);
        });
        for (var index = 0; index < 9; index++) {
          poster_items += home.createEmptyItem(element.items[0].display);
        }
        poster_items += `</div></div>`;
      }
    });

    var esc =
      typeof mapper !== "undefined" && mapper.escapeHtml
        ? mapper.escapeHtml
        : function (s) {
            return String(s == null ? "" : s);
          };

    home_element.innerHTML = `
    <div class="content">
      ${
        home.fromCategory.state
          ? `<div class="browse-back"><span></span><p>${esc(home.fromCategory.title)}</p></div>`
          : ""
      }
      <div class="details full">
        <div class="background">
          <img src="${esc(home.data.main.banner.background)}">
        </div>
        <div class="info">
          <div class="title resize">${esc(home.data.main.banner.title)}</div>
          <div class="cr-meta-row" id="hero-meta-row">${mapper.formatMetaBadges(
            home.data.main.banner
          )}</div>
          <div class="description resize">${esc(
            home.data.main.banner.description
          )}</div>
          <div class="buttons">
            <a class="selected">${translate.go("home.banner.play")}</a>
            <a>${translate.go("home.banner.info")}</a>
          </div>
        </div>
      </div>
      <div class="rows">
        ${poster_items}
      </div>
      <div class="logo-fixed">
        <img src="server/img/logo-big.png"/>
      </div>
    </div>`;

    document.body.appendChild(home_element);

    // Initialize horizontal .row-content carousels FIRST so card widths/heights exist
    // before the vertical .rows carousel measures row heights.
    $(`#${home.id} .rows .row-content`).not(".episode").slick({
      dots: false,
      arrows: false,
      infinite: false,
      slidesToShow: 10,
      slidesToScroll: 1,
      speed: 150,
    });

    $(`#${home.id} .rows .row-content.episode`).slick({
      dots: false,
      arrows: false,
      infinite: false,
      slidesToShow: 5.5,
      slidesToScroll: 1,
      speed: 150,
    });

    $(`#${home.id} .rows`).slick({
      vertical: true,
      dots: false,
      arrows: false,
      infinite: false,
      slidesToShow: 1.5,
      slidesToScroll: 1,
      speed: 150,
    });

    if ($(`#${home.id} .rows`)[0] && $(`#${home.id} .rows`)[0].slick) {
      $(`#${home.id} .rows`)[0].slick.slickGoTo(0);
    }
    if (
      $(`#${home.id} .rows .row-content`)[0] &&
      $(`#${home.id} .rows .row-content`)[0].slick
    ) {
      $(`#${home.id} .rows .row-content`)[0].slick.slickGoTo(0);
    }

    main.state = home.id;
    changelog.init();
  },

  destroy: function () {
    home.position = 0;
    home._previewItem = null;
    $("[id='home-screen']").remove();
  },

  show_details: function () {
    home._previewItem = null;
    var rowEl = $(`#${home.id} .row-content`)[home.position - 1];
    var item =
      home.position > 0 &&
      home.data.main.lists[home.position - 1] &&
      rowEl &&
      rowEl.slick
        ? home.data.main.lists[home.position - 1].items[
            rowEl.slick.currentSlide
          ]
        : home.data.main.banner;
    if (!item) return;
    $(`#${home.id} .details .background img`).attr("src", item.background);
    var title = $(`#${home.id} .details .info .title`)[0];
    if (title) {
      title.innerText = item.title || "";
    }

    var metaRow = document.querySelector(`#${home.id} #hero-meta-row`) || document.getElementById("hero-meta-row");
    if (metaRow && typeof mapper !== "undefined" && mapper.formatMetaBadges) {
      metaRow.innerHTML = mapper.formatMetaBadges(item);
    }

    var description = $(`#${home.id} .details .info .description`)[0];
    if (description) {
      description.innerText = item.description || "";
    }
  },

  keyDown: function (event) {
    switch (event.keyCode) {
      case tvKey.IS_KEY_BACK(event.keyCode):
        if (!home.fromCategory.state) {
          menu.open();
        } else {
          home.destroy();
          browse.init(home.fromCategory.index);
        }
        break;
      case tvKey.KEY_NEXT:
        break;
      case tvKey.KEY_UP:
        $(`#${home.id} .row-content`).removeClass("selected");
        if (home.position > 1) {
          home.position--;
          var rowsEl = $(`#${home.id} .rows`)[0];
          var rowEl = $(`#${home.id} .row-content`)[home.position - 1];
          if (rowsEl && rowsEl.slick) rowsEl.slick.slickGoTo(home.position - 1);
          if (rowEl && rowEl.slick) {
            rowEl.slick.slickGoTo(rowEl.slick.getCurrent());
            rowEl.classList.add("selected");
          }
        } else {
          $(`#${home.id} .details`).addClass("full");
          home.position = 0;
        }
        home.show_details();
        break;
      case tvKey.KEY_DOWN:
        if (!home.data.main || !home.data.main.lists || !home.data.main.lists.length) {
          break;
        }
        if (home.position > 0) {
          $(`#${home.id} .row-content`).removeClass("selected");
          home.position =
            home.position < home.data.main.lists.length
              ? home.position + 1
              : home.position;
          var rowsEl = $(`#${home.id} .rows`)[0];
          var rowEl = $(`#${home.id} .row-content`)[home.position - 1];
          if (home.position <= home.data.main.lists.length && rowsEl && rowsEl.slick && rowEl && rowEl.slick) {
            rowsEl.slick.slickGoTo(home.position - 1);
            rowEl.slick.slickGoTo(rowEl.slick.getCurrent());
          }
          if (rowEl) rowEl.classList.add("selected");
        } else {
          $(`#${home.id} .details.full`).removeClass("full");
          var first_row = $(`#${home.id} .row-content`)[0];
          var rowsEl = $(`#${home.id} .rows`)[0];
          if (rowsEl && rowsEl.slick) rowsEl.slick.slickGoTo(0);
          if (first_row && first_row.slick) {
            first_row.slick.slickGoTo(first_row.slick.getCurrent());
            first_row.classList.add("selected");
          }
          home.position++;
        }
        home.show_details();
        break;
      case tvKey.KEY_LEFT:
        if (home.position > 0) {
          var rowEl = $(`#${home.id} .row-content`)[home.position - 1];
          if (!rowEl || !rowEl.slick || rowEl.slick.currentSlide === 0) {
            if (!home.fromCategory.state) {
              menu.open();
            } else {
              home.destroy();
              browse.init(home.fromCategory.index);
            }
          } else {
            rowEl.slick.prev();
            home.show_details();
          }
        } else {
          var buttons = $(`#${home.id} .details .buttons a`);
          var current = buttons.index($(`#${home.id} .details .buttons a.selected`));
          if (current <= 0) {
            if (!home.fromCategory.state) {
              menu.open();
            } else {
              home.destroy();
              browse.init(home.fromCategory.index);
            }
          } else {
            buttons.removeClass("selected");
            buttons
              .eq(current > 0 ? current - 1 : current)
              .addClass("selected");
          }
        }
        break;
      case tvKey.KEY_RIGHT:
        if (home.position > 0) {
          var currentList = home.data.main.lists[home.position - 1];
          var currentSlide = $(`#${home.id} .row-content`)[home.position - 1];

          if (
            currentList &&
            currentSlide &&
            currentSlide.slick &&
            currentSlide.slick.currentSlide < currentList.items.length - 1
          ) {
            if (home.fromCategory.state && currentList.lazy) {
              if (
                currentList.items.length > 15 &&
                currentSlide.slick.currentSlide > currentList.items.length - 10
              ) {
                var loadRowIndex = home.position - 1;
                currentList.lazy = false;
                home.setRowLoading(loadRowIndex, true);
                mapper.loadCategoryListAsync(
                  `${home.data.main.category},${currentList.id}`,
                  currentList.items.length,
                  20,
                  loadRowIndex,
                  {
                    success: function (response, index) {
                      home.setRowLoading(index, false);
                      if (!home.data || !home.data.main || !home.data.main.lists || !home.data.main.lists[index]) {
                        return;
                      }
                      var newRaw = (response && Array.isArray(response.items)) ? response.items : [];
                      home.data.main.lists[index].lazy = newRaw.length === 20;
                      home.addToList(index, mapper.mapItems(newRaw));
                    },
                    error: function (error) {
                      home.setRowLoading(loadRowIndex, false);
                      console.log(error);
                    },
                  }
                );
              }
            }
            currentSlide.slick.next();
            home.show_details();
          }
        } else {
          var buttons = $(`#${home.id} .details .buttons a`);
          var current = buttons.index($(`#${home.id} .details .buttons a.selected`));
          buttons.removeClass("selected");
          buttons
            .eq(current < buttons.length - 1 ? current + 1 : current)
            .addClass("selected");
        }
        break;
      case tvKey.KEY_ENTER:
      case tvKey.KEY_PANEL_ENTER:
        var rowEl = $(`#${home.id} .row-content`)[home.position - 1];
        var item =
          home.position > 0 &&
          home.data.main.lists[home.position - 1] &&
          rowEl &&
          rowEl.slick
            ? home.data.main.lists[home.position - 1].items[
                rowEl.slick.currentSlide
              ]
            : home._previewItem || home.data.main.banner;
        if (item && item.id) {
          if (home.position === 0) {
            var bannerBtns = $(`#${home.id} .details .buttons a`);
            var selectedIdx = bannerBtns.index(
              $(`#${home.id} .details .buttons a.selected`)
            );
            if (selectedIdx === 0 && typeof home_details.playItem === "function") {
              home_details.playItem(item);
              break;
            }
          }
          home_details.init(item);
        }
        break;
    }
  },

  restart: function () {
    var prevMain =
      !home.fromCategory.state && home.data && home.data.main
        ? home.data.main
        : null;
    home.fromCategory.state = false;
    home.fromCategory.index = NaN;
    loading.start();
    var fetchHome = function (isRetry) {
      service.home({
        success: function (response) {
          mapper.home(response, {
            success: function () {
              home.init();
              loading.end();
            },
          });
        },
        error: function (error) {
          if (!isRetry && typeof session !== "undefined" && typeof session.refresh === "function") {
            session.refresh({
              success: function () {
                fetchHome(true);
              },
              error: function () {
                loading.end();
                if (prevMain) {
                  home.data.main = prevMain;
                  home.init();
                }
              },
            });
            return;
          }
          loading.end();
          if (prevMain) {
            home.data.main = prevMain;
            home.init();
          }
          console.log(error);
        },
      });
    };
    fetchHome(false);
  },

  setRowLoading: function (index, isLoading) {
    var currentSlide = $(`#${home.id} .row-content`)[index];
    if (!currentSlide) return;
    var existingLoaders = currentSlide.querySelectorAll(".item.row-lazy-loader");
    for (var i = 0; i < existingLoaders.length; i++) {
      existingLoaders[i].classList.remove("row-lazy-loader");
      var sp = existingLoaders[i].querySelector(".row-lazy-spinner");
      if (sp) sp.remove();
    }
    if (isLoading) {
      var firstEmpty = currentSlide.querySelector(".item.empty");
      if (firstEmpty) {
        firstEmpty.classList.add("row-lazy-loader");
        var posterEl = firstEmpty.querySelector(".poster");
        if (posterEl && !posterEl.querySelector(".row-lazy-spinner")) {
          var spinner = document.createElement("div");
          spinner.className = "row-lazy-spinner";
          spinner.innerHTML =
            '<i class="fa-solid fa-circle-notch fa-spin"></i><span>Loading...</span>';
          posterEl.appendChild(spinner);
        }
      }
    }
  },

  addToList: function (index, newItems) {
    home.setRowLoading(index, false);
    if (!newItems || !newItems.length) return;
    if (!home.data || !home.data.main || !home.data.main.lists || !home.data.main.lists[index]) return;
    var itemsCount = home.data.main.lists[index].items.length;
    var currentSlide = $(`#${home.id} .row-content`)[index];
    if (!currentSlide || !currentSlide.slick) return;
    var savedSlide = currentSlide.slick.currentSlide || 0;
    var track = currentSlide.querySelector(".slick-track");
    var savedPosX =
      track && typeof track._posX === "number" ? track._posX : null;

    home.data.main.lists[index].items =
      home.data.main.lists[index].items.concat(newItems);

    // remove empty items for prevent move error
    for (var i = 0; i < 9; i++) {
      currentSlide.slick.slickRemove(itemsCount + 8 - i);
    }

    // added new items
    newItems.forEach((element) =>
      currentSlide.slick.slickAdd(home.createItem(element))
    );

    // added empty items for prevent move error
    for (var i = 0; i < 9; i++) {
      currentSlide.slick.slickAdd(home.createEmptyItem(newItems[0].display));
    }

    currentSlide.slick.currentSlide = savedSlide;
    var updatedTrack = currentSlide.querySelector(".slick-track");
    if (updatedTrack && savedPosX !== null && savedPosX > 0) {
      updatedTrack._posX = savedPosX;
      updatedTrack.style.transition = "none";
      updatedTrack.style.transform =
        "translate3d(" + -savedPosX + "px, 0px, 0px)";
    } else if (!document.body.classList.contains("mouse-mode")) {
      currentSlide.slick.slickGoTo(savedSlide, true);
    }
  },

  createItem: function (item) {
    var esc =
      typeof mapper !== "undefined" && mapper.escapeHtml
        ? mapper.escapeHtml
        : function (s) {
            return String(s == null ? "" : s);
          };
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
      ? `<div class="cr-card-title">${esc(item.title)}</div>`
      : "";
    return `
    <div class="item">
      <div class="poster ${esc(item.display)}">
        ${
          item.display !== "serie"
            ? '<img src="' + esc(item.background) + '">' + playhead
            : '<img src="' + esc(item.poster) + '">'
        }
        ${badges}
        ${titleOverlay}
      </div>
    </div>`;
  },

  createEmptyItem: function (type) {
    return `
    <div class="item empty">
      <div class="poster ${type}">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=">
      </div>
    </div>`;
  },
};
