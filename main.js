// main.js
// ---------- Startup flow & main loop wiring ----------
import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
import { FingertipTracker } from './tracker.js';
import { gameState, updateGame, resetGame, endGame, getHighScore } from './game.js';
import { initRenderer, resizeCanvas, getCanvasSize, draw, updateHUD } from './render.js';
import { startIdleMascotPeek } from './ui-effects.js';

document.getElementById("highScoreStart").textContent = `High Score: ${getHighScore()}`;

const tracker = new FingertipTracker();

const video = document.getElementById("webcam");
const canvas = document.getElementById("overlay");
initRenderer(canvas);

let handLandmarker;

// Fix F1 (revised again): the real cause of the pile-up wasn't which
// scheduling API drove the loop — it's that handLandmarker.detectForVideo()
// runs the hand-tracking model synchronously and BLOCKS the main thread
// while it does. If the browser couldn't use the GPU delegate and fell
// back to CPU, that call alone can take well over 100ms. The old dt clamp
// (0.05s) meant that no matter how long a frame actually took in real
// time, the physics only ever advanced 50ms worth of gravity/motion —
// so on every slow frame, fruit fell in slow motion while new fruit kept
// spawning on schedule, piling up exactly like the screenshot.
// Two changes fix this:
//   1. MAX_DT is raised so a slow frame's physics step reflects how much
//      time actually passed, instead of being artificially truncated.
//   2. Hand detection (the expensive part) now runs every other frame
//      instead of every frame, cutting the average main-thread blocking
//      time roughly in half so frames complete faster overall.
const MAX_DT = 0.2;
let lastTime = performance.now();
let frameCount = 0;

function mainLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, MAX_DT);
  lastTime = now;
  frameCount++;

  if (frameCount % 2 === 0) {
    const results = handLandmarker.detectForVideo(video, now);
    if (results.landmarks?.length) {
      // Fix F2: only ever read landmark 8 (index fingertip) — no other fingers
      // or hand gestures are considered for slicing.
      const tip = results.landmarks[0][8];
      const { width: w, height: h } = getCanvasSize();
      // x flipped manually: the game canvas itself isn't CSS-mirrored anymore (only the
      // camera preview panel is), so this keeps "move hand right" = "cursor moves right"
      tracker.update({ x: w - tip.x * w, y: tip.y * h }, now);
    } else {
      tracker.markMissed();
    }
  }

  updateGame(dt, tracker, getCanvasSize());
  draw(gameState, tracker);
  updateHUD(gameState);

  if (gameState.gameOver && !gameState.resultShown) {
    endGame();
  }

  requestAnimationFrame(mainLoop);
}

window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "r" && gameState.gameOver) {
    resetGame();
  }
});
document.getElementById("playAgainBtn").addEventListener("click", resetGame);

startIdleMascotPeek();

// ---------- Startup flow ----------
document.getElementById("startBtn").addEventListener("click", async () => {
  const statusMsg = document.getElementById("statusMsg");
  const startBtn = document.getElementById("startBtn");
  startBtn.disabled = true;
  try {
    statusMsg.textContent = "Loading hand-tracking model...";
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );
    let delegate = "GPU";
    try {
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate
        },
        runningMode: "VIDEO",
        numHands: 1 // Fix F2: single hand / single tracked point (index fingertip) only
      });
    } catch (gpuErr) {
      delegate = "CPU"; // fallback for machines/browsers without WebGL delegate support
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate
        },
        runningMode: "VIDEO",
        numHands: 1
      });
    }

    statusMsg.textContent = "Requesting camera access...";
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
    video.srcObject = stream;
    await video.play();

    resizeCanvas();
    resetGame();
    document.getElementById("startScreen").style.display = "none";
    requestAnimationFrame(mainLoop);
  } catch (err) {
    console.error(err);
    if (err.name === "NotAllowedError") {
      statusMsg.textContent = "Camera permission denied. Please allow camera access and retry.";
    } else if (err.name === "NotFoundError") {
      statusMsg.textContent = "No camera found on this device.";
    } else {
      statusMsg.textContent = "Something went wrong loading the game. Check console for details.";
    }
    startBtn.disabled = false;
  }
});
