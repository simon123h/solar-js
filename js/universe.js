import { Planet } from "./planet";

export class Universe {
  constructor() {
    this.planets = []; // array of planets in the universe
    this.physics = {
      G: 6.674e-11, // graviational constant
      length_scale: 1e9, // length scale
      dt: 60 * 60 * 6, // time step size
      time: 0, // current simulation time
      trace_age: 60 * 60 * 24 * 400, // length of traces in the visualization
      substeps: 1, // number of time steps per frame
    };
    this.stats = {
      force_time: 0,
    };
  }

  // generate list of Planet objects from a list of planet specs (a list of associative arrays)
  generate_planets(planet_specs) {
    for (var p of planet_specs) {
      var planet = new Planet(p.name, p.mass, p.radius, p.color);
      // copy all the other properties (NOTE: this is a bit hacky, maybe remove at some point)
      for (var prop in p) planet[prop] = p[prop];
      this.planets.push(planet);
    }
  }

  // return the planets as an associative dict, makes debugging easier
  as_dict() {
    var result = {};
    for (var planet of this.planets) {
      if (planet.name == "") continue;
      result[planet.name] = planet;
    }
    return result;
  }

  // find a planet by its name
  get_planet_by_name(name) {
    for (var planet of this.planets) {
      if (planet.name == name) return planet;
    }
    return null;
  }

  // put planet on a circular orbit around another planet (attractor)
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

  // update the gravitational forces for all planets
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
        distance = Math.max(
          distance,
          radius_bbox * (p1.radius + p2.radius) * this.physics.length_scale,
        );
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

  // do an integration step (Velocity Verlet method)
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

  // update the trace points for each planet
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
