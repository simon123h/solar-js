$(document).ready(function () {
  // convert to associative array
  ss = solar_dict();
  // add all the planets
  for (var planet of solar_system) {
    add_planet(planet);
  }
  // set the initial condition
  initial_condition();
  // assign initial coordinates
  update_positions();
  // start the simulation
  run_simulation();
});

function add_planet(p) {
  var canvas = document.getElementById("canvas");
  var div = document.createElement("div");
  div.setAttribute("id", p.name);
  div.setAttribute("class", "planet");
  div.style["background-color"] = p.color;
  div.style.width = `${p.radius * 2}px`;
  div.style.height = `${p.radius * 2}px`;
  div.style.margin = `-${p.radius}px`;
  if (!p.name.startsWith("Asteroid")) div.innerHTML = `<span>${p.name}</span>`;
  canvas.appendChild(div);
  p["element"] = div;
}

function initial_condition() {
  // assign velocity vector to every planet
  for (var planet of solar_system) {
    if (planet.v == null) planet["v"] = { x: 0, y: 0 };
  }
  // if planet is orbiting around something, put it on its orbit
  for (var planet of solar_system) {
    if (planet.orbitRadius == null) continue;
    var angle = Math.random() * 2 * Math.PI;
    var rad = planet.orbitRadius;
    planet.x = rad * Math.sin(angle);
    planet.y = rad * Math.cos(angle);
  }
  // update forces, to use them for initial velocity estimation
  update_forces();
  // estimate initial velocity
  for (var planet of solar_system) {
    if (planet.orbitRadius == null) continue;
    var attr = planet.main_attractor;
    var dx = attr.x - planet.x;
    var dy = attr.y - planet.y;
    var distance = Math.hypot(dx, dy);
    // gravitational force
    var force = (physics.G * planet.mass * attr.mass) / distance / distance;
    // compute velocity from equal graviational and centrifugal forces
    var velocity = Math.sqrt((force * distance) / planet.mass);
    if (planet.name == "Sonne") velocity = 0;
    // construct angle by rotating by 90deg
    var angle = Math.atan2(dy, dx) + Math.PI / 2;
    planet["v"] = {
      x: velocity * Math.cos(angle),
      y: velocity * Math.sin(angle),
    };
  }
}

async function update_positions() {
  var scale = physics.length_scale;
  for await (var planet of solar_system) {
    planet.element.style.left = planet.x / scale + "px";
    planet.element.style.top = planet.y / scale + "px";
  }
}

function run_simulation() {
  var n = 0;
  var simulation_intvl = setInterval(function () {
    n += 1;
    // do integration step(s)

    for (var i = 0; i < physics.substeps; i++) {
      integration_step();
    }
    // update visualization
    update_positions();
    // manage trace
    if (n % 5 == 0) manage_trace();
  }, 20);
  return simulation_intvl;
}

function update_forces() {
  var G = physics.G;
  var sf = physics.length_scale * physics.safety_factor;
  for (var planet of solar_system) {
    var fx = 0;
    var fy = 0;
    var max_force = -1;
    var main_attractor = null;
    for (var planet2 of solar_system) {
      if (planet.name == planet2.name) continue;
      if (planet2.name.startsWith("Asteroid")) continue;
      var dx = planet2.x - planet.x;
      var dy = planet2.y - planet.y;
      var distance = Math.hypot(dx, dy);
      // gravitational force
      var force = (G * planet.mass * planet2.mass) / distance / distance;
      if (distance / sf < planet.radius + planet2.radius) {
        force = 0;
      }

      fx += (force * dx) / distance;
      fy += (force * dy) / distance;
      // store the main attractor
      if (force > max_force) {
        max_force = force;
        main_attractor = planet2;
      }
    }
    planet["force"] = { x: fx, y: fy };
    planet["main_attractor"] = main_attractor;
  }
}

function integration_step() {
  var dt = physics.dt;
  update_forces();
  for (var p of solar_system) {
    // store old values
    p["old_x"] = p.x;
    p["old_y"] = p.y;
    p["old_vx"] = p.v.x;
    p["old_vy"] = p.v.y;
    // equations of motion (Euler step)
    p.x += dt * p.v.x;
    p.y += dt * p.v.y;
    p.v.x += (dt * p.force.x) / p.mass;
    p.v.y += (dt * p.force.y) / p.mass;
  }
  update_forces();
  for (var p of solar_system) {
    // equations of motion (Heun step)
    p.x = 0.5 * (p.old_x + p.x + dt * p.v.x);
    p.y = 0.5 * (p.old_y + p.y + dt * p.v.y);
    p.v.x = 0.5 * (p.old_vx + p.v.x + (dt * p.force.x) / p.mass);
    p.v.y = 0.5 * (p.old_vy + p.v.y + (dt * p.force.y) / p.mass);
  }
  physics.time += dt;
}

async function manage_trace() {
  var canvas = document.getElementById("canvas");
  var time = physics.time;
  var max_age = physics.trace_age;
  for await (var planet of solar_system) {
    if (planet.name.startsWith("Asteroid")) continue;
    var tr = document.createElement("div");
    tr.setAttribute("class", "trace");
    tr.setAttribute("time", time);
    tr.style.top = planet.element.style.top;
    tr.style.left = planet.element.style.left;
    tr.style.backgroundColor = planet.element.style.backgroundColor;

    canvas.appendChild(tr);
  }
  $(".trace").each(function () {
    var el_time = parseInt(this.getAttribute("time"));
    this.style.opacity = 1 - (time - el_time) / max_age;
    if (time - el_time > max_age) $(this).remove();
  });
}

function solar_dict() {
  var result = {};
  for (var planet of solar_system) {
    result[planet.name] = planet;
  }
  return result;
}

// abbreviation for the solar system
var ss = null;
