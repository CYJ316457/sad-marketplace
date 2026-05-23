export function getDisplayTitle(state = {}) {
  if (typeof state.title === "string" && state.title.trim()) {
    return state.title.trim();
  }

  if (typeof state.action === "string" && state.action.trim()) {
    return state.action.trim().toUpperCase();
  }

  return "IDLE";
}
