# Zlice 🍉

A webcam-controlled fruit-slicing game. Point your index finger at the camera and slice falling fruit in the air — no mouse, no keyboard, just your hand. Built with vanilla JavaScript, Canvas2D, and real-time hand tracking via [MediaPipe Tasks Vision](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker).

**[Live demo →](https://zlice.netlify.app/)**

![Zlice gameplay](#) *(add a gameplay GIF here — see "Contributing / TODO" below)*

---

## How it works

1. Your browser requests webcam access and loads a hand-landmark detection model directly in the browser (no server, no video ever leaves your machine).
2. Every other frame, the model reports 21 hand landmarks; only the index fingertip (landmark 8) is used.
3. The fingertip position is smoothed with an exponential moving average and its recent path is checked against every falling fruit's position using point-to-segment distance. Cross a fruit fast enough and it's sliced.
4. You get 45 seconds. Slice fruit for points (with a combo multiplier), avoid bombs (they cost points, not lives).

## Tech stack

- **Rendering:** Canvas2D, no framework
- **Hand tracking:** MediaPipe Tasks Vision (`HandLandmarker`), WASM/GPU-accelerated, runs entirely client-side
- **Testing:** [Vitest](https://vitest.dev/) for the pure game-logic functions
- **Structure:** ES modules — no bundler required, runs as static files

```
index.html        # markup, layout, styling
main.js           # startup flow, camera/model init, main loop wiring
tracker.js        # fingertip smoothing + slice detection math
entities.js       # Fruit / FruitHalf / Particle classes, spawnFruit()
game.js           # game state, scoring, timers, combo logic
render.js         # canvas drawing, HUD, DPR-aware resizing
ui-effects.js      # purely cosmetic: mascot reactions, score popups, bomb flash
*.test.js         # unit tests for the pure logic (Vitest)
```

## Running locally

No build step — it's static files plus two ES modules loaded from a CDN.

```bash
# from the project root
npx serve .
# or: python3 -m http.server
```

Open the printed URL, allow camera access, and play. (Must be served over `http://localhost` or `https://` — browsers block camera access on `file://`.)

## Running the tests

```bash
npm install
npm test
```

30 tests cover the parts of the codebase that are pure and deterministic: the fingertip-smoothing math, slice-detection geometry, and fruit-spawning boundary conditions.

---

## The debugging story

The interesting part of this project wasn't drawing fruit on a canvas — it was chasing down three real bugs that only showed up once hand-tracking, variable frame timing, and physics were all interacting at once. Documented here rather than left buried in code comments.

### Bug 1: Fruit piling up in slow motion

**Symptom:** On some machines, fruit visibly slowed down and piled up mid-air instead of falling and disappearing normally — looked like the physics itself was broken.

**Root cause:** `handLandmarker.detectForVideo()` runs the hand-tracking model *synchronously* and blocks the main thread while it does. Without a GPU delegate available, that call alone could take 100ms+. The game clamped its physics timestep (`dt`) to a fixed max of 0.05s regardless of how long a frame actually took, so on every slow frame, gravity and motion only ever advanced 50ms worth — while new fruit kept spawning on schedule. The result: fruit fell in artificial slow motion while the spawn rate stayed real-time, so it piled up.

**Fix:** Two changes. First, raised `MAX_DT` so a slow frame's physics step reflects how much time actually passed, instead of being artificially truncated. Second, hand detection now runs every other frame instead of every frame, cutting the average main-thread blocking time roughly in half so frames complete faster overall. Also added a hard cap (`MAX_FRUITS_ON_SCREEN`) as a safety net so a slow device can never visually flood the play field no matter what.

### Bug 2: A permanent smeared trail across the canvas

**Symptom:** A comet-like smear of fruit trailed across part of the screen and never cleared, even on frames where no fruit was actually there.

**Root cause:** `devicePixelRatio` was read in more than one place — once when sizing the canvas, and separately (as the raw, uncapped value) wherever position math or `clearRect()` needed it. On any screen with a device pixel ratio above the capped value (1.5), those two numbers disagreed. `clearRect()` was clearing a smaller rectangle than the canvas actually was, leaving a permanently un-cleared strip along the bottom/right edge — and every fruit that passed through that strip stayed smeared on screen forever.

**Fix:** Compute the capped `devicePixelRatio` once, store it, and have every consumer (canvas clearing, canvas sizing, and the hand-position math in `main.js`) read that single stored value instead of re-reading `window.devicePixelRatio` independently.

### Bug 3: Redesigning "lives" into a timer + combo system

**Symptom:** Not a bug exactly, but a design problem — a lives-based game (3 misses = game over) played awkwardly with imprecise, camera-based input. A single missed swipe from tracking jitter felt unfair and ended runs too abruptly.

**Fix:** Replaced the lives system with a 45-second countdown timer. Missing a fruit just breaks your combo instead of ending the game; slicing a bomb costs points (`BOMB_PENALTY`) instead of a life. This rewards sustained accuracy (via the combo multiplier) without making the whole run hinge on tracking precision for any single swipe. It also fixed a secondary bug that only appeared after the redesign: uncut bombs falling off-screen weren't being cleaned up from the fruit array, which slowly ate into the on-screen fruit cap until nothing new could spawn.

---

## Known limitations

- **Hard-depends on two external CDNs at runtime:** the MediaPipe library from jsdelivr and the hand-tracking model weights from Google Cloud Storage. If either is unreachable, the game fails to load. Self-hosting the WASM/model assets would remove this dependency.
- **Camera-only input.** There's currently no mouse/touch fallback, so the game can't be played or demoed without a webcam.
- **Single hand, single point.** Only the first detected hand's index fingertip is tracked — by design, to keep slice detection simple and reliable, not a limitation to fix.

## Contributing / TODO

- [ ] Record and embed a gameplay GIF above
- [ ] Add a mouse/touch input fallback
- [ ] Self-host WASM/model assets to remove the external CDN dependency

## License

MIT — see [LICENSE](./LICENSE).
