// tracker.js
// ---------- Phase 2: fingertip tracker ----------
// Fix F1/F3: slightly longer history for a smoother-looking trail; the
// EMA smoothing weight is unchanged since it already balanced responsiveness well.
export class FingertipTracker {
  constructor(smoothing = 0.25, historyLength = 8) {
    this.smoothing = smoothing;
    this.smoothed = null;
    this.history = [];
    this.historyLength = historyLength;
    this.missedFrames = 0;
  }
  update(rawPoint, timestamp) {
    this.missedFrames = 0;
    if (!this.smoothed) {
      this.smoothed = { x: rawPoint.x, y: rawPoint.y };
    } else {
      this.smoothed.x = this.smoothed.x * this.smoothing + rawPoint.x * (1 - this.smoothing);
      this.smoothed.y = this.smoothed.y * this.smoothing + rawPoint.y * (1 - this.smoothing);
    }
    this.history.push({ x: this.smoothed.x, y: this.smoothed.y, t: timestamp });
    if (this.history.length > this.historyLength) this.history.shift();
  }
  markMissed() {
    this.missedFrames++;
    if (this.missedFrames > 10) {
      this.smoothed = null;
      this.history = [];
    }
  }
  getVelocity() {
    if (this.history.length < 2) return { speed: 0 };
    const a = this.history[this.history.length - 2];
    const b = this.history[this.history.length - 1];
    const dt = (b.t - a.t) / 1000;
    if (dt <= 0) return { speed: 0 };
    return { speed: Math.hypot((b.x - a.x) / dt, (b.y - a.y) / dt) };
  }
}

// ---------- Phase 3: slice detection ----------
export function pointToSegmentDistance(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  const abLenSq = abx * abx + aby * aby;
  let t = abLenSq === 0 ? 0 : (apx * abx + apy * aby) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + abx * t, cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

export const MIN_SLICE_SPEED = 180; // px/sec — lowered from 400 so normal swipes register reliably

export function isSlice(tracker, fruit) {
  if (tracker.history.length < 2) return false;
  if (tracker.getVelocity().speed < MIN_SLICE_SPEED) return false;
  const a = tracker.history[tracker.history.length - 2];
  const b = tracker.history[tracker.history.length - 1];
  return pointToSegmentDistance(fruit.x, fruit.y, a.x, a.y, b.x, b.y) <= fruit.radius;
}
