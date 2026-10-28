import { Planet } from "./planet";

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
}

interface PhysicsConfig {
  G: number;
  length_scale: number;
  dt: number;
  time: number;
  trace_age: number;
  substeps: number;
  bbox?: number;
  n_asteroids?: number;
}

interface ForceBuffers {
  order: Planet[];
  x: Float64Array;
  y: Float64Array;
  gm: Float64Array;
  soft: Float64Array;
  ax: Float64Array;
  ay: Float64Array;
}

interface Stats {
  force_time: number;
}

/**
 * Represents the simulation universe containing planets and physics settings.
 */
export class Universe {
  planets: Planet[];
  physics: PhysicsConfig;
  stats: Stats;
  private force_buffers: ForceBuffers | null = null;

  /**
   * Creates a new Universe instance.
   */
  constructor() {
    this.planets = [];
    this.physics = {
      G: 6.674e-11,
      length_scale: 1e9,
      dt: 60 * 60 * 6,
      time: 0,
      trace_age: 60 * 60 * 24 * 400,
      substeps: 1,
    };
    this.stats = {
      force_time: 0,
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
      created.push(planet);
    }
    this.planets.push(...created);
    return created;
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
   * @param sign - The direction of orbit (1 for counter-clockwise, -1 for clockwise).
   */
  circularize(planet: Planet, orbit_radius: number, attractor: Planet | Planet[], sign: number = 1): void {
    // if attractor is a list of planets, compute their gravitational center
    let centerOfMass: { x: number; y: number; mass: number } = {
      x: 0,
      y: 0,
      mass: 0,
    };

    if (Array.isArray(attractor)) {
      for (const a of attractor) {
        centerOfMass.mass += a.mass;
        centerOfMass.x += a.mass * a.x;
        centerOfMass.y += a.mass * a.y;
      }
      centerOfMass.x /= centerOfMass.mass;
      centerOfMass.y /= centerOfMass.mass;
    } else {
      centerOfMass = attractor;
    }

    // put planet somewhere on the orbit
    let angle = Math.random() * 2 * Math.PI;
    planet.x = centerOfMass.x + orbit_radius * Math.cos(angle);
    planet.y = centerOfMass.y + orbit_radius * Math.sin(angle);

    // compute the velocity from the equality of gravitational and centripetal forces
    const velocity = Math.sqrt((this.physics.G * centerOfMass.mass) / orbit_radius);

    // construct angle from rotating force vector by 90deg
    angle -= (Math.PI / 2) * sign;
    planet.vx = velocity * Math.cos(angle);
    planet.vy = velocity * Math.sin(angle);
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
        soft: f64(),
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
    const G = this.physics.G;
    const radius_bbox = this.physics.bbox === null || this.physics.bbox === undefined ? 1 : this.physics.bbox;

    // order planets as nondummy first, then dummy, and copy the hot values into flat arrays
    const n = this.planets.length;
    const b = this.buffers(n);
    const order = b.order;
    let ndl = 0;
    for (const p of this.planets) if (!p.is_dummy) order[ndl++] = p;
    let k = ndl;
    for (const p of this.planets) if (p.is_dummy) order[k++] = p;

    const { x, y, gm, soft, ax, ay } = b;
    const soft_scale = radius_bbox * this.physics.length_scale;
    for (let i = 0; i < n; i++) {
      const p = order[i];
      x[i] = p.x;
      y[i] = p.y;
      gm[i] = G * p.mass;
      soft[i] = soft_scale * p.radius;
      ax[i] = ay[i] = 0;
    }

    // loop over planet-planet interactions, but exclude dummy-dummy interactions
    for (let i = 0; i < ndl; i++) {
      const xi = x[i];
      const yi = y[i];
      const gmi = gm[i];
      const softi = soft[i];
      let axi = 0;
      let ayi = 0;
      for (let j = i + 1; j < n; j++) {
        const dx = x[j] - xi;
        const dy = y[j] - yi;

        // make sure distance is not too close
        const min_distance = softi + soft[j];
        const d2 = Math.max(dx * dx + dy * dy, min_distance * min_distance);

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

    for (let i = 0; i < n; i++) {
      order[i].ax = ax[i];
      order[i].ay = ay[i];
    }
    this.stats.force_time += performance.now() - start;
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
