import { getDisplayTitle } from "../src/display-title.js";

const island = document.getElementById("island");
const title = document.getElementById("title");
const closeButton = document.getElementById("close");

const classes = ["tone-neutral", "tone-busy", "tone-ask"];

closeButton.addEventListener("click", () => {
  window.floatingIsland.close();
});

window.floatingIsland.onState(renderState);
window.floatingIsland.getState().then(renderState);

function renderState(state) {
  for (const className of classes) {
    island.classList.remove(className);
  }

  island.classList.add(`tone-${state.tone}`);
  island.dataset.action = state.action;
  title.textContent = getDisplayTitle(state);

  island.classList.remove("animate");
  requestAnimationFrame(() => {
    island.classList.add("animate");
  });
}
