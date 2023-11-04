$(document).ready(function () {
  // redraw the universe
  redraw();
  // start the simulation
  run_simulation();
});

// runs the simulation loop
function run_simulation() {
  var n = 0;
  var simulation_intvl = setInterval(function () {
    if (universe.physics.time == null) universe.physics.time = 0;
    n += 1;
    // do integration step(s)
    for (var i = 0; i < universe.physics.substeps; i++)
      integration_step();
    // update visualization
    redraw();
    // manage trace
    if (n % 5 == 0)
      manage_trace();
    // do statistics
    if (n % 20 == 0)
      do_stats(n);
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
async function redraw() {
  var scale = universe.physics.length_scale;
  var canvas = document.getElementById("canvas");
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  var ctx = canvas.getContext("2d");
  // fill black
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";

  for await (var planet of universe.planets) {
    ctx.fillStyle = planet.color;
    if (planet.shadow != null) {
      ctx.shadowColor = planet.color;
      ctx.shadowBlur = planet.shadow;
    }
    var x = canvas.width / 2 + planet.x / scale;
    var y = canvas.height / 2 + planet.y / scale;
    ctx.beginPath();
    ctx.arc(x, y, planet.radius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#888";
    // draw label
    if (!planet.is_dummy && planet.name != "")
      ctx.fillText(planet.name, x, y - 1.05 * planet.radius - 5);
    // draw trace
    if (!planet.is_dummy && planet.trace != null) {
      ctx.strokeStyle = planet.color;
      for (var i = planet.trace.length - 1; i >= 0; i--) {
        var t = planet.trace[i];
        ctx.globalAlpha = (1 - (universe.physics.time - t[0]) / universe.physics.trace_age) / 2;
        var tx = canvas.width / 2 + t[1] / scale;
        var ty = canvas.height / 2 + t[2] / scale;
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
}

// update the trace points for each planet
async function manage_trace() {
  var time = universe.physics.time;
  var deltime = time - universe.physics.trace_age;
  for await (var planet of universe.planets) {
    if (planet.is_dummy) continue;
    if (planet.trace == null) planet.trace = [];
    planet.trace = planet.trace.filter((t) => (t[0] >= deltime));
    planet.trace.push([time, planet.x, planet.y]);
  }
}

// compute and show statistics
var _last_stats = {}
async function do_stats(n) {
  var statsbox = document.getElementById("stats-box");
  var days = "Day " + (universe.physics.time / 60 / 60 / 24).toFixed(0);
  var now = performance.now()
  var fps = (n - _last_stats.n) / (now - _last_stats.time) * 1000;
  _last_stats.time = now;
  _last_stats.n = n;
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
  universe = universes[select.value];
  u = universe_dict();
}