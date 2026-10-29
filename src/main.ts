import createSolarSystem from "./universes/solar-system";
import createGalaxyCollision from "./universes/galaxy-collision";
import createNBodyUniverse from "./universes/n-body-universe";
import { Planet } from "./planet";
import { Universe } from "./universe";
import { format_time, scale_bar } from "./units";
import { DEFAULT_SETTINGS, get_local_storage, load_settings, save_settings } from "./settings";
import { DEFAULT_GALAXY_SETTINGS, GalaxySettings, encounter_problem, galaxy_options } from "./galaxy-settings";
import { init_galaxy_panel } from "./galaxy-panel";

type UniverseFactory = () => Universe;

/** The settings of the galaxy collision, which can be changed in the galaxy panel. */
let galaxy_settings: GalaxySettings = DEFAULT_GALAXY_SETTINGS;

/** Dictionary of universe factory functions. */
const universeFactories: Record<string, UniverseFactory> = {
  "solar-system": createSolarSystem,
  "galaxy-collision": () => createGalaxyCollision(Math.random, galaxy_options(galaxy_settings)),
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
  const speedSelect = document.getElementById("speed-select") as HTMLSelectElement;
  const pauseButton = document.getElementById("pause-button") as HTMLButtonElement;

  // restore the saved settings; the select options define which values are valid
  const storage = get_local_storage();
  const options = (select: HTMLSelectElement) => Array.from(select.options, (o) => o.value);
  const settings = load_settings(storage, DEFAULT_SETTINGS, {
    universe: (value) => options(universeSelect).includes(value) && value in universeFactories,
    speed: (value) => options(speedSelect).includes(String(value)),
  });
  universeSelect.value = settings.universe;
  speedSelect.value = String(settings.speed);
  loop.speed = settings.speed;
  galaxy_settings = settings.galaxy;

  const save = () => save_settings(storage, { universe: universeSelect.value, speed: loop.speed, galaxy: galaxy_settings });

  // the galaxy panel is only offered for the galaxy collision
  const galaxyButton = document.getElementById("galaxy-button") as HTMLButtonElement;
  let galaxy_panel_open = false;
  const update_galaxy_ui = () => {
    const is_galaxy = universeSelect.value === "galaxy-collision";
    galaxyButton.hidden = !is_galaxy;
    galaxy_panel.set_open(is_galaxy && galaxy_panel_open);
  };
  const galaxy_panel = init_galaxy_panel(galaxy_settings, (next) => {
    const problem = encounter_problem(next);
    if (problem) {
      galaxy_panel.show_message(`${problem} The scene was not changed.`);
      return;
    }
    const previous = galaxy_settings;
    galaxy_settings = next;
    try {
      change_universe(universeSelect);
      galaxy_panel.show_message("");
      save();
    } catch (error) {
      // the scene could not be built, so the previous one keeps running
      galaxy_settings = previous;
      const reason =
        error instanceof Error && error.message.includes("no sideways speed")
          ? "No starting speed gives this closest approach with these settings; with friction a first pass is either a plunge or a wide miss. Try a slightly different pericenter or eccentricity."
          : `This encounter cannot be started: ${error instanceof Error ? error.message : error}`;
      galaxy_panel.show_message(`${reason} The scene was not changed.`);
    }
  });
  galaxyButton.addEventListener("click", () => {
    galaxy_panel_open = !galaxy_panel_open;
    update_galaxy_ui();
  });

  universeSelect.addEventListener("change", (e: Event) => {
    change_universe(e.target as HTMLSelectElement);
    update_galaxy_ui();
    save();
  });
  pauseButton.addEventListener("click", () => {
    loop.paused = !loop.paused;
    pauseButton.textContent = loop.paused ? "Resume" : "Pause";
  });
  document.getElementById("reset-button")!.addEventListener("click", () => change_universe(universeSelect));
  speedSelect.addEventListener("change", () => {
    loop.speed = Number(speedSelect.value);
    save();
  });

  // open the saved (or default) universe
  try {
    change_universe(universeSelect);
  } catch {
    // saved galaxy settings that cannot be built (e.g. after the simulation changed): start over with the defaults
    galaxy_settings = DEFAULT_GALAXY_SETTINGS;
    galaxy_panel.show_settings(galaxy_settings);
    change_universe(universeSelect);
    save();
  }
  update_galaxy_ui();

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

  draw_stars(currentUniverse.planets, width, height, scale);

  for (const planet of currentUniverse.planets) {
    if (planet.is_dummy) continue;
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
    if (planet.name !== "") draw_label(planet, x, y);
    // draw trace
    if (planet.trace !== null) {
      ctx.strokeStyle = planet.color;
      for (let i = planet.trace.length - 1; i >= 0; i--) {
        const t = planet.trace[i];
        const alpha = (1 - (currentUniverse.physics.time - t[0]) / currentUniverse.physics.trace_age) / 2;
        // the trace of a highlighted planet is more opaque, so it shows between the stars
        ctx.globalAlpha = planet.highlight ? Math.min(1, 2 * alpha) : alpha;
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

  draw_scale_bar(width, height);
}

/**
 * Draws the name of a planet above it, with a dark outline so that it can be read over a crowd of stars.
 * A highlighted planet gets a larger bold label in its own color.
 * @param planet - The planet to label.
 * @param x - The x position of the planet in CSS pixels.
 * @param y - The y position of the planet in CSS pixels.
 */
function draw_label(planet: Planet, x: number, y: number): void {
  const offset = planet.highlight ? planet.radius + 8 : 1.05 * planet.radius + 5;
  ctx.font = planet.highlight ? "bold 14px sans-serif" : "12px sans-serif";
  ctx.lineJoin = "round";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "black";
  ctx.strokeText(planet.name, x, y - offset);
  ctx.fillStyle = planet.highlight ? planet.color : "#888";
  ctx.fillText(planet.name, x, y - offset);
  ctx.lineWidth = 1;
}

/**
 * Draws the dummy planets ("stars") as small additive squares. This is much cheaper than a glowing circle
 * for each of thousands of stars, and overlapping stars add up, so dense regions look brighter.
 * @param planets - All planets; only the dummy ones are drawn.
 * @param width - The canvas width in CSS pixels.
 * @param height - The canvas height in CSS pixels.
 * @param scale - The length scale: simulated meters per pixel.
 */
function draw_stars(planets: Planet[], width: number, height: number, scale: number): void {
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.75;
  let color = "";
  for (const star of planets) {
    if (!star.is_dummy) continue;
    const x = width / 2 + star.x / scale;
    const y = height / 2 + star.y / scale;
    const size = 2 * star.radius;
    if (x < -size || x > width || y < -size || y > height) continue;
    if (star.color !== color) {
      color = star.color;
      ctx.fillStyle = color;
    }
    ctx.fillRect(x - star.radius, y - star.radius, size, size);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

/**
 * Draws a scale bar in the bottom right corner, if the universe has units for lengths.
 * @param width - The canvas width in CSS pixels.
 * @param height - The canvas height in CSS pixels.
 */
function draw_scale_bar(width: number, height: number): void {
  if (!currentUniverse) return;
  const bar = scale_bar(currentUniverse.physics.length_scale, currentUniverse.units);
  if (!bar) return;

  const right = width - 20;
  const left = right - bar.length_px;
  const y = height - 24;
  ctx.strokeStyle = "#888";
  ctx.fillStyle = "#888";
  ctx.font = "12px sans-serif";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, y - 4);
  ctx.lineTo(left, y + 4);
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.moveTo(right, y - 4);
  ctx.lineTo(right, y + 4);
  ctx.stroke();
  ctx.fillText(bar.label, (left + right) / 2, y - 8);
}

/**
 * Updates the statistics display.
 * @param now - The current time in milliseconds.
 */
function do_stats(now: number): void {
  if (!currentUniverse) return;
  const statsbox = document.getElementById("stats-box");
  if (!statsbox) return;

  const time = format_time(currentUniverse.physics.time, currentUniverse.units);
  const elapsed = now - _last_stats.time;
  const fps = (_last_stats.frames / elapsed) * 1000;
  _last_stats.time = now;
  _last_stats.frames = 0;
  const fpsStr = (fps ? fps.toFixed(0) : "??") + " fps";

  // share of the wall-clock time spent computing forces
  const load = Math.round((currentUniverse.stats.force_time / elapsed) * 100) + "%<br>";
  // energy removed on purpose by dynamical friction is not an error, so it is added back
  const energy = currentUniverse.total_energy() + currentUniverse.stats.dissipated_energy;
  const energy_drift = (energy - initial_energy) / (Math.abs(initial_energy) || 1);
  statsbox.innerHTML = fpsStr + "<br>" + time + "<br>Load: " + load + "dE/E: " + energy_drift.toExponential(1);

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
