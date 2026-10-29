import { Universe } from "../../core/universe";
import { Units } from "../../core/units";
import { CosmicWebOptions, DEFAULT_COSMIC_WEB_SETTINGS } from "./cosmic-web-settings";

/** Display units for cosmological scales: Megaparsecs (Mpc) and Gigayears (Gyr). */
export const COSMIC_WEB_UNITS: Units = {
  time_unit: "Gyr",
  seconds_per_time_unit: 1e9 * 365.25 * 24 * 3600,
  length_unit: "Mpc",
  meters_per_length_unit: 3.086e22, // 1 Mpc in meters
};

/**
 * Creates a cosmological universe demonstrating the self-organized formation of
 * cosmic web filaments and voids through gravitational instability (Zel'dovich approximation).
 *
 * @param random - Random number generator for reproducible perturbations.
 * @param options - Simulation settings (particle count, perturbation amplitude, roughness, expansion).
 * @returns Configured Universe instance.
 */
export default function createCosmicWeb(
  random: () => number = Math.random,
  options: CosmicWebOptions = DEFAULT_COSMIC_WEB_SETTINGS,
): Universe {
  const universe = new Universe();
  universe.random = random;
  universe.units = COSMIC_WEB_UNITS;

  // Physical constants scaled for cosmological Mpc-scale box
  universe.physics.G = 6.674e-11;
  const boxMpc = 50; // 50 Mpc across
  const boxMeters = boxMpc * COSMIC_WEB_UNITS.meters_per_length_unit;
  universe.physics.length_scale = boxMeters / 700; // ~700 CSS pixels across viewport
  universe.physics.softening = 1.2 * COSMIC_WEB_UNITS.meters_per_length_unit; // 1.2 Mpc Plummer softening
  universe.physics.dt = 0.05 * COSMIC_WEB_UNITS.seconds_per_time_unit; // 50 Myr time steps
  universe.physics.trace_age = 2.0 * COSMIC_WEB_UNITS.seconds_per_time_unit; // 2 Gyr trace age
  universe.physics.substeps = 1;

  const totalParticles = options.particles;
  const side = Math.round(Math.sqrt(totalParticles));
  const count = side * side;
  const spacing = boxMeters / side;
  const halfBox = boxMeters / 2;

  // Generate multi-scale Fourier perturbation wave modes (Zel'dovich perturbation field)
  interface WaveMode {
    kx: number;
    ky: number;
    phase: number;
    amplitude: number;
  }
  const modes: WaveMode[] = [];
  const numModes = Math.max(2, Math.round(options.roughness * 2));
  for (let m = 0; m < numModes; m++) {
    const angle = random() * Math.PI * 2;
    // wave numbers ranging from fundamental box frequencies to intermediate scales
    const k = (2 * Math.PI / boxMeters) * (1 + random() * options.roughness);
    modes.push({
      kx: Math.cos(angle) * k,
      ky: Math.sin(angle) * k,
      phase: random() * Math.PI * 2,
      amplitude: 1.0 / Math.sqrt(1 + m), // Red noise power spectrum (more power on larger scales)
    });
  }

  // Normalization for displacement field
  const maxDisp = spacing * options.perturbation_amplitude * 1.5;
  const expansionHubble = (options.expansion * 20e3) / COSMIC_WEB_UNITS.meters_per_length_unit; // Hubble velocity gradient

  // Total cosmic mass in simulation box (distributed among matter particles)
  // ~ 1e16 solar masses for a 50 Mpc box
  const solarMass = 1.989e30;
  const totalMass = 2e15 * solarMass;
  const particleMass = totalMass / count;

  for (let iy = 0; iy < side; iy++) {
    for (let ix = 0; ix < side; ix++) {
      // Unperturbed uniform grid location
      const x0 = (ix + 0.5) * spacing - halfBox;
      const y0 = (iy + 0.5) * spacing - halfBox;

      // Compute displacement from superposition of potential modes: psi = grad(Phi)
      let dispX = 0;
      let dispY = 0;
      for (const mode of modes) {
        const val = Math.sin(mode.kx * x0 + mode.ky * y0 + mode.phase) * mode.amplitude;
        dispX += mode.kx * val;
        dispY += mode.ky * val;
      }

      // Zel'dovich displacement and velocity
      const x = x0 + dispX * maxDisp;
      const y = y0 + dispY * maxDisp;

      // Hubble expansion velocity plus peculiar collapse velocity towards overdensities
      const peculiarScale = 1.2e-14; // m/s per displacement
      const vx = x * expansionHubble - dispX * maxDisp * peculiarScale;
      const vy = y * expansionHubble - dispY * maxDisp * peculiarScale;

      // Add as active gravitating bodies (is_dummy: false so they interact with each other)
      // Visual styling: additive cyan/electric blue glow simulating dark matter halo concentrations
      universe.generate_planets([
        {
          name: "",
          color: "rgba(96, 165, 250, 0.85)", // electric blue / sky-400
          mass: particleMass,
          radius: 2,
          x,
          y,
          vx,
          vy,
          is_dummy: false,
        },
      ]);
    }
  }

  return universe;
}
