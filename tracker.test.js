import { describe, it, expect } from 'vitest';
import { FingertipTracker, pointToSegmentDistance, isSlice, MIN_SLICE_SPEED } from './tracker.js';

describe('pointToSegmentDistance', () => {
  it('returns 0 for a point exactly on the segment', () => {
    expect(pointToSegmentDistance(5, 0, 0, 0, 10, 0)).toBeCloseTo(0);
  });

  it('returns the perpendicular distance for a point above the segment', () => {
    // segment (0,0)-(10,0), point (5,5) -> closest point (5,0), distance 5
    expect(pointToSegmentDistance(5, 5, 0, 0, 10, 0)).toBeCloseTo(5);
  });

  it('clamps to endpoint b when the point projects beyond the segment', () => {
    // point (15,0) is past b=(10,0) -> distance is 5, not the raw perpendicular distance (0)
    expect(pointToSegmentDistance(15, 0, 0, 0, 10, 0)).toBeCloseTo(5);
  });

  it('clamps to endpoint a when the point projects before the segment', () => {
    expect(pointToSegmentDistance(-5, 0, 0, 0, 10, 0)).toBeCloseTo(5);
  });

  it('handles a degenerate (zero-length) segment as a point', () => {
    // a === b === (3,4); distance from origin is the classic 3-4-5 triangle
    expect(pointToSegmentDistance(0, 0, 3, 4, 3, 4)).toBeCloseTo(5);
  });
});

describe('FingertipTracker', () => {
  it('sets the first point directly with no smoothing applied', () => {
    const t = new FingertipTracker(0.25, 8);
    t.update({ x: 10, y: 20 }, 0);
    expect(t.smoothed).toEqual({ x: 10, y: 20 });
    expect(t.history).toHaveLength(1);
  });

  it('blends subsequent points using the EMA weight (smoothing = old-value weight)', () => {
    const t = new FingertipTracker(0.25, 8);
    t.update({ x: 0, y: 0 }, 0);
    t.update({ x: 10, y: 0 }, 100);
    // smoothed.x = 0*0.25 + 10*0.75 = 7.5
    expect(t.smoothed.x).toBeCloseTo(7.5);
  });

  it('caps history at historyLength, dropping the oldest entries', () => {
    const t = new FingertipTracker(0.25, 3);
    for (let i = 0; i < 6; i++) t.update({ x: i, y: 0 }, i * 10);
    expect(t.history).toHaveLength(3);
    // the three most recent x-raw-inputs were 3,4,5 -> smoothed values should be increasing
    expect(t.history[0].x).toBeLessThan(t.history[2].x);
  });

  it('resets missedFrames to 0 on a successful update', () => {
    const t = new FingertipTracker();
    t.markMissed();
    t.markMissed();
    t.update({ x: 1, y: 1 }, 0);
    expect(t.missedFrames).toBe(0);
  });

  it('clears smoothed state and history after more than 10 consecutive missed frames', () => {
    const t = new FingertipTracker();
    t.update({ x: 5, y: 5 }, 0);
    for (let i = 0; i < 11; i++) t.markMissed();
    expect(t.missedFrames).toBe(11);
    expect(t.smoothed).toBeNull();
    expect(t.history).toHaveLength(0);
  });

  it('does not clear state at exactly 10 missed frames (only after)', () => {
    const t = new FingertipTracker();
    t.update({ x: 5, y: 5 }, 0);
    for (let i = 0; i < 10; i++) t.markMissed();
    expect(t.smoothed).not.toBeNull();
  });

  it('computes velocity as 0 with fewer than two history points', () => {
    const t = new FingertipTracker();
    expect(t.getVelocity().speed).toBe(0);
    t.update({ x: 0, y: 0 }, 0);
    expect(t.getVelocity().speed).toBe(0);
  });

  it('computes velocity magnitude correctly between the last two points', () => {
    const t = new FingertipTracker(0, 8); // smoothing=0 -> smoothed jumps straight to raw input
    t.update({ x: 0, y: 0 }, 0);
    t.update({ x: 7.5, y: 0 }, 100); // dt = 0.1s, dx = 7.5 -> speed = 75 px/s
    expect(t.getVelocity().speed).toBeCloseTo(75);
  });
});

describe('isSlice', () => {
  it('is true for a fast swipe whose path crosses the fruit', () => {
    const t = new FingertipTracker(0, 8);
    t.update({ x: 0, y: 50 }, 0);
    t.update({ x: 100, y: 50 }, 50); // dt=0.05s, dx=100 -> speed=2000, well above MIN_SLICE_SPEED
    const fruit = { x: 50, y: 50, radius: 30 };
    expect(isSlice(t, fruit)).toBe(true);
  });

  it('is false when the swipe is too slow, even if it crosses the fruit', () => {
    const t = new FingertipTracker(0, 8);
    t.update({ x: 0, y: 50 }, 0);
    t.update({ x: 10, y: 50 }, 1000); // dt=1s, dx=10 -> speed=10, below MIN_SLICE_SPEED
    const fruit = { x: 5, y: 50, radius: 30 };
    expect(isSlice(t, fruit)).toBe(false);
  });

  it('is false when the swipe is fast but misses the fruit entirely', () => {
    const t = new FingertipTracker(0, 8);
    t.update({ x: 0, y: 0 }, 0);
    t.update({ x: 100, y: 0 }, 10); // fast, but along y=0
    const fruit = { x: 50, y: 200, radius: 30 }; // far below the swipe path
    expect(isSlice(t, fruit)).toBe(false);
  });

  it('is false with fewer than two tracked points', () => {
    const t = new FingertipTracker(0, 8);
    t.update({ x: 50, y: 50 }, 0);
    const fruit = { x: 50, y: 50, radius: 30 };
    expect(isSlice(t, fruit)).toBe(false);
  });

  it('exposes MIN_SLICE_SPEED as a stable threshold', () => {
    expect(MIN_SLICE_SPEED).toBe(180);
  });
});
