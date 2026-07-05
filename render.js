// render.js
// ---------- Phase 5: rendering ----------
import { FRUIT_TYPES } from './entities.js';

let canvas, ctx, currentDpr = 1;

export function initRenderer(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}

// Fix F9 (corrected): cap devicePixelRatio for performance, but store the
// SAME capped value here and reuse it everywhere (draw's clearRect, and the
// hand-position/canvas-size math in main.js). Previously those other spots
// re-read the raw window.devicePixelRatio, which disagreed with the capped
// value used to size canvas.width/height on any screen with a ratio above
// 1.5. That mismatch made clearRect() erase a smaller rectangle than the
// actual canvas, leaving a permanently un-cleared strip along the bottom/
// right edge — every fruit that passed through it stayed smeared on screen
// forever, which is exactly the swept, comet-shaped mass in the screenshot.
export function resizeCanvas() {
  currentDpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * currentDpr;
  canvas.height = rect.height * currentDpr;
  ctx.setTransform(currentDpr, 0, 0, currentDpr, 0, 0);
}

// The rest of the app should size/position things in CSS pixels, not raw
// canvas pixels, so it never has to know about currentDpr itself.
export function getCanvasSize() {
  return { width: canvas.width / currentDpr, height: canvas.height / currentDpr };
}

export function getCanvasElement() {
  return canvas;
}

// Fix F3: smooth, tapered, fading slash trail (segments closer to "now" are
// thicker and more opaque; older segments fade out) instead of one flat line.
function drawTrail(tracker) {
  const pts = tracker.history;
  if (pts.length < 2) return;
  ctx.save();
  ctx.shadowColor = "rgba(247,182,194,0.7)"; // UI: soft pink glow instead of neon green
  ctx.shadowBlur = 10;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const ageRatio = i / (pts.length - 1); // 0 = oldest, 1 = newest
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.strokeStyle = `rgba(247,182,194,${(0.25 + 0.65 * ageRatio).toFixed(2)})`;
    ctx.lineWidth = 3 + 5 * ageRatio;
    ctx.lineCap = "round";
    ctx.stroke();
  }
  ctx.restore();
}

// UI only: draws a fruit as an actual little watermelon/peach/orange instead of a
// flat colored circle. Still fits entirely inside `fruit.radius`, so it has zero
// effect on the (unchanged) circular slice-detection hitbox.
function drawFruitShape(ctx, fruit, ft) {
  const { x, y, radius } = fruit;
  ctx.save();
  if (ft.type === "watermelon") {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = ft.rind;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.78, 0, Math.PI * 2);
    ctx.fillStyle = ft.main;
    ctx.fill();
    ctx.fillStyle = "#5B4636";
    const seeds = [[-0.32, -0.1], [0.05, -0.35], [0.38, -0.05], [-0.15, 0.32], [0.22, 0.34], [-0.4, 0.22]];
    for (const [ox, oy] of seeds) {
      ctx.beginPath();
      ctx.ellipse(x + ox * radius, y + oy * radius, radius * 0.06, radius * 0.09, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (ft.type === "peach") {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = ft.main;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y - radius * 0.85);
    ctx.quadraticCurveTo(x + radius * 0.18, y, x, y + radius * 0.85);
    ctx.strokeStyle = ft.accent;
    ctx.lineWidth = Math.max(2, radius * 0.06);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + radius * 0.15, y - radius * 0.95, radius * 0.22, radius * 0.12, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = "#9BDDBE";
    ctx.fill();
  } else if (ft.type === "orange") {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = ft.main;
    ctx.fill();
    ctx.strokeStyle = ft.accent;
    ctx.lineWidth = Math.max(1.5, radius * 0.04);
    const segs = 6;
    for (let i = 0; i < segs; i++) {
      const angle = (Math.PI * 2 / segs) * i;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * radius * 0.92, y + Math.sin(angle) * radius * 0.92);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(x - radius * 0.1, y - radius * 0.95, radius * 0.22, radius * 0.12, 0.5, 0, Math.PI * 2);
    ctx.fillStyle = "#9BDDBE";
    ctx.fill();
  }
  // shared glossy highlight for a cute glossy-pixel look
  ctx.beginPath();
  ctx.ellipse(x - radius * 0.32, y - radius * 0.35, radius * 0.26, radius * 0.16, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fill();
  ctx.restore();
}

export function draw(gameState, tracker) {
  const w = canvas.width / currentDpr;
  const h = canvas.height / currentDpr;
  ctx.clearRect(0, 0, w, h);

  for (const fruit of gameState.fruits) {
    if (fruit.isBomb) {
      ctx.beginPath();
      ctx.arc(fruit.x, fruit.y, fruit.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#D9CFF2"; // UI: pastel lavender instead of harsh yellow/black
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(fruit.x - fruit.radius * 0.32, fruit.y - fruit.radius * 0.35, fruit.radius * 0.26, fruit.radius * 0.16, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fill();

      // UI: cute worried face instead of a plain "BOMB" label
      ctx.fillStyle = "#5B4636";
      ctx.beginPath();
      ctx.arc(fruit.x - fruit.radius * 0.28, fruit.y - fruit.radius * 0.1, 4, 0, Math.PI * 2);
      ctx.arc(fruit.x + fruit.radius * 0.28, fruit.y - fruit.radius * 0.1, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(fruit.x, fruit.y + fruit.radius * 0.22, fruit.radius * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.strokeStyle = "#5B4636";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.font = "bold 11px 'Pixelify Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("OOPS", fruit.x, fruit.y - fruit.radius * 0.55);
      ctx.textAlign = "left";
    } else {
      drawFruitShape(ctx, fruit, fruit.fruitType || FRUIT_TYPES[0]); // UI: real fruit shapes instead of a plain circle
    }
  }

  // Fix E: draw the two flying/fading halves left behind by a slice
  for (const half of gameState.fruitHalves) {
    ctx.save();
    ctx.globalAlpha = Math.max(half.life, 0);
    ctx.translate(half.x, half.y);
    ctx.rotate(half.rotation);
    const start = half.side === -1 ? Math.PI / 2 : -Math.PI / 2;
    ctx.beginPath();
    ctx.arc(0, 0, half.radius, start, start + Math.PI);
    ctx.closePath();
    ctx.fillStyle = half.color;
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // Fix F4: juice splash particles
  for (const p of gameState.particles) {
    ctx.beginPath();
    ctx.globalAlpha = Math.max(p.life, 0);
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  drawTrail(tracker);
  // score / timer / combo / game-over messaging live in the HTML HUD (see updateHUD)
}

// Fix F8/F9: diffed HUD updates — only touch the DOM when a value actually changes
let hudScoreCache = null, hudTimeCache = null, hudComboCache = null;
export function updateHUD(gameState) {
  const scoreEl = document.getElementById("scoreDisplay");
  const timerEl = document.getElementById("timerDisplay");
  const comboEl = document.getElementById("comboText");

  if (hudScoreCache !== gameState.score) {
    hudScoreCache = gameState.score;
    scoreEl.textContent = `Score: ${gameState.score}`;
  }

  const secs = Math.max(0, Math.ceil(gameState.timeLeft));
  if (hudTimeCache !== secs) {
    hudTimeCache = secs;
    const mm = Math.floor(secs / 60);
    const ss = String(secs % 60).padStart(2, "0");
    timerEl.textContent = `${mm}:${ss}`;
    timerEl.classList.toggle("low-time", secs <= 10);
  }

  const comboVal = gameState.combo > 1 ? gameState.combo : 0;
  if (hudComboCache !== comboVal) {
    hudComboCache = comboVal;
    if (comboVal > 0) {
      comboEl.textContent = `Combo x${comboVal}`;
      comboEl.style.opacity = "1";
    } else {
      comboEl.style.opacity = "0";
    }
  }
}
