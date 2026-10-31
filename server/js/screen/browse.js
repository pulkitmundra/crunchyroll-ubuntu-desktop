window.browse = {
  id: "browse-screen",
  data: {
    categories: [],
    main: [],
  },

  init: function (selected) {
    var browse_element = document.createElement("div");
    browse_element.id = browse.id;

    loading.start();
    service.categories({
      success: function (response) {
        browse.data.categories = (response && response.items) || [];
        var elements = "";
        var esc =
          typeof mapper !== "undefined" && mapper.escapeHtml
            ? mapper.escapeHtml
            : function (s) {
                return String(s == null ? "" : s);
              };
        browse.data.categories.forEach((element, index) => {
          var lowImg =
            element.images &&
            element.images.low &&
            element.images.low[0] &&
            element.images.low[0].source
              ? element.images.low[0].source
              : "";
          var title =
            element.localization && element.localization.title
              ? element.localization.title
              : "";
          elements += `
          <li class="item${index === (selected || 0) ? " focus" : ""}">
            <img src="${esc(lowImg)}"/>
            ${esc(title)}
          </li>`;
        });

        browse_element.innerHTML = `
        <div class="content">
          <img id="browse-background"/>
          <div id="browse-menu">
            <div class="browse-header">
              <span class="browse-eyebrow">Catalog</span>
              <h1 class="browse-title">Browse Categories</h1>
            </div>
            <div class="browse-content">
              <ul class="browse-content-wrapper">
                ${elements}
              </ul>
            </div>
          </div>
        </div>`;

        document.body.appendChild(browse_element);
        if (!document.getElementById(menu.id)) {
          menu.init();
        }
        loading.end();
        browse.move("down");
        browse.move("up");
      },
      error: function (error) {
        loading.end();
        console.log(error);
      },
    });
    main.state = browse.id;
  },

  destroy: function () {
    $("[id='browse-screen']").remove();
  },

  keyDown: function (event) {
    switch (event.keyCode) {
      case tvKey.KEY_LEFT:
      case tvKey.IS_KEY_BACK(event.keyCode):
      case 27:
        if (!document.getElementById(menu.id)) {
          menu.init();
        }
        menu.open();
        break;
      case tvKey.KEY_UP:
        browse.move("up");
        break;
      case tvKey.KEY_DOWN:
        browse.move("down");
        break;
      case tvKey.KEY_ENTER:
      case tvKey.KEY_PANEL_ENTER:
        var options = $(".browse-content .item");
        var selectedIdx = options.index($(".browse-content .item.focus"));
        if (selectedIdx < 0) selectedIdx = 0;
        var current =
          browse.data.categories && browse.data.categories[selectedIdx];
        if (!current) break;
        var selectedTitle =
          current.localization && current.localization.title
            ? current.localization.title
            : "";

        loading.start();
        home.data.main = null;
        mapper.listByCategories(
          current.tenant_category,
          current.sub_categories || [],
          {
            success: function () {
              loading.end();
              home.fromCategory.state = true;
              home.fromCategory.index = selectedIdx;
              home.fromCategory.title = selectedTitle;
              home.init();
              browse.destroy();
            },
            error: function (error) {
              loading.end();
              console.log(error);
            },
          }
        );
        break;
    }
  },

  move: function (direction) {
    var options = $(".browse-content .item");
    if (!options.length) return;
    var current = options.index($(".browse-content .item.focus"));
    if (current < 0) current = 0;

    options.removeClass("focus");

    if (direction === "up") {
      var newCurrent = current > 0 ? current - 1 : current;
    } else {
      var newCurrent = current < options.length - 1 ? current + 1 : current;
    }

    options.eq(newCurrent).addClass("focus");
    var cat = browse.data.categories && browse.data.categories[newCurrent];
    var bgArr =
      cat && cat.images && Array.isArray(cat.images.background)
        ? cat.images.background
        : [];
    var bgSrc =
      (bgArr[4] && bgArr[4].source) ||
      (bgArr[bgArr.length - 1] && bgArr[bgArr.length - 1].source) ||
      "";
    $("#browse-background").attr("src", bgSrc);

    var marginTop = 0;
    var max = 9;
    var firstEl = options.get(0);
    var itemPitch = firstEl ? firstEl.offsetHeight + 10 : 64;
    if (options.length > max && newCurrent > max - 1) {
      marginTop = -((newCurrent - (max - 1)) * itemPitch);
    }

    var wrapperEl = $(".browse-content-wrapper")[0];
    if (wrapperEl) {
      wrapperEl.style.marginTop = `${marginTop}px`;
    }
  },
};
