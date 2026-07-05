// game.js
// ---------- Config & core game state/logic ----------
import { FruitHalf, Particle, spawnFruit } from './entities.js';
import { isSlice } from './tracker.js';
import { showCharacterReaction, showScorePopup, triggerBombFlash } from './ui-effects.js';

export const GAME_DURATION = 45;         // Fix F5: timer-based game instead of lives
export const BOMB_PENALTY = 15;          // Fix F5: bombs cost points instead of a life
export const GOOD_SCORE_THRESHOLD = 150; // Fix F7: score needed for a "Great Job" result
export const COMBO_WINDOW = 0.6;
const SPAWN_INTERVAL = 0.6;
const MAX_FRUITS_ON_SCREEN = 8; // safety cap, see updateGame
const HIGH_SCORE_KEY = "zliceHighScore";

export function getHighScore() {
  try { return parseInt(localStorage.getItem(HIGH_SCORE_KEY) || "0", 10) || 0; }
  catch (e) { return 0; }
}
export function setHighScore(v) {
  try { localStorage.setItem(HIGH_SCORE_KEY, String(v)); } catch (e) { /* storage unavailable, ignore */ }
}

// Fix F5: no more `lives` field — replaced with a countdown `timeLeft`.
// Fix F4: added `particles` array for the juice-splash effect.
// `resultShown` lives on gameState itself (rather than a separate module-level
// variable) so main.js can read and reset it without needing a setter export.
export const gameState = {
  score: 0, combo: 0, comboTimer: 0,
  timeLeft: GAME_DURATION,
  fruits: [], fruitHalves: [], particles: [],
  gameOver: false, resultShown: false
};

let spawnTimer = 0;

function spawnFruitHalves(fruit) {
  const color = fruit.color || "#F7B6C2"; // UI: match the pastel fruit skin
  gameState.fruitHalves.push(
    new FruitHalf(fruit.x, fruit.y, fruit.vx - 140, fruit.vy - 80, fruit.radius, color, -1),
    new FruitHalf(fruit.x, fruit.y, fruit.vx + 140, fruit.vy - 80, fruit.radius, color, 1)
  );
}

function spawnJuiceSplash(fruit) {
  // Fix F4: visible juice/splash effect instead of a bare split
  const count = 10;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 150 + Math.random() * 250;
    gameState.particles.push(new Particle(
      fruit.x, fruit.y,
      Math.cos(angle) * speed, Math.sin(angle) * speed - 100,
      2 + Math.random() * 3,
      "#FFD3AE" // UI: pastel peach splash instead of orange-red
    ));
  }
  // ---- UI only below: floating score popup + happy mascot reaction ----
  showScorePopup(10 * gameState.combo, fruit.x, fruit.y);
  showCharacterReaction("happy");
}

export function updateGame(dt, tracker, canvas) {
  if (gameState.gameOver) return;

  // Fix F5: countdown replaces the lives system
  gameState.timeLeft -= dt;
  if (gameState.timeLeft <= 0) {
    gameState.timeLeft = 0;
    gameState.gameOver = true;
  }

  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    // Fix (safety net): even with the frame-timing fix in main.js, cap how many
    // fruit can be on screen at once so a slow device can never visually flood
    // the play field — extra spawns are simply skipped until some clear.
    if (gameState.fruits.length < MAX_FRUITS_ON_SCREEN) {
      gameState.fruits.push(spawnFruit(canvas.width, canvas.height));
    }
    spawnTimer = SPAWN_INTERVAL;
  }
  gameState.comboTimer -= dt;
  if (gameState.comboTimer <= 0) gameState.combo = 0;

  for (const fruit of gameState.fruits) {
    fruit.update(dt);
    if (!fruit.sliced && isSlice(tracker, fruit)) {
      fruit.sliced = true;
      if (fruit.isBomb) {
        // Fix F5: bombs no longer cost a life — they cost points instead
        gameState.score = Math.max(0, gameState.score - BOMB_PENALTY);
        gameState.combo = 0;
        triggerBombFlash();
      } else {
        gameState.combo += 1;
        gameState.comboTimer = COMBO_WINDOW;
        gameState.score += 10 * gameState.combo;
        spawnFruitHalves(fruit);   // Fix E: visible split instead of just disappearing
        spawnJuiceSplash(fruit);   // Fix F4: juice splash effect
      }
    }
    // Fix: previously only non-bomb fruit were cleaned up when missed, so an
    // uncut bomb falling off-screen stayed in the array forever, permanently
    // eating into MAX_FRUITS_ON_SCREEN until no new fruit could spawn at all.
    // Missing a bomb is fine (no penalty) — it just needs to be removed too.
    if (!fruit.sliced && fruit.y - fruit.radius > canvas.height) {
      fruit.sliced = true;
      if (!fruit.isBomb) gameState.combo = 0; // Fix F5: a miss just breaks the combo, no life lost
    }
  }
  // sliced fruit (hit or missed) is removed immediately now — hits are represented
  // by the fruitHalves below instead of a lingering muted-color whole fruit
  gameState.fruits = gameState.fruits.filter(f => !f.sliced);

  gameState.fruitHalves.forEach(h => h.update(dt));
  gameState.fruitHalves = gameState.fruitHalves.filter(h => h.life > 0);

  gameState.particles.forEach(p => p.update(dt));
  gameState.particles = gameState.particles.filter(p => p.life > 0);
}

export function resetGame() {
  Object.assign(gameState, {
    score: 0, combo: 0, comboTimer: 0,
    timeLeft: GAME_DURATION,
    fruits: [], fruitHalves: [], particles: [],
    gameOver: false, resultShown: false
  });
  spawnTimer = 0;
  document.getElementById("gameOverScreen").style.display = "none";
  const mascotEl = document.getElementById("mascot");
  if (mascotEl) mascotEl.dataset.state = "idle"; // UI only
}

// Fix F7: win / lose / high-score result screen
export function endGame() {
  gameState.resultShown = true;
  const prevHigh = getHighScore();
  const isNewHigh = gameState.score > prevHigh;
  if (isNewHigh) setHighScore(gameState.score);

  const title = document.getElementById("resultTitle");
  const subtitle = document.getElementById("resultSubtitle");
  if (isNewHigh) {
    title.textContent = "🏆 New High Score!";
    subtitle.textContent = "Incredible slicing — that's your new best!";
  } else if (gameState.score >= GOOD_SCORE_THRESHOLD) {
    title.textContent = "🎉 Great Job!";
    subtitle.textContent = "Nice reflexes — you win this round!";
  } else {
    title.textContent = "🍌 Try Again";
    subtitle.textContent = "You can slice a lot more than that!";
  }
  document.getElementById("finalScoreText").textContent = `Final Score: ${gameState.score}`;
  document.getElementById("highScoreText").textContent = `High Score: ${Math.max(prevHigh, gameState.score)}`;
  const overCritter = document.getElementById("gameOverCritter");
  if (overCritter) overCritter.dataset.state = (isNewHigh || gameState.score >= GOOD_SCORE_THRESHOLD) ? "happy" : "sad"; // UI only
  document.getElementById("gameOverScreen").style.display = "flex";
}
