window.changelog = {
  id: "changelog-modal",
  data: {
    version: "v2.0.0",
    changes: [
      {
        title: "Star Ratings, Sub | Dub Badges & Custom Lists",
        description:
          "Added Crunchyroll star ratings, Sub | Dub badges on cards and banners, and a Manage Lists modal for Watchlist and Custom Lists.",
      },
      {
        title: "Skip Credits, Skip Recap & Episode Drawer (E)",
        description:
          "Added Skip Recap and Skip Credits alongside Skip Intro, plus an in-player Season Episode Drawer (press E or click the list icon).",
      },
      {
        title: "Premium Scrubber, Full-Pill Volume Drag & Redesigned Login/About",
        description:
          "Upgraded the progress bar with hover timestamp preview, full-pill volume drag, frosted-glass Login screen, and Pulkit Mundra v2.0.0 About section.",
      },
    ],
  },

  init: function () {
    // var changelog_element = document.createElement("div");
    // changelog_element.id = changelog.id;
    // changelog_element.innerHTML = `
    //   <div class="content">
    //     <div class="header">v1.1.5 important announcement</div>
    //     <div class="body">
    //       <div class="text-big">The Crunchyroll OFFICIAL APP is now available for install in the TV STORE.</div>
    //       <div class="text-small">Thanks.</div>
    //     </div>
    //     <div class="footer">
    //       <a class="button ${login.id}-option">OK</a>
    //     </div>
    //   </div>`;
    // session.storage.version = changelog.data.version;
    // session.update();
    // document.body.appendChild(changelog_element);
    // main.state = changelog.id;
  },

  destroy: function () {
    // main.state = home.id;
    // document.body.removeChild(document.getElementById(changelog.id));
  },

  getChanges: function (item) {
    var content_changes = "";
    changelog.data.changes.forEach((element) => {
      content_changes += `
      <li>
        <div class="change-title">
          ${element.title}
        </div>
        <div class="change-description">
          ${element.description} 
        </div>
      </li>`;
    });
    return content_changes;
  },

  keyDown: function (event) {
    switch (event.keyCode) {
      case tvKey.KEY_PANEL_ENTER:
      case tvKey.KEY_ENTER:
      case tvKey.IS_KEY_BACK(event.keyCode):
        changelog.destroy();
        break;
    }
  },
};
