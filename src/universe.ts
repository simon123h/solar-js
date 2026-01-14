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

  // Physics Buffers (SoA - Structure of Arrays)
  px: Float64Array = new Float64Array(0);
  py: Float64Array = new Float64Array(0);
  pvx: Float64Array = new Float64Array(0);
  pvy: Float64Array = new Float64Array(0);
  pax: Float64Array = new Float64Array(0);
  pay: Float64Array = new Float64Array(0);
  pmass: Float64Array = new Float64Array(0);
  pradius: Float64Array = new Float64Array(0);
  count_nondummy: number = 0;

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
    // Note: We defer sorting and buffer initialization to the prepare() method
  }

  /**
   * Prepares the physics engine.
   * Sorts planets, allocates TypedArrays, and copies data from objects to arrays.
   * Must be called before the simulation starts or after adding planets.
   */
  prepare(): void {
    this.sort_planets();

    const n = this.planets.length;
    if (this.px.length !== n) {
        this.px = new Float64Array(n);
        this.py = new Float64Array(n);
        this.pvx = new Float64Array(n);
        this.pvy = new Float64Array(n);
        this.pax = new Float64Array(n);
        this.pay = new Float64Array(n);
        this.pmass = new Float64Array(n);
        this.pradius = new Float64Array(n);
    }

    this.count_nondummy = 0;
    for (let i = 0; i < n; i++) {
        const p = this.planets[i];
        this.px[i] = p.x;
        this.py[i] = p.y;
        this.pvx[i] = p.vx;
        this.pvy[i] = p.vy;
        this.pax[i] = p.ax;
        this.pay[i] = p.ay;
        this.pmass[i] = p.mass;
        this.pradius[i] = p.radius;

        if (!p.is_dummy) {
            this.count_nondummy++;
        }
    }
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
    const scale = this.physics.length_scale;
    const n_planets = this.planets.length;
    
    // reset forces (accelerations)
    this.pax.fill(0);
    this.pay.fill(0);

    // Cache buffer references for speed
    const px = this.px;
    const py = this.py;
    const pmass = this.pmass;
    const pradius = this.pradius;
    const pax = this.pax;
    const pay = this.pay;
    const ndl = this.count_nondummy;

    for (let i = 0; i < ndl; i++) {
      // Dummies don't attract dummies, and planets are sorted.
      // So i only iterates non-dummies.
      
      const p1x = px[i];
      const p1y = py[i];
      const p1mass = pmass[i];
      const p1radius = pradius[i];

      for (let j = i + 1; j < n_planets; j++) {
        const dx = px[j] - p1x;
        const dy = py[j] - p1y;
        let distSq = dx * dx + dy * dy;
        let distance = Math.sqrt(distSq);

        // make sure distance is not too close
        // Optimization: Precompute min distance to avoid expensive property lookups if possible
        const minDist = radius_bbox * (p1radius + pradius[j]) * scale;
        
        if (distance < minDist) {
            distance = minDist;
            distSq = distance * distance; // Update squared distance too if clamped
        }

        // gravitational acceleration
        // f = G * m1 * m2 / r^2
        // a1 = f / m1 = G * m2 / r^2
        // Direction vector: (dx/r, dy/r)
        // a1_x = (G * m2 / r^2) * (dx / r) = G * m2 * dx / r^3
        
        // We can share G / r^3
        const f_factor = G / (distSq * distance);
        const fdx = f_factor * dx;
        const fdy = f_factor * dy;

        pax[i] += fdx * pmass[j];
        pay[i] += fdy * pmass[j];
        pax[j] -= fdx * p1mass;
        pay[j] -= fdy * p1mass;
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

    const n = this.planets.length;
    const px = this.px;
    const py = this.py;
    const pvx = this.pvx;
    const pvy = this.pvy;
    const pax = this.pax;
    const pay = this.pay;

    for (let i = 0; i < n; i++) {
      // auxiliary values
      const dt2pax = dt2 * pax[i];
      const dt2pay = dt2 * pay[i];

      // second bit of velocity step (here done first for performance)
      pvx[i] += dt2pax;
      pvy[i] += dt2pay;

      // do spatial step
      px[i] += dt * (pvx[i] + dt2pax);
      py[i] += dt * (pvy[i] + dt2pay);

      // first bit of velocity step (done second for performance)
      pvx[i] += dt2pax;
      pvy[i] += dt2pay;
    }
    
    this.sync_to_objects();

    this.physics.time += dt;
  }

  /**
   * Syncs the physics state from TypedArrays back to the Planet objects.
   * Useful for rendering, tracing, and debugging.
   */
  sync_to_objects(): void {
    const n = this.planets.length;
    for (let i = 0; i < n; i++) {
        const p = this.planets[i];
        p.x = this.px[i];
        p.y = this.py[i];
        p.vx = this.pvx[i];
        p.vy = this.pvy[i];
        p.ax = this.pax[i];
        p.ay = this.pay[i];
    }
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
