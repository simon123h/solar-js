import { createApp } from "vue";
import App from "./ui/App.vue";
import { Planet } from "./core/planet";
import { Universe } from "./core/universe";
import { format_time, scale_bar } from "./core/units";
import { DEFAULT_SETTINGS, get_local_storage, load_settings, save_settings } from "./core/settings";
import {
  DEFAULT_GALAXY_SETTINGS,
  GalaxySettings,
  createGalaxyCollision,
  encounter_problem,
  galaxy_options,
} from "./scenarios/galaxy-collision";
import {
  DEFAULT_SOLAR_SETTINGS,
  SolarSystemSettings,
  createSolarSystem,
  solar_options,
} from "./scenarios/solar-system";
import {
  DEFAULT_N_BODY_SETTINGS,
  NBodySettings,
  createNBodyUniverse,
  n_body_options,
} from "./scenarios/n-body";
import {
  DEFAULT_COSMIC_WEB_SETTINGS,
  CosmicWebSettings,
  createCosmicWeb,
  cosmic_web_options,
} from "./scenarios/cosmic-web";
import {
  DEFAULT_BINARY_GALAXY_SETTINGS,
  BinaryGalaxySettings,
  createBinaryGalaxy,
  binary_galaxy_options,
} from "./scenarios/binary-galaxy";

type UniverseFactory = () => Universe;

/** The settings of each scenario. */
let currentUniverseKey = "solar-system";
let galaxy_settings: GalaxySettings = DEFAULT_GALAXY_SETTINGS;
let solar_settings: SolarSystemSettings = DEFAULT_SOLAR_SETTINGS;
let n_body_settings: NBodySettings = DEFAULT_N_BODY_SETTINGS;
let cosmic_settings: CosmicWebSettings = DEFAULT_COSMIC_WEB_SETTINGS;
let binary_settings: BinaryGalaxySettings = DEFAULT_BINARY_GALAXY_SETTINGS;

/** Dictionary of universe factory functions. */
const universeFactories: Record<string, UniverseFactory> = {
  "solar-system": () => createSolarSystem(Math.random, solar_options(solar_settings)),
  "galaxy-collision": () => createGalaxyCollision(Math.random, galaxy_options(galaxy_settings)),
  "n-body-universe": () => createNBodyUniverse(Math.random, n_body_options(n_body_settings)),
  "cosmic-web": () => createCosmicWeb(Math.random, cosmic_web_options(cosmic_settings)),
  "binary-galaxy": () => createBinaryGalaxy(Math.random, binary_galaxy_options(binary_settings)),
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

/** Vue app component instance handle. */
let appInstance: InstanceType<typeof App> | null = null;

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

/** Pan offset in screen pixels. */
const camera = {
  x: 0,
  y: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  cameraStartX: 0,
  cameraStartY: 0,
};

/**
 * Initializes the application.
 * Sets up event listeners and starts the default simulation.
 */
function init(): void {
  canvas = document.getElementById("canvas") as HTMLCanvasElement;
  ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  const validUniverses = ["solar-system", "galaxy-collision", "n-body-universe", "cosmic-web", "binary-galaxy"];
  const validSpeeds = [0.25, 0.5, 1, 2, 4];

  // restore the saved settings
  const storage = get_local_storage();
  const settings = load_settings(storage, DEFAULT_SETTINGS, {
    universe: (value) => validUniverses.includes(value) && value in universeFactories,
    speed: (value) => validSpeeds.includes(value),
  });

  currentUniverseKey = settings.universe;
  loop.speed = settings.speed;
  galaxy_settings = settings.galaxy;
  solar_settings = settings.solar;
  n_body_settings = settings.nbody;
  cosmic_settings = settings.cosmic;
  binary_settings = settings.binary;

  const save = () =>
    save_settings(storage, {
      universe: currentUniverseKey,
      speed: loop.speed,
      galaxy: galaxy_settings,
      solar: solar_settings,
      nbody: n_body_settings,
      cosmic: cosmic_settings,
      binary: binary_settings,
    });

  // Mount Vue Application overlay
  const vueApp = createApp(App, {
    initialUniverse: currentUniverseKey,
    initialSpeed: loop.speed,
    initialGalaxy: galaxy_settings,
    initialSolar: solar_settings,
    initialNBody: n_body_settings,
    initialCosmic: cosmic_settings,
    initialBinary: binary_settings,
    initialStats: "loading...",
    onChangeUniverse(nextUniverse: string) {
      currentUniverseKey = nextUniverse;
      camera.x = 0;
      camera.y = 0;
      change_universe(currentUniverseKey);
      save();
    },
    onChangeSpeed(nextSpeed: number) {
      loop.speed = nextSpeed;
      save();
    },
    onTogglePause(paused: boolean) {
      loop.paused = paused;
    },
    onReset() {
      camera.x = 0;
      camera.y = 0;
      change_universe(currentUniverseKey);
    },
    onUpdateGalaxy(next: GalaxySettings) {
      const problem = encounter_problem(next);
      if (problem) {
        appInstance?.setGalaxyMessage(`${problem} The scene was not changed.`);
        return;
      }
      const previous = galaxy_settings;
      galaxy_settings = next;
      try {
        change_universe(currentUniverseKey);
        appInstance?.setGalaxyMessage("");
        save();
      } catch (error) {
        galaxy_settings = previous;
        appInstance?.setGalaxySettings(previous);
        const reason =
          error instanceof Error && error.message.includes("no sideways speed")
            ? "No starting speed gives this closest approach with these settings; with friction a first pass is either a plunge or a wide miss. Try a slightly different pericenter or eccentricity."
            : `This encounter cannot be started: ${error instanceof Error ? error.message : error}`;
        appInstance?.setGalaxyMessage(`${reason} The scene was not changed.`);
      }
    },
    onUpdateSolar(next: SolarSystemSettings) {
      solar_settings = next;
      change_universe(currentUniverseKey);
      save();
    },
    onUpdateNbody(next: NBodySettings) {
      n_body_settings = next;
      change_universe(currentUniverseKey);
      save();
    },
    onUpdateCosmic(next: CosmicWebSettings) {
      cosmic_settings = next;
      change_universe(currentUniverseKey);
      save();
    },
    onUpdateBinary(next: BinaryGalaxySettings) {
      binary_settings = next;
      change_universe(currentUniverseKey);
      save();
    },
  });

  appInstance = vueApp.mount("#app") as unknown as InstanceType<typeof App>;

  // open the saved (or default) universe
  try {
    change_universe(currentUniverseKey);
  } catch {
    galaxy_settings = DEFAULT_GALAXY_SETTINGS;
    appInstance.setGalaxySettings(galaxy_settings);
    change_universe(currentUniverseKey);
    save();
  }

  // start the simulation
  run_simulation();

  // zoom handler
  window.addEventListener("wheel", zoom_canvas);

  // drag & drop pan handlers
  setup_drag_and_drop();
}

/**
 * Sets up mouse drag & drop spatial panning on the canvas.
 */
function setup_drag_and_drop(): void {
  window.addEventListener("mousedown", (e: MouseEvent) => {
    // Only primary button, and ignore if clicking on HUD / interactive UI overlay elements
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target && target.closest("#app > *")) return;

    camera.isDragging = true;
    camera.dragStartX = e.clientX;
    camera.dragStartY = e.clientY;
    camera.cameraStartX = camera.x;
    camera.cameraStartY = camera.y;
    canvas.classList.add("dragging");
  });

  window.addEventListener("mousemove", (e: MouseEvent) => {
    if (!camera.isDragging) return;
    const dx = e.clientX - camera.dragStartX;
    const dy = e.clientY - camera.dragStartY;
    camera.x = camera.cameraStartX + dx;
    camera.y = camera.cameraStartY + dy;
    redraw();
  });

  const stopDrag = () => {
    if (camera.isDragging) {
      camera.isDragging = false;
      canvas.classList.remove("dragging");
    }
  };

  window.addEventListener("mouseup", stopDrag);
  window.addEventListener("blur", stopDrag);
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
    let x = width / 2 + camera.x + planet.x / scale;
    let y = height / 2 + camera.y + planet.y / scale;
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
        const tx = width / 2 + camera.x + t[1] / scale;
        const ty = height / 2 + camera.y + t[2] / scale;
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
    const x = width / 2 + camera.x + star.x / scale;
    const y = height / 2 + camera.y + star.y / scale;
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
  const statsHtml = fpsStr + "<br>" + time + "<br>Load: " + load + "dE/E: " + energy_drift.toExponential(1);

  appInstance?.updateStats(statsHtml);

  // Reset force_time accumulator
  currentUniverse.stats.force_time = 0;
}

/**
 * Changes the active universe based on the user's selection.
 * @param universeKey - Key of the universe to activate.
 */
function change_universe(universeKey: string): void {
  const factory = universeFactories[universeKey];
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

  // Zoom centered around the mouse cursor
  const mouseScreenX = event.clientX - canvas.offsetWidth / 2;
  const mouseScreenY = event.clientY - canvas.offsetHeight / 2;

  // Shift camera pan so the point under cursor remains stationary
  camera.x = mouseScreenX - (mouseScreenX - camera.x) / zoom_factor;
  camera.y = mouseScreenY - (mouseScreenY - camera.y) / zoom_factor;

  currentUniverse.physics.length_scale *= zoom_factor;
  redraw();
}
