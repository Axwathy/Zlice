// ui-effects.js
// ======================================================================
// UI/UX enhancements — everything here is purely cosmetic (floating score
// popups, a reacting mascot, the bomb-hit flash). None of it reads or
// changes score, timers, physics, or slice detection.
// ======================================================================

let mascotReactionTimeout = null;

export function showCharacterReaction(type) {
  const mascotEl = document.getElementById("mascot");
  if (!mascotEl) return;
  clearTimeout(mascotReactionTimeout);
  mascotEl.dataset.state = type;
  mascotEl.classList.remove("bounce");
  void mascotEl.offsetWidth; // restart animation
  mascotEl.classList.add("bounce");
  mascotReactionTimeout = setTimeout(() => { mascotEl.dataset.state = "idle"; }, 700);
}

export function showScorePopup(points, x, y) {
  if (!points) return;
  const gamePanel = document.getElementById("gamePanel");
  const popup = document.createElement("div");
  popup.className = "score-popup";
  popup.textContent = `+${points}`;
  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;
  gamePanel.appendChild(popup);
  popup.addEventListener("animationend", () => popup.remove());
}

export function triggerBombFlash() {
  const panel = document.getElementById("gamePanel");
  panel.classList.remove("bomb-flash");
  // force reflow so the animation can restart on consecutive bomb hits
  void panel.offsetWidth;
  panel.classList.add("bomb-flash");
  showCharacterReaction("sad"); // UI only: mascot reacts, no gameplay effect
}

// Mascot occasionally peeks/bounces on its own for charm, independent of gameplay.
// Call once during startup.
export function startIdleMascotPeek() {
  setInterval(() => {
    const mascotEl = document.getElementById("mascot");
    if (mascotEl && mascotEl.dataset.state === "idle") {
      mascotEl.dataset.state = "peek";
      setTimeout(() => {
        if (mascotEl.dataset.state === "peek") mascotEl.dataset.state = "idle";
      }, 900);
    }
  }, 7000);
}
