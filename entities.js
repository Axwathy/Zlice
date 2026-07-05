// entities.js
// ---------- Phase 4: game entities ----------
export class Fruit {
  constructor(x, y, vx, vy, radius = 55, isBomb = false) {
    Object.assign(this, { x, y, vx, vy, radius, isBomb, sliced: false });
  }
  update(dt, gravity = 900) {
    this.vy += gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}

// Fix E: the two halves a fruit becomes when sliced
export class FruitHalf {
  constructor(x, y, vx, vy, radius, color, side) {
    Object.assign(this, { x, y, vx, vy, radius, color, side, rotation: 0, life: 1 });
    this.rotSpeed = side * (2 + Math.random() * 2);
  }
  update(dt, gravity = 900) {
    this.vy += gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotSpeed * dt;
    this.life -= dt * 0.8; // fades out over ~1.25s
  }
}

// Fix F4: small juice-splash particles fired outward on a successful slice
export class Particle {
  constructor(x, y, vx, vy, radius, color) {
    Object.assign(this, { x, y, vx, vy, radius, color, life: 1 });
  }
  update(dt, gravity = 700) {
    this.vy += gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt * 1.6; // quick fade, ~0.6s
  }
}

// UI: distinct pastel fruit skins to draw (watermelon / peach / orange) instead of flat circles.
// Purely cosmetic — every entry still renders inside the same circular hitbox radius,
// so slice detection and physics are completely unaffected.
export const FRUIT_TYPES = [
  { type: "watermelon", main: "#F9AFC0", rind: "#8FCDA8" },
  { type: "peach",      main: "#FFC79A", accent: "#F2A66E" },
  { type: "orange",     main: "#FFB56B", accent: "#F2934C" }
];

export function spawnFruit(width, height) {
  const x = 80 + Math.random() * (width - 160);
  const vx = (Math.random() - 0.5) * 200;
  const vy = -(800 + Math.random() * 300);
  const isBomb = Math.random() < 0.12;
  const fruit = new Fruit(x, height + 40, vx, vy, 55, isBomb); // radius up from 45 -> 55, easier to see/hit
  fruit.fruitType = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)]; // UI only: which cute fruit skin to draw
  fruit.color = fruit.fruitType.main; // UI only: representative color for halves/splash particles
  return fruit;
}
