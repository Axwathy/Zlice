import { describe, it, expect } from 'vitest';
import { Fruit, FruitHalf, Particle, FRUIT_TYPES, spawnFruit } from './entities.js';

describe('Fruit', () => {
  it('applies gravity then integrates position using the updated velocity', () => {
    const f = new Fruit(0, 0, 100, -50, 55, false);
    f.update(1, 900);
    // vy = -50 + 900*1 = 850; x = 0 + 100*1 = 100; y = 0 + 850*1 = 850
    expect(f.vy).toBeCloseTo(850);
    expect(f.x).toBeCloseTo(100);
    expect(f.y).toBeCloseTo(850);
  });

  it('defaults gravity to 900 when not provided', () => {
    const f = new Fruit(0, 0, 0, 0);
    f.update(1);
    expect(f.vy).toBeCloseTo(900);
  });

  it('starts unsliced', () => {
    const f = new Fruit(0, 0, 0, 0);
    expect(f.sliced).toBe(false);
  });
});

describe('FruitHalf', () => {
  it('fades life at a rate of 0.8 per second', () => {
    const h = new FruitHalf(0, 0, 10, 10, 20, 'red', 1);
    h.update(0.5, 900);
    expect(h.life).toBeCloseTo(1 - 0.5 * 0.8);
  });

  it('rotates using a speed derived from its side', () => {
    const hRight = new FruitHalf(0, 0, 0, 0, 20, 'red', 1);
    const hLeft = new FruitHalf(0, 0, 0, 0, 20, 'red', -1);
    // rotSpeed = side * (2 + random*2), so sign should always match side
    expect(hRight.rotSpeed).toBeGreaterThan(0);
    expect(hLeft.rotSpeed).toBeLessThan(0);
    const speedBefore = hRight.rotSpeed;
    hRight.update(0.5, 900);
    expect(hRight.rotation).toBeCloseTo(speedBefore * 0.5);
  });
});

describe('Particle', () => {
  it('fades life at a rate of 1.6 per second (faster than FruitHalf)', () => {
    const p = new Particle(0, 0, 10, -10, 5, 'blue');
    p.update(0.25, 700);
    expect(p.life).toBeCloseTo(1 - 0.25 * 1.6);
  });

  it('integrates position using gravity-updated velocity, matching Fruit/FruitHalf physics', () => {
    const p = new Particle(0, 0, 10, -10, 5, 'blue');
    p.update(0.25, 700);
    // vy = -10 + 700*0.25 = 165; y = 0 + 165*0.25 = 41.25; x = 0 + 10*0.25 = 2.5
    expect(p.vy).toBeCloseTo(165);
    expect(p.y).toBeCloseTo(41.25);
    expect(p.x).toBeCloseTo(2.5);
  });
});

describe('spawnFruit', () => {
  const WIDTH = 800;
  const HEIGHT = 600;
  const SAMPLES = 4000;
  const fruits = Array.from({ length: SAMPLES }, () => spawnFruit(WIDTH, HEIGHT));

  it('always spawns just below the visible area with radius 55', () => {
    for (const f of fruits) {
      expect(f.y).toBeCloseTo(HEIGHT + 40);
      expect(f.radius).toBe(55);
    }
  });

  it('keeps x within the 80px margin on both sides', () => {
    for (const f of fruits) {
      expect(f.x).toBeGreaterThanOrEqual(80);
      expect(f.x).toBeLessThanOrEqual(WIDTH - 80);
    }
  });

  it('always launches upward within the configured speed range', () => {
    for (const f of fruits) {
      expect(f.vy).toBeLessThanOrEqual(-800);
      expect(f.vy).toBeGreaterThanOrEqual(-1100);
    }
  });

  it('assigns a valid fruit skin whose color matches fruitType.main', () => {
    for (const f of fruits) {
      expect(FRUIT_TYPES).toContain(f.fruitType);
      expect(f.color).toBe(f.fruitType.main);
    }
  });

  it('spawns bombs at roughly the configured 12% rate', () => {
    const bombRate = fruits.filter(f => f.isBomb).length / SAMPLES;
    // statistical, not exact — generous tolerance to avoid flaky failures
    expect(bombRate).toBeGreaterThan(0.08);
    expect(bombRate).toBeLessThan(0.16);
  });
});
