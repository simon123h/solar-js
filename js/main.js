import createSolarSystem from "./universes/solar-system.js";
import createGalaxyCollision from "./universes/galaxy-collision.js";
import createNBodyUniverse from "./universes/n-body-universe.js";

/** @type {Object.<string, Function>} Dictionary of universe factory functions. */
const universeFactories = {
  "solar-system": createSolarSystem,
  "galaxy-collision": createGalaxyCollision,
  "n-body-universe": createNBodyUniverse,
};

/** @type {import("./universe.js").Universe | null} Current active universe instance. */
let currentUniverse = null;

/** @type {number | null} Interval ID for the simulation loop. */
let simulationInterval = null;

/**
 * @type {object} _last_stats - Statistics state.
 * @property {number} n - Number of frames processed.
 * @property {number} time - Last time statistics were updated.
 */
let _last_stats = {
  n: 0,
  time: performance.now(),
};

/**
 * Initializes the application.
 * Sets up event listeners and starts the default simulation.
 */
function init() {
  const universeSelect = document.getElementById("universe-select");
  universeSelect.addEventListener("change", (e) => change_universe(e.target));

  // set the default universe
  change_universe({ value: "solar-system" });

  // start the simulation
  run_simulation();

  // zoom handler
  window.addEventListener("wheel", zoom_canvas);
}

// Ensure DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

/**
 * Starts the simulation loop.
 */
function run_simulation() {
  let n = 0;
  if (simulationInterval) clearInterval(simulationInterval);

  simulationInterval = setInterval(function () {
    if (!currentUniverse) return;
    n += 1;
    // do integration step(s)
    for (let i = 0; i < currentUniverse.physics.substeps; i++) {
      currentUniverse.integration_step();
    }
    // update visualization
    redraw();
    // manage trace
    if (n % 5 == 0) currentUniverse.manage_trace();
    // do statistics
    if (n % 20 == 0) do_stats(n);
  }, 20);
}

/**
 * Redraws the universe visualization on the canvas.
 * @async
 */
async function redraw() {
  if (!currentUniverse) return;
  const scale = currentUniverse.physics.length_scale;
  const canvas = document.getElementById("canvas");
  // Basic resizing logic
  if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  const ctx = canvas.getContext("2d");
  // fill black
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";

  for (const planet of currentUniverse.planets) {
    ctx.fillStyle = planet.color;
    if (planet.shadow != null) {
      ctx.shadowColor = planet.color;
      ctx.shadowBlur = planet.shadow;
    }
    let x = canvas.width / 2 + planet.x / scale;
    let y = canvas.height / 2 + planet.y / scale;
    ctx.beginPath();
    ctx.arc(x, y, planet.radius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#888";
    // draw label
    if (!planet.is_dummy && planet.name != "") ctx.fillText(planet.name, x, y - 1.05 * planet.radius - 5);
    // draw trace
    if (!planet.is_dummy && planet.trace != null) {
      ctx.strokeStyle = planet.color;
      for (let i = planet.trace.length - 1; i >= 0; i--) {
        const t = planet.trace[i];
        ctx.globalAlpha = (1 - (currentUniverse.physics.time - t[0]) / currentUniverse.physics.trace_age) / 2;
        const tx = canvas.width / 2 + t[1] / scale;
        const ty = canvas.height / 2 + t[2] / scale;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        x = tx;
        y = ty;
      }
      ctx.globalAlpha = 1;
    }
  }
}

/**
 * Updates the statistics display.
 * @param {number} n - The current frame count.
 */
function do_stats(n) {
  if (!currentUniverse) return;
  const statsbox = document.getElementById("stats-box");
  const days = "Day " + (currentUniverse.physics.time / 60 / 60 / 24).toFixed(0);
  const now = performance.now();
  let fps = ((n - _last_stats.n) / (now - _last_stats.time)) * 1000;
  _last_stats.time = now;
  _last_stats.n = n;
  fps = fps ? fps.toFixed(0) : "??";
  fps += " fps";

  // Stats logic ported from original
  const ft = Math.round(currentUniverse.stats.force_time / 4) + "%<br>";
  statsbox.innerHTML = fps + "<br>" + days + "<br>Load: " + ft;

  // Reset force_time accumulator
  currentUniverse.stats.force_time = 0;
}

/**
 * Changes the active universe based on the user's selection.
 * @param {HTMLSelectElement | {value: string}} select - The select element or object with a value property.
 */
function change_universe(select) {
  const factory = universeFactories[select.value];
  if (factory) {
    currentUniverse = factory();
    // Reset stats to avoid huge spikes or weirdness
    _last_stats.time = performance.now();
    _last_stats.n = 0;
    redraw();
  }
}

/**
 * Handles mouse wheel events to zoom the canvas.
 * @param {WheelEvent} event - The mouse wheel event.
 */
function zoom_canvas(event) {
  if (!currentUniverse) return;
  const zoom_factor = 1 + event.deltaY / 2e4;
  currentUniverse.physics.length_scale *= zoom_factor;
  if (currentUniverse.physics.bbox == null) currentUniverse.physics.bbox = 1;
  currentUniverse.physics.bbox /= zoom_factor;
}
