import { Planet } from "./planet.js";

/**
 * Represents the simulation universe containing planets and physics settings.
 */
export class Universe {
  /**
   * Creates a new Universe instance.
   */
  constructor() {
    /** @type {Planet[]} planets - Array of planets in the universe. */
    this.planets = [];
    /**
     * @type {object} physics - Physics configuration and state.
     * @property {number} G - Gravitational constant.
     * @property {number} length_scale - Length scale for visualization.
     * @property {number} dt - Time step size in seconds.
     * @property {number} time - Current simulation time in seconds.
     * @property {number} trace_age - Length of traces in the visualization in seconds.
     * @property {number} substeps - Number of time steps per frame.
     * @property {number} [bbox] - Bounding box scaling factor.
     */
    this.physics = {
      G: 6.674e-11,
      length_scale: 1e9,
      dt: 60 * 60 * 6,
      time: 0,
      trace_age: 60 * 60 * 24 * 400,
      substeps: 1,
    };
    /**
     * @type {object} stats - Simulation statistics.
     * @property {number} force_time - Time spent calculating forces.
     */
    this.stats = {
      force_time: 0,
    };
  }

  /**
   * Generates a list of Planet objects from a list of planet specifications.
   * @param {Array<Object>} planet_specs - List of objects containing planet properties.
   */
  generate_planets(planet_specs) {
    for (var p of planet_specs) {
      var planet = new Planet(p.name, p.mass, p.radius, p.color);
      // copy all the other properties (NOTE: this is a bit hacky, maybe remove at some point)
      for (var prop in p) planet[prop] = p[prop];
      this.planets.push(planet);
    }
  }

  /**
   * Returns the planets as an associative dictionary for easier debugging.
   * @returns {Object.<string, Planet>} A dictionary where keys are planet names and values are Planet objects.
   */
  as_dict() {
    var result = {};
    for (var planet of this.planets) {
      if (planet.name == "") continue;
      result[planet.name] = planet;
    }
    return result;
  }

  /**
   * Finds a planet by its name.
   * @param {string} name - The name of the planet to find.
   * @returns {Planet|null} The found Planet object or null if not found.
   */
  get_planet_by_name(name) {
    for (var planet of this.planets) {
      if (planet.name == name) return planet;
    }
    return null;
  }

  /**
   * Puts a planet on a circular orbit around another planet (attractor).
   * @param {Planet} planet - The planet to orbit.
   * @param {number} orbit_radius - The radius of the orbit.
   * @param {Planet|Array<Planet>} attractor - The planet(s) to orbit around. If an array, orbits the center of mass.
   * @param {number} [sign=1] - The direction of orbit (1 for counter-clockwise, -1 for clockwise).
   */
  circularize(planet, orbit_radius, attractor, sign = 1) {
    // if attractor is a list of planets, compute their graviational center
    if (attractor.constructor === Array) {
      var new_attr = { x: 0, y: 0, mass: 0 };
      for (var a of attractor) {
        new_attr.mass += a.mass;
        new_attr.x += a.mass * a.x;
        new_attr.y += a.mass * a.y;
      }
      new_attr.x /= new_attr.mass;
      new_attr.y /= new_attr.mass;
      attractor = new_attr;
    }
    // put planet somewhere on the orbit
    var angle = Math.random() * 2 * Math.PI;
    planet.x = attractor.x + orbit_radius * Math.cos(angle);
    planet.y = attractor.y + orbit_radius * Math.sin(angle);
    // compute the velocity from the equality of graviational and centripetal forces
    var velocity = Math.sqrt((this.physics.G * attractor.mass) / orbit_radius);
    // construct angle from rotating force vector by 90deg
    angle -= (Math.PI / 2) * sign;
    planet.vx = velocity * Math.cos(angle);
    planet.vy = velocity * Math.sin(angle);
  }

  /**
   * Updates the gravitational forces for all planets.
   */
  update_forces() {
    // double loop over all planets
    var start = performance.now();
    var G = this.physics.G;
    var radius_bbox = this.physics.bbox == null ? 1 : this.physics.bbox;
    // reset forces
    for (var planet of this.planets) {
      planet.ax = planet.ay = 0;
    }
    // split planets into dummy-planets and nondummy-planets
    var dummy = this.planets.filter((p) => p.is_dummy);
    var nondummy = this.planets.filter((p) => !p.is_dummy);
    var ndl = nondummy.length;
    var dl = dummy.length;
    // loop over planet-planet interactions, but exclude dummy-dummy interactions
    for (var i = 0; i < ndl; i++) {
      var p1 = nondummy[i];
      for (var j = i + 1; j < ndl + dl; j++) {
        var p2 = j < ndl ? nondummy[j] : dummy[j - ndl];
        // compute distance between planets
        var dx = p2.x - p1.x;
        var dy = p2.y - p1.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        // make sure distance is not too close
        distance = Math.max(distance, radius_bbox * (p1.radius + p2.radius) * this.physics.length_scale);
        // gravitational acceleration for both planets
        var f = G / distance / distance / distance;
        p1.ax += f * dx * p2.mass;
        p1.ay += f * dy * p2.mass;
        p2.ax -= f * dx * p1.mass;
        p2.ay -= f * dy * p1.mass;
      }
    }
    this.stats.force_time += performance.now() - start;
  }

  /**
   * Performs a single integration step using the Velocity Verlet method.
   */
  integration_step() {
    var dt = this.physics.dt;
    var dt2 = dt / 2;
    // update forces (acceleration)
    this.update_forces();
    for (var p of this.planets) {
      // auxiliary values
      var dt2pax = dt2 * p.ax;
      var dt2pay = dt2 * p.ay;
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
  manage_trace() {
    var time = this.physics.time;
    var deltime = time - this.physics.trace_age;
    for (var planet of this.planets) {
      if (planet.is_dummy) continue;
      if (planet.trace == null) planet.trace = [];
      planet.trace = planet.trace.filter((t) => t[0] >= deltime);
      planet.trace.push([time, planet.x, planet.y]);
    }
  }
}