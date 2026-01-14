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

/** Interval ID for the simulation loop. */
let animationFrameId: number | null = null;

/** Statistics state. */
interface StatsState {
  n: number;
  time: number;
}

let _last_stats: StatsState = {
  n: 0,
  time: performance.now(),
};

/**
 * Initializes the application.
 * Sets up event listeners and starts the default simulation.
 */
function init(): void {
  const universeSelect = document.getElementById("universe-select") as HTMLSelectElement;
  universeSelect.addEventListener("change", (e: Event) => change_universe(e.target as HTMLSelectElement));

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
 * Starts the simulation loop.
 */
function run_simulation(): void {
  let n = 0;
  if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
  }

  const loop = () => {
    if (!currentUniverse) return;
    n += 1;
    // do integration step(s)
    for (let i = 0; i < currentUniverse.physics.substeps; i++) {
      currentUniverse.integration_step();
    }
    // update visualization
    redraw();
    // manage trace
    if (n % 5 === 0) currentUniverse.manage_trace();
    // do statistics
    if (n % 20 === 0) do_stats(n);
    
    animationFrameId = requestAnimationFrame(loop);
  };
  
  animationFrameId = requestAnimationFrame(loop);
}

/**
 * Redraws the universe visualization on the canvas.
 */
async function redraw(): Promise<void> {
  if (!currentUniverse) return;
  const scale = currentUniverse.physics.length_scale;
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;

  // Basic resizing logic
  if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // fill black
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";

  for (const planet of currentUniverse.planets) {
    ctx.fillStyle = planet.color;
    if (planet.shadow !== null) {
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
    if (!planet.is_dummy && planet.name !== "") ctx.fillText(planet.name, x, y - 1.05 * planet.radius - 5);
    // draw trace
    if (!planet.is_dummy && planet.trace !== null) {
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
 * @param n - The current frame count.
 */
function do_stats(n: number): void {
  if (!currentUniverse) return;
  const statsbox = document.getElementById("stats-box");
  if (!statsbox) return;

  const days = "Day " + (currentUniverse.physics.time / 60 / 60 / 24).toFixed(0);
  const now = performance.now();
  let fps = ((n - _last_stats.n) / (now - _last_stats.time)) * 1000;
  _last_stats.time = now;
  _last_stats.n = n;
  const fpsStr = (fps ? fps.toFixed(0) : "??") + " fps";

  // Stats logic
  const ft = Math.round(currentUniverse.stats.force_time / 4) + "%<br>";
  statsbox.innerHTML = fpsStr + "<br>" + days + "<br>Load: " + ft;

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
    currentUniverse.prepare();
    // Reset stats to avoid huge spikes or weirdness
    _last_stats.time = performance.now();
    _last_stats.n = 0;
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
  if (currentUniverse.physics.bbox === null || currentUniverse.physics.bbox === undefined) {
    currentUniverse.physics.bbox = 1;
  }
  currentUniverse.physics.bbox /= zoom_factor;
}
