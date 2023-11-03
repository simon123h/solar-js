$(document).ready(function () {
  // draw all the planets
  drawGUI();
  // start the simulation
  run_simulation();
});

// runs the simulation loop
function run_simulation() {
  universe.physics.time = 0;
  universe.physics.n = 0;
  var simulation_intvl = setInterval(function () {
    universe.physics.n += 1;
    // do integration step(s)
    for(var i=0; i<universe.physics.substeps; i++)
      integration_step();
    // update visualization
    drawGUI();
    // manage trace
    if (universe.physics.n % 5 == 0)
      manage_trace();
    if (universe.physics.n % 10 == 0)
      do_stats();
  }, 20);
  return simulation_intvl;
}

// update the gravitational forces for all planets
function update_forces() {
  // double loop over all planets
  var G = universe.physics.G;
  for (var p1 of universe.planets) {
    p1.ax = p1.ay = 0;
    for (var p2 of universe.planets) {
      if (p1 == p2 || p2.is_dummy) continue;
      // compute distance between planets
      var dx = p2.x - p1.x;
      var dy = p2.y - p1.y;
      var distance = Math.hypot(dx, dy);
      // make sure distance is not too close
      distance = Math.max(distance, (p1.radius + p2.radius) * universe.physics.length_scale)
      // gravitational acceleration (force divided by mass)
      var acc = (G * p2.mass) / distance / distance;
      p1.ax += acc * dx / distance;
      p1.ay += acc * dy / distance;
    }
  }
}

// do an integration step
function integration_step() {
  var dt = universe.physics.dt;
  update_forces();
  for (var p of universe.planets) {
    // store old values
    p.old_x = p.x;
    p.old_y = p.y;
    p.old_vx = p.vx;
    p.old_vy = p.vy;
    // equations of motion (Euler step)
    p.x += dt * p.vx;
    p.y += dt * p.vy;
    p.vx += dt * p.ax;
    p.vy += dt * p.ay;
  }
  update_forces();
  for (var p of universe.planets) {
    // equations of motion (Heun step)
    p.x = 0.5 * (p.old_x + p.x + dt * p.vx);
    p.y = 0.5 * (p.old_y + p.y + dt * p.vy);
    p.vx = 0.5 * (p.old_vx + p.vx + dt * p.ax);
    p.vy = 0.5 * (p.old_vy + p.vy + dt * p.ay);
  }
  universe.physics.time += dt;
}

// update planet positions in the GUI
async function drawGUI() {
  var scale = universe.physics.length_scale;
  for await (var planet of universe.planets) {
    if (planet.element == null) add_planet(planet);
    planet.element.style.left = planet.x / scale + "px";
    planet.element.style.top = planet.y / scale + "px";
  }
}

// add a planet to the GUI
function add_planet(planet) {
  var canvas = document.getElementById("canvas");
  var div = document.createElement("div");
  div.setAttribute("id", planet.name);
  div.setAttribute("class", "planet");
  div.style["background-color"] = planet.color;
  div.style.width = `${planet.radius * 2}px`;
  div.style.height = `${planet.radius * 2}px`;
  div.style.margin = `-${planet.radius}px`;
  if (!planet.is_dummy) div.innerHTML = `<span>${planet.name}</span>`;
  canvas.appendChild(div);
  planet.element = div;
}

// show the trace of the planets
async function manage_trace() {
  var canvas = document.getElementById("canvas");
  var time = universe.physics.time;
  var max_age = universe.physics.trace_age;
  for await (var planet of universe.planets) {
    if (planet.is_dummy) continue;
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

// compute and show statistics
var _last_stats = {}
async function do_stats() {
  var statsbox = document.getElementById("stats-box");
  var days = "Day " + (universe.physics.time / 60 / 60 / 24).toFixed(0);
  var now = performance.now()
  var fps = (universe.physics.n - _last_stats.n) / (now - _last_stats.time) * 1000;
  _last_stats.time = now;
  _last_stats.n = universe.physics.n;
  var fps = fps ? fps.toFixed(0) : "??";
  fps += " fps";
  statsbox.innerHTML = fps + "<br>" + days;
}


// registry of all available universes
var universes = {};
// currently selected universe
var universe = null;
var u = null;

// load a different universe
function change_universe(select) {
  for (var planet of universe.planets)
    planet.element = null;
  document.getElementById("canvas").innerHTML = "";
  universe = universes[select.value];
  u = universe_dict();
}