import { Planet } from "./planet";

interface PlanetSpec {
  name: string;
  mass: number;
  radius: number;
  color?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  orbitRadius?: number;
  shadow?: number;
  is_dummy?: boolean;
  [key: string]: any;
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
   * Generates a list of Planet objects from a list of planet specifications.
   * @param planet_specs - List of objects containing planet properties.
   */
  generate_planets(planet_specs: PlanetSpec[]): void {
    for (const p of planet_specs) {
      const planet = new Planet(p.name, p.mass, p.radius, p.color);
      // copy all the other properties
      for (const prop in p) {
        (planet as any)[prop] = p[prop];
      }
      this.planets.push(planet);
    }
    this.sort_planets();
  }

  /**
   * Sorts the planets so that non-dummy planets come first.
   * This optimizes the force calculation loop.
   */
  sort_planets(): void {
    this.planets.sort((a, b) => {
      if (a.is_dummy === b.is_dummy) return 0;
      return a.is_dummy ? 1 : -1;
    });
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
   * Updates the gravitational forces for all planets.
   */
  update_forces(): void {
    const start = performance.now();
    const G = this.physics.G;
    const radius_bbox = this.physics.bbox === null || this.physics.bbox === undefined ? 1 : this.physics.bbox;

    // reset forces
    for (const planet of this.planets) {
      planet.ax = planet.ay = 0;
    }

    const n_planets = this.planets.length;
    // Since planets are sorted (non-dummy first), we can just find the split point
    // or iterate until we hit a dummy.
    // However, finding the split point every time is fast enough or we just check is_dummy in the outer loop.
    
    for (let i = 0; i < n_planets; i++) {
      const p1 = this.planets[i];
      // Optimization: dummys don't attract dummys, so we can stop the outer loop
      // once we reach the first dummy (because planets are sorted).
      if (p1.is_dummy) break;

      for (let j = i + 1; j < n_planets; j++) {
        const p2 = this.planets[j];

        // compute distance between planets
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        // make sure distance is not too close
        distance = Math.max(distance, radius_bbox * (p1.radius + p2.radius) * this.physics.length_scale);

        // gravitational acceleration for both planets
        const f = G / distance / distance / distance;
        const fdx = f * dx;
        const fdy = f * dy;

        p1.ax += fdx * p2.mass;
        p1.ay += fdy * p2.mass;
        p2.ax -= fdx * p1.mass;
        p2.ay -= fdy * p1.mass;
      }
    }
    this.stats.force_time += performance.now() - start;
  }

  /**
   * Performs a single integration step using the Velocity Verlet method.
   */
  integration_step(): void {
    const dt = this.physics.dt;
    const dt2 = dt / 2;

    // update forces (acceleration)
    this.update_forces();

    for (const p of this.planets) {
      // auxiliary values
      const dt2pax = dt2 * p.ax;
      const dt2pay = dt2 * p.ay;

      // second bit of velocity step (here done first for performance)
      p.vx += dt2pax;
      p.vy += dt2pay;

      // do spatial step
      p.x += dt * (p.vx + dt2pax);
      p.y += dt * (p.vy + dt2pay);

      // first bit of velocity step (done second for performance)
      p.vx += dt2pax;
      p.vy += dt2pay;
      // NOTE: this weird order results in the velocities always being wrong!
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
