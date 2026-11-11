const requestAnimationFrame = window.requestAnimationFrame;
const cancelAnimationFrame = window.cancelAnimationFrame;

const REPEAT_INTERVAL_MS = 180;

let gpIndex = -1;
let rafId = null;
let enabled = window.localStorage.getItem("controllerSupport") === "ENABLE";
const buttonRepeatState = Object.create(null);

function clearButtonRepeatState() {
  for (const key of Object.keys(buttonRepeatState)) {
    delete buttonRepeatState[key];
  }
}

function stopLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  clearButtonRepeatState();
}

function startLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (!enabled || gpIndex === -1) {
    clearButtonRepeatState();
    return;
  }
  rafId = requestAnimationFrame(updateLoop);
}

const setupGamepadEventListener = () => {
  if (!window.localStorage.getItem("controllerSupportInitialized")) {
    // set default value, which is ENABLE
    window.localStorage.setItem("controllerSupport", "ENABLE");
    window.localStorage.setItem("controllerSupportInitialized", "1");
    enabled = true;
  }

  const handleController = (event) => {
    if (!event || !event.gamepad) return;
    gpIndex = event.gamepad.index;
    const pads = navigator.getGamepads ? navigator.getGamepads() : null;
    const gp = pads ? pads[gpIndex] : null;
    if (!gp) return;

    if (enabled) {
      startLoop();
    } else {
      stopLoop();
    }
  };

  const handleControllerDisconnect = (event) => {
    if (event && event.gamepad && event.gamepad.index === gpIndex) {
      gpIndex = -1;
      stopLoop();
    }
  };

  window.addEventListener("gamepadconnected", handleController);
  window.addEventListener("gamepaddisconnected", handleControllerDisconnect);

  if (enabled && gpIndex === -1 && navigator.getGamepads) {
    const pads = navigator.getGamepads();
    for (let i = 0; i < pads.length; i++) {
      if (pads[i] && pads[i].connected) {
        gpIndex = pads[i].index;
        startLoop();
        break;
      }
    }
  }
};

const updateLoop = () => {
  rafId = null;
  if (!enabled || gpIndex === -1) {
    stopLoop();
    return;
  }
  const pads = navigator.getGamepads ? navigator.getGamepads() : null;
  const gp = pads ? pads[gpIndex] : null;
  if (!gp) {
    gpIndex = -1;
    stopLoop();
    return;
  }

  controllerNavigation(gp);

  if (enabled && gpIndex !== -1) {
    rafId = requestAnimationFrame(updateLoop);
  }
};

function sendButtonPress(buttonKey, buttonPressed) {
  const now = performance.now();
  const last = buttonRepeatState[buttonKey];
  if (last === undefined || now - last >= REPEAT_INTERVAL_MS) {
    buttonRepeatState[buttonKey] = now;
    if (window.electronUtilsRender?.gamepadButtonPress) {
      window.electronUtilsRender.gamepadButtonPress(buttonPressed);
    }
  }
}

function pollButton(buttonKey, buttonObj, actionName) {
  if (buttonObj && buttonObj.pressed) {
    sendButtonPress(buttonKey, actionName);
  } else if (buttonRepeatState[buttonKey] !== undefined) {
    delete buttonRepeatState[buttonKey];
  }
}

const controllerNavigation = (gp) => {
  const el = document.activeElement;
  const dPadUp = gp.buttons[12];
  const dPadDown = gp.buttons[13];
  const dPadLeft = gp.buttons[14];
  const dPadRight = gp.buttons[15];
  const aButton = gp.buttons[0];
  const bButton = gp.buttons[1];

  try {
    pollButton("dPadUp", dPadUp, el?.role === "menuitemradio" ? "up" : "dPadUp");
    pollButton("dPadDown", dPadDown, el?.role === "menuitemradio" ? "down" : "dPadDown");
    pollButton("dPadLeft", dPadLeft, "dPadLeft");
    pollButton("dPadRight", dPadRight, "dPadRight");
    pollButton("aButton", aButton, "aButton");
    pollButton("bButton", bButton, "bButton");
  } catch (e) {
    console.error("error while listening for section buttons", e);
  }
};

window.setControllerEnabled = (b) => {
  enabled = Boolean(b);
  if (!enabled) {
    stopLoop();
    return;
  }
  if (gpIndex === -1 && navigator.getGamepads) {
    const pads = navigator.getGamepads();
    for (let i = 0; i < pads.length; i++) {
      if (pads[i] && pads[i].connected) {
        gpIndex = pads[i].index;
        break;
      }
    }
  }
  if (gpIndex !== -1) {
    startLoop();
  }
};

setTimeout(setupGamepadEventListener, 1500);
