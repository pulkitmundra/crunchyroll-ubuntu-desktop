window.loading = {
  id: "loading-screen",
  active: false,

  start: function () {
    if(!document.getElementById(loading.id)) {
      loading.active = true;
      var loading_element = document.createElement("div");
      loading_element.id = loading.id;
      loading_element.className = "flat";
      loading_element.innerHTML = `
      <div class="content flat">
        <div class="loading"></div>
      </div>`;
      document.body.appendChild(loading_element);
    }
    loading.active = true;
  },

  end: function () {
    $("[id='loading-screen']").remove();
    loading.active = false;
  },

  init: function () {
    $("[id='loading-screen']").remove();
    var loading_element = document.createElement("div");
    loading_element.id = loading.id;

    loading_element.innerHTML = `
    <div class="content">
      <div class="logo">
        <img src="server/img/logo.png" alt="">
      </div>
      <div class="loading">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>`;
    document.body.appendChild(loading_element);

    main.state = loading.id;
  },

  destroy: function () {
    $("[id='loading-screen']").remove();
    loading.active = false;
  },

  keyDown: function (event) {
    switch (event.keyCode) {
      case tvKey.IS_KEY_BACK(event.keyCode):
      case tvKey.KEY_EXIT:
        exit.init(true);
        break;
    }
  },
};
