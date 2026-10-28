import createSolarSystem from "./universes/solar-system";
import createGalaxyCollision from "./universes/galaxy-collision";
import createNBodyUniverse from "./universes/n-body-universe";
import { Universe } from "./universe";

type UniverseFactory = () => Universe;

/** Dictionary of universe factory functions. */
const universeFactories: Record<string, UniverseFactory> = {
  "solar-system": createSolarSystem,
  "galaxy-collision": createGalaxyCollision,
  "n-body-universe": createNBodyUniverse,
};

/** Current active universe instance. */
let currentUniverse: Universe | null = null;

/** Wall-clock time in milliseconds per simulation tick at normal speed. */
const TICK_MS = 20;

/** Longest frame (e.g. after a hidden tab) that is simulated in one go, to avoid a catch-up spiral. */
const MAX_FRAME_MS = 250;

/** How often the statistics display is refreshed, in milliseconds. */
const STATS_INTERVAL_MS = 500;

/** Canvas and its 2d context, set up in init. */
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;

/** Fixed-timestep loop state. */
const loop = {
  last_frame: 0,
  accumulator: 0,
  ticks: 0,
  paused: false,
  speed: 1,
};

/** Total energy of the current universe right after it was created, as the reference for drift. */
let initial_energy = 0;

/** Statistics state. */
interface StatsState {
  frames: number;
  time: number;
}

const _last_stats: StatsState = {
  frames: 0,
  time: performance.now(),
};

/**
 * Initializes the application.
 * Sets up event listeners and starts the default simulation.
 */
function init(): void {
  canvas = document.getElementById("canvas") as HTMLCanvasElement;
  ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  const universeSelect = document.getElementById("universe-select") as HTMLSelectElement;
  universeSelect.addEventListener("change", (e: Event) => change_universe(e.target as HTMLSelectElement));

  const pauseButton = document.getElementById("pause-button") as HTMLButtonElement;
  pauseButton.addEventListener("click", () => {
    loop.paused = !loop.paused;
    pauseButton.textContent = loop.paused ? "Resume" : "Pause";
  });
  document.getElementById("reset-button")!.addEventListener("click", () => change_universe(universeSelect));
  const speedSelect = document.getElementById("speed-select") as HTMLSelectElement;
  speedSelect.addEventListener("change", () => (loop.speed = Number(speedSelect.value)));

  // set the default universe
  change_universe({ value: "solar-system" } as HTMLSelectElement);

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
 * Starts the simulation loop: simulates in fixed time steps and draws once per display frame.
 */
function run_simulation(): void {
  loop.last_frame = performance.now();
  requestAnimationFrame(frame);
}

/**
 * Handles one display frame.
 * @param now - The frame timestamp in milliseconds.
 */
function frame(now: number): void {
  requestAnimationFrame(frame);
  const elapsed = Math.min(now - loop.last_frame, MAX_FRAME_MS);
  loop.last_frame = now;

  if (currentUniverse && !loop.paused) {
    loop.accumulator += elapsed * loop.speed;
    while (loop.accumulator >= TICK_MS) {
      tick(currentUniverse);
      loop.accumulator -= TICK_MS;
    }
  }

  redraw();
  _last_stats.frames += 1;
  if (now - _last_stats.time >= STATS_INTERVAL_MS) do_stats(now);
}

/**
 * Advances the universe by one tick, i.e. its configured number of substeps.
 * @param universe - The universe to advance.
 */
function tick(universe: Universe): void {
  for (let i = 0; i < universe.physics.substeps; i++) {
    universe.integration_step();
  }
  loop.ticks += 1;
  if (loop.ticks % 5 === 0) universe.manage_trace();
}

/**
 * Redraws the universe visualization on the canvas.
 */
function redraw(): void {
  if (!currentUniverse) return;
  const scale = currentUniverse.physics.length_scale;

  // Match the backing store to the display's pixel density, but keep drawing in CSS pixels
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.offsetWidth;
  const height = canvas.offsetHeight;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // fill black
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";

  for (const planet of currentUniverse.planets) {
    ctx.fillStyle = planet.color;
    if (planet.shadow !== null) {
      ctx.shadowColor = planet.color;
      ctx.shadowBlur = planet.shadow;
    }
    let x = width / 2 + planet.x / scale;
    let y = height / 2 + planet.y / scale;
    ctx.beginPath();
    ctx.arc(x, y, planet.radius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#888";
    // draw label
    if (!planet.is_dummy && planet.name !== "") ctx.fillText(planet.name, x, y - 1.05 * planet.radius - 5);
    // draw trace
    if (!planet.is_dummy && planet.trace !== null) {
      ctx.strokeStyle = planet.color;
      for (let i = planet.trace.length - 1; i >= 0; i--) {
        const t = planet.trace[i];
        ctx.globalAlpha = (1 - (currentUniverse.physics.time - t[0]) / currentUniverse.physics.trace_age) / 2;
        const tx = width / 2 + t[1] / scale;
        const ty = height / 2 + t[2] / scale;
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
 * @param now - The current time in milliseconds.
 */
function do_stats(now: number): void {
  if (!currentUniverse) return;
  const statsbox = document.getElementById("stats-box");
  if (!statsbox) return;

  const days = "Day " + (currentUniverse.physics.time / 60 / 60 / 24).toFixed(0);
  const elapsed = now - _last_stats.time;
  const fps = (_last_stats.frames / elapsed) * 1000;
  _last_stats.time = now;
  _last_stats.frames = 0;
  const fpsStr = (fps ? fps.toFixed(0) : "??") + " fps";

  // share of the wall-clock time spent computing forces
  const load = Math.round((currentUniverse.stats.force_time / elapsed) * 100) + "%<br>";
  const energy_drift = (currentUniverse.total_energy() - initial_energy) / (Math.abs(initial_energy) || 1);
  statsbox.innerHTML = fpsStr + "<br>" + days + "<br>Load: " + load + "dE/E: " + energy_drift.toExponential(1);

  // Reset force_time accumulator
  currentUniverse.stats.force_time = 0;
}

/**
 * Changes the active universe based on the user's selection.
 * @param select - The select element or object with a value property.
 */
function change_universe(select: { value: string }): void {
  const factory = universeFactories[select.value];
  if (factory) {
    currentUniverse = factory();
    // Reset stats to avoid huge spikes or weirdness
    _last_stats.time = performance.now();
    _last_stats.frames = 0;
    loop.accumulator = 0;
    loop.ticks = 0;
    initial_energy = currentUniverse.total_energy();
    redraw();
  }
}

/**
 * Handles mouse wheel events to zoom the canvas.
 * @param event - The mouse wheel event.
 */
function zoom_canvas(event: WheelEvent): void {
  if (!currentUniverse) return;
  const zoom_factor = 1 + event.deltaY / 2e4;
  currentUniverse.physics.length_scale *= zoom_factor;
}
