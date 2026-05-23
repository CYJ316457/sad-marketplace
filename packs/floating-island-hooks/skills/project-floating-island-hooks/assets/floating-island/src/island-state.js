const ACTIONS = new Map([
  ["idle", "neutral"],
  ["busy", "busy"],
  ["ask", "ask"]
]);

const DEFAULT_STATE = Object.freeze({
  action: "idle",
  tone: "neutral",
  title: "Floating Island",
  message: "Ready",
  progress: 0,
  durationMs: 2400,
  updatedAt: null
});

export function normalizeIslandCommand(command = {}) {
  const action = typeof command.action === "string" ? command.action.trim() : "";

  if (!ACTIONS.has(action)) {
    throw new Error(`Unsupported action: ${action || "(missing)"}`);
  }

  return {
    action,
    tone: ACTIONS.get(action),
    title: cleanText(command.title, defaultTitle(action), 72),
    message: cleanText(command.message, defaultMessage(action), 160),
    progress: clampPercent(command.progress),
    durationMs: clampDuration(command.durationMs),
    updatedAt: new Date().toISOString()
  };
}

export function createIslandState(initialState = {}) {
  let state = {
    ...DEFAULT_STATE,
    ...initialState,
    updatedAt: initialState.updatedAt ?? new Date().toISOString()
  };
  const subscribers = new Set();

  return {
    applyCommand(command) {
      state = {
        ...state,
        ...normalizeIslandCommand(command)
      };

      for (const subscriber of subscribers) {
        subscriber(state);
      }

      return state;
    },
    getState() {
      return state;
    },
    subscribe(subscriber) {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    }
  };
}

function cleanText(value, fallback, maxLength) {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value.trim();
  if (!cleaned) {
    return fallback;
  }

  return cleaned.slice(0, maxLength);
}

function clampPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(number)));
}

function clampDuration(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return DEFAULT_STATE.durationMs;
  }

  return Math.max(300, Math.min(15000, Math.round(number)));
}

function defaultTitle(action) {
  switch (action) {
    case "busy":
      return "Working";
    case "ask":
      return "Input needed";
    default:
      return DEFAULT_STATE.title;
  }
}

function defaultMessage(action) {
  switch (action) {
    case "busy":
      return "Task is running.";
    case "ask":
      return "Waiting for a decision.";
    default:
      return DEFAULT_STATE.message;
  }
}
