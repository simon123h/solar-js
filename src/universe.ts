import { coulomb_logarithm, friction_factor } from "./friction";
import { Planet } from "./planet";
import { Units } from "./units";

export interface PlanetSpec {
  name: string;
  mass: number;
  radius: number;
  color?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  shadow?: number;
  is_dummy?: boolean;
  core_radius?: number;
}

interface PhysicsConfig {
  G: number;
  length_scale: number;
  /** Plummer softening length in meters; keeps close encounters finite. */
  softening: number;
  dt: number;
  time: number;
  trace_age: number;
  substeps: number;
  n_asteroids?: number;
}

/**
 * A fixed dark matter halo around a planet, moving with that planet.
 * It has a flat rotation curve (circular speed v0) outside the core radius and is truncated beyond the
 * truncation radius: the acceleration towards the center is v0^2 * r * rt^2 / ((r^2 + rc^2) * (r^2 + rt^2)).
 */
export interface Halo {
  center: Planet;
  v0: number;
  core_radius: number;
  truncation_radius: number;
  /** If set, bodies moving through the halo are slowed by dynamical friction. */
  friction?: boolean;
}

/** The parameters of a halo, without the planet it is centered on. */
export type HaloSpec = Omit<Halo, "center">;

/**
 * The halo's acceleration towards its center divided by the distance, at squared distance d2.
 */
function halo_acceleration_factor(halo: Halo, d2: number): number {
  const rc2 = halo.core_radius * halo.core_radius;
  const rt2 = halo.truncation_radius * halo.truncation_radius;
  return (halo.v0 * halo.v0 * rt2) / ((d2 + rc2) * (d2 + rt2));
}

/**
 * The mass density of a halo at squared distance d2 from its center, from the mass inside each radius, which
 * follows from its acceleration: M(r) = a(r) r^2 / G. Beyond the radius where the truncated halo's enclosed mass
 * peaks the formula would turn negative, so the density is zero there.
 */
export function halo_density(halo: Halo, d2: number, G: number): number {
  const rc2 = halo.core_radius * halo.core_radius;
  const rt2 = halo.truncation_radius * halo.truncation_radius;
  const denominator = (d2 + rc2) * (d2 + rt2);
  const slope = 3 * denominator - 2 * d2 * (2 * d2 + rt2 + rc2);
  return Math.max(0, (halo.v0 * halo.v0 * rt2 * slope) / (4 * Math.PI * G * denominator * denominator));
}

/**
 * The mass of a halo inside its truncation radius, where the enclosed mass is largest.
 */
function halo_mass(halo: Halo, G: number): number {
  const rt2 = halo.truncation_radius * halo.truncation_radius;
  return (halo_acceleration_factor(halo, rt2) * rt2 * halo.truncation_radius) / G;
}

/**
 * The halo's potential energy per unit mass at squared distance d2; zero infinitely far away.
 */
function halo_potential(halo: Halo, d2: number): number {
  const rc2 = halo.core_radius * halo.core_radius;
  const rt2 = halo.truncation_radius * halo.truncation_radius;
  return 0.5 * halo.v0 * halo.v0 * (rt2 / (rt2 - rc2)) * Math.log((d2 + rc2) / (d2 + rt2));
}

interface ForceBuffers {
  order: Planet[];
  x: Float64Array;
  y: Float64Array;
  gm: Float64Array;
  soft2: Float64Array;
  ax: Float64Array;
  ay: Float64Array;
}

interface Stats {
  force_time: number;
  /** The mechanical energy removed by dynamical friction so far, in joules. */
  dissipated_energy: number;
}

/**
 * Represents the simulation universe containing planets and physics settings.
 */
export class Universe {
  planets: Planet[];
  halos: Halo[];
  /** Real-world units for the readouts, if the scene's quantities stand for other scales. */
  units: Units | null = null;
  physics: PhysicsConfig;
  stats: Stats;
  /** Source of randomness for scene setup; replace it with a seeded generator for reproducible scenes. */
  random: () => number = Math.random;
  /** The rate at which dynamical friction removes energy, as of the last force update, in watts. */
  private friction_power = 0;
  private force_buffers: ForceBuffers | null = null;

  /**
   * Creates a new Universe instance.
   */
  constructor() {
    this.planets = [];
    this.halos = [];
    this.physics = {
      G: 6.674e-11,
      length_scale: 1e9,
      softening: 1e6,
      dt: 60 * 60 * 6,
      time: 0,
      trace_age: 60 * 60 * 24 * 400,
      substeps: 1,
    };
    this.stats = {
      force_time: 0,
      dissipated_energy: 0,
    };
  }

  /**
   * Generates a list of Planet objects from a list of planet specifications and adds them to the universe.
   * @param planet_specs - List of objects containing planet properties.
   * @returns The created planets, in the order of the specifications.
   */
  generate_planets(planet_specs: PlanetSpec[]): Planet[] {
    const created: Planet[] = [];
    for (const p of planet_specs) {
      const planet = new Planet(p.name, p.mass, p.radius, p.color);
      planet.x = p.x ?? planet.x;
      planet.y = p.y ?? planet.y;
      planet.vx = p.vx ?? planet.vx;
      planet.vy = p.vy ?? planet.vy;
      planet.shadow = p.shadow ?? planet.shadow;
      planet.is_dummy = p.is_dummy ?? planet.is_dummy;
      planet.core_radius = p.core_radius ?? planet.core_radius;
      created.push(planet);
    }
    this.planets.push(...created);
    return created;
  }

  /**
   * Adds a dark matter halo that is centered on a planet and moves with it. The halo pulls on every other
   * planet, and the planet at its center feels the opposite reaction, so momentum is conserved.
   * @param center - The planet at the center of the halo.
   * @param v0 - The circular speed of the flat rotation curve.
   * @param core_radius - The radius of the halo's core, inside which the rotation speed rises.
   * @param truncation_radius - The radius beyond which the halo's pull fades out; must exceed the core radius.
   * @param friction - Whether bodies moving through the halo are slowed by dynamical friction.
   * @returns The created halo.
   * @throws If the radii are not positive or the truncation radius does not exceed the core radius.
   */
  add_halo(center: Planet, v0: number, core_radius: number, truncation_radius: number, friction: boolean = false): Halo {
    if (!(core_radius > 0) || !(truncation_radius > core_radius)) {
      throw new Error("add_halo: need 0 < core_radius < truncation_radius");
    }
    const halo: Halo = { center, v0, core_radius, truncation_radius, friction };
    this.halos.push(halo);
    return halo;
  }

  /**
   * Returns the planets as an associative dictionary for easier debugging.
   * @returns A dictionary where keys are planet names and values are Planet objects.
   */
  as_dict(): Record<string, Planet> {
    const result: Record<string, Planet> = {};
    for (const planet of this.planets) {
      if (planet.name === "") continue;
      result[planet.name] = planet;
    }
    return result;
  }

  /**
   * Finds a planet by its name.
   * @param name - The name of the planet to find.
   * @returns The found Planet object or null if not found.
   */
  get_planet_by_name(name: string): Planet | null {
    for (const planet of this.planets) {
      if (planet.name === name) return planet;
    }
    return null;
  }

  /**
   * Puts a planet on a circular orbit around another planet (attractor).
   * @param planet - The planet to orbit.
   * @param orbit_radius - The radius of the orbit.
   * @param attractor - The planet(s) to orbit around. If an array, orbits the center of mass.
   *   The orbiting planet also moves with the attractor's (center of mass) velocity.
   * @param sign - The direction of orbit (1 for counter-clockwise, -1 for clockwise).
   * @param start_angle - The angle in radians at which to place the planet on the orbit; random if omitted.
   * @throws If the orbit radius is not positive or the attractor has no mass.
   */
  circularize(planet: Planet, orbit_radius: number, attractor: Planet | Planet[], sign: number = 1, start_angle?: number): void {
    if (!(orbit_radius > 0)) throw new Error("circularize: orbit_radius must be positive");

    // if attractor is a list of planets, compute their gravitational center
    let centerOfMass: { x: number; y: number; vx: number; vy: number; mass: number } = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      mass: 0,
    };

    if (Array.isArray(attractor)) {
      for (const a of attractor) {
        centerOfMass.mass += a.mass;
        centerOfMass.x += a.mass * a.x;
        centerOfMass.y += a.mass * a.y;
        centerOfMass.vx += a.mass * a.vx;
        centerOfMass.vy += a.mass * a.vy;
      }
      if (centerOfMass.mass > 0) {
        centerOfMass.x /= centerOfMass.mass;
        centerOfMass.y /= centerOfMass.mass;
        centerOfMass.vx /= centerOfMass.mass;
        centerOfMass.vy /= centerOfMass.mass;
      }
    } else {
      centerOfMass = attractor;
    }
    if (!(centerOfMass.mass > 0)) throw new Error("circularize: attractor must have positive mass");

    // put planet somewhere on the orbit
    let angle = start_angle ?? this.random() * 2 * Math.PI;
    planet.x = centerOfMass.x + orbit_radius * Math.cos(angle);
    planet.y = centerOfMass.y + orbit_radius * Math.sin(angle);

    // compute the velocity from the equality of (softened) gravitational and centripetal forces
    const attractors = Array.isArray(attractor) ? attractor : [attractor];
    let attractor_core2 = 0;
    for (const a of attractors) attractor_core2 += (a.mass * a.core_radius * a.core_radius) / centerOfMass.mass;
    const eps2 = this.physics.softening * this.physics.softening + planet.core_radius * planet.core_radius + attractor_core2;
    const r2 = orbit_radius * orbit_radius;
    let centripetal = (this.physics.G * centerOfMass.mass * r2) / Math.pow(r2 + eps2, 1.5);
    // halos around the attractor(s) pull the planet inwards as well
    for (const halo of this.halos) {
      if (attractors.includes(halo.center)) centripetal += halo_acceleration_factor(halo, r2) * r2;
    }
    const velocity = Math.sqrt(centripetal);

    // construct angle from rotating force vector by 90deg
    angle -= (Math.PI / 2) * sign;
    planet.vx = centerOfMass.vx + velocity * Math.cos(angle);
    planet.vy = centerOfMass.vy + velocity * Math.sin(angle);
  }

  /**
   * Adds the dynamical friction of a halo to the accelerations. Every regular planet moving through the halo is
   * slowed along its velocity relative to the halo's center, and the center is pushed the other way, so that
   * momentum is conserved. The friction acts on the planet together with the halo it carries, so a planet's mass
   * for the friction includes the mass of its own halos.
   * @param halo - The halo that causes the friction.
   * @param order - The planets, regular ones first.
   * @param center_index - The index of the halo's center in order.
   * @param regular - The number of regular planets in order.
   * @param x - The positions, in the order of order.
   * @param y - The positions, in the order of order.
   * @param ax - The accelerations to add to, in the order of order.
   * @param ay - The accelerations to add to, in the order of order.
   */
  private apply_friction(
    halo: Halo,
    order: Planet[],
    center_index: number,
    regular: number,
    x: Float64Array,
    y: Float64Array,
    ax: Float64Array,
    ay: Float64Array,
  ): void {
    const G = this.physics.G;
    const center = halo.center;
    const sigma_factor = halo.v0; // sqrt(2) times the velocity dispersion of an isothermal halo
    let reaction_x = 0;
    let reaction_y = 0;
    for (let i = 0; i < regular; i++) {
      const planet = order[i];
      if (planet === center) continue;
      const vx = planet.vx - center.vx;
      const vy = planet.vy - center.vy;
      const speed = Math.hypot(vx, vy);
      if (speed === 0) continue;

      const dx = x[i] - x[center_index];
      const dy = y[i] - y[center_index];
      const d2 = dx * dx + dy * dy;
      let mass = planet.mass;
      for (const own of this.halos) if (own.center === planet) mass += halo_mass(own, G);
      const b_max = Math.max(Math.sqrt(d2), halo.core_radius);
      const deceleration =
        (4 *
          Math.PI *
          G *
          G *
          mass *
          halo_density(halo, d2, G) *
          coulomb_logarithm(b_max, speed, G, mass) *
          friction_factor(speed / sigma_factor)) /
        (speed * speed);
      ax[i] -= (deceleration * vx) / speed;
      ay[i] -= (deceleration * vy) / speed;
      reaction_x += (planet.mass * deceleration * vx) / speed;
      reaction_y += (planet.mass * deceleration * vy) / speed;
      // the force on the planet and the opposite one on the center together remove this much power
      this.friction_power += planet.mass * deceleration * speed;
    }
    if (center.mass > 0) {
      ax[center_index] += reaction_x / center.mass;
      ay[center_index] += reaction_y / center.mass;
    }
  }

  /**
   * Returns scratch arrays for the force computation, reallocating only when the planet count changes.
   */
  private buffers(n: number): ForceBuffers {
    if (this.force_buffers === null || this.force_buffers.x.length !== n) {
      const f64 = () => new Float64Array(n);
      this.force_buffers = {
        order: new Array<Planet>(n),
        x: f64(),
        y: f64(),
        gm: f64(),
        soft2: f64(),
        ax: f64(),
        ay: f64(),
      };
    }
    return this.force_buffers;
  }

  /**
   * Updates the gravitational forces for all planets.
   */
  update_forces(): void {
    const start = performance.now();
    this.friction_power = 0;
    const G = this.physics.G;
    const eps2 = this.physics.softening * this.physics.softening;

    // order planets as nondummy first, then dummy, and copy the hot values into flat arrays
    const n = this.planets.length;
    const b = this.buffers(n);
    const order = b.order;
    let ndl = 0;
    for (const p of this.planets) if (!p.is_dummy) order[ndl++] = p;
    let k = ndl;
    for (const p of this.planets) if (p.is_dummy) order[k++] = p;

    const { x, y, gm, soft2, ax, ay } = b;
    for (let i = 0; i < n; i++) {
      const p = order[i];
      x[i] = p.x;
      y[i] = p.y;
      gm[i] = G * p.mass;
      // half of the global softening per body, so the pair sum is the global softening plus both cores
      soft2[i] = 0.5 * eps2 + p.core_radius * p.core_radius;
      ax[i] = ay[i] = 0;
    }

    // loop over planet-planet interactions, but exclude dummy-dummy interactions
    for (let i = 0; i < ndl; i++) {
      const xi = x[i];
      const yi = y[i];
      const gmi = gm[i];
      let axi = 0;
      let ayi = 0;
      for (let j = i + 1; j < n; j++) {
        const dx = x[j] - xi;
        const dy = y[j] - yi;

        // softened squared distance, so close encounters stay finite
        const d2 = dx * dx + dy * dy + soft2[i] + soft2[j];

        // gravitational acceleration for both planets
        const f = 1 / (d2 * Math.sqrt(d2));
        const fj = f * gm[j];
        const fi = f * gmi;
        axi += fj * dx;
        ayi += fj * dy;
        ax[j] -= fi * dx;
        ay[j] -= fi * dy;
      }
      ax[i] += axi;
      ay[i] += ayi;
    }

    // halos pull every planet towards their center, and the center feels the opposite reaction
    for (const halo of this.halos) {
      const ci = order.indexOf(halo.center);
      if (ci < 0) continue;
      const cx = x[ci];
      const cy = y[ci];
      let reaction_x = 0;
      let reaction_y = 0;
      for (let i = 0; i < n; i++) {
        if (i === ci) continue;
        const dx = x[i] - cx;
        const dy = y[i] - cy;
        const k = halo_acceleration_factor(halo, dx * dx + dy * dy);
        ax[i] -= k * dx;
        ay[i] -= k * dy;
        reaction_x += order[i].mass * k * dx;
        reaction_y += order[i].mass * k * dy;
      }
      const center_mass = order[ci].mass;
      if (center_mass > 0) {
        ax[ci] += reaction_x / center_mass;
        ay[ci] += reaction_y / center_mass;
      }

      if (halo.friction) this.apply_friction(halo, order, ci, ndl, x, y, ax, ay);
    }

    for (let i = 0; i < n; i++) {
      order[i].ax = ax[i];
      order[i].ay = ay[i];
    }
    this.stats.force_time += performance.now() - start;
  }

  /**
   * Computes the total mechanical energy of the system, consistent with the forces in update_forces:
   * Plummer-softened potential energy, with dummy-dummy pairs excluded, plus the potential energy in the halos.
   * @returns The kinetic plus potential energy.
   */
  total_energy(): number {
    const G = this.physics.G;
    const eps2 = this.physics.softening * this.physics.softening;
    let energy = 0;

    // only pairs with at least one non-dummy planet interact, so dummy-dummy pairs are never visited
    const nondummy = this.planets.filter((p) => !p.is_dummy);
    const dummy = this.planets.filter((p) => p.is_dummy);
    const pair_energy = (p1: Planet, p2: Planet): number => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const softening2 = eps2 + p1.core_radius * p1.core_radius + p2.core_radius * p2.core_radius;
      return -(G * p1.mass * p2.mass) / Math.sqrt(dx * dx + dy * dy + softening2);
    };
    for (const p of this.planets) energy += p.E_kin();
    for (let i = 0; i < nondummy.length; i++) {
      for (let j = i + 1; j < nondummy.length; j++) energy += pair_energy(nondummy[i], nondummy[j]);
      for (const d of dummy) energy += pair_energy(nondummy[i], d);
    }
    for (const halo of this.halos) {
      for (const p of this.planets) {
        if (p === halo.center) continue;
        const dx = p.x - halo.center.x;
        const dy = p.y - halo.center.y;
        energy += p.mass * halo_potential(halo, dx * dx + dy * dy);
      }
    }
    return energy;
  }

  /**
   * Performs a single integration step using the position Verlet (drift-kick-drift) method.
   * This is second-order accurate and symplectic, so energy stays bounded over long runs.
   */
  integration_step(): void {
    const dt = this.physics.dt;
    const dt2 = dt / 2;

    // drift: half a step of motion at the current velocity
    for (const p of this.planets) {
      p.x += dt2 * p.vx;
      p.y += dt2 * p.vy;
    }

    // kick: full velocity step with the acceleration at the midpoint
    this.update_forces();
    this.stats.dissipated_energy += this.friction_power * dt;
    for (const p of this.planets) {
      p.vx += dt * p.ax;
      p.vy += dt * p.ay;
    }

    // drift: second half step of motion at the new velocity
    for (const p of this.planets) {
      p.x += dt2 * p.vx;
      p.y += dt2 * p.vy;
    }

    this.physics.time += dt;
  }

  /**
   * Updates the trace points for each planet.
   */
  manage_trace(): void {
    const time = this.physics.time;
    const deltime = time - this.physics.trace_age;

    for (const planet of this.planets) {
      if (planet.is_dummy) continue;
      if (planet.trace === null) planet.trace = [];
      planet.trace = planet.trace.filter((t) => t[0] >= deltime);
      planet.trace.push([time, planet.x, planet.y]);
    }
  }
}
