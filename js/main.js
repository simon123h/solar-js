document.addEventListener('DOMContentLoaded', function () {
  // set the default universe
  change_universe({ value: "solar-system" });
  // redraw the universe
  redraw();
  // start the simulation
  run_simulation();
}, false);

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
    if (n % 5 == 0) manage_trace();
    // do statistics
    if (n % 20 == 0) do_stats(n);
  }, 20);
  return simulation_intvl;
}

// update the gravitational forces for all planets
function update_forces() {
  // double loop over all planets
  var start = performance.now();
  var G = universe.physics.G;
  var radius_bbox = (universe.physics.bbox == null) ? 1 : universe.physics.bbox;
  // reset forces
  for (var planet of universe.planets) {
    planet.ax = planet.ay = 0;
  }
  // split planets into dummy-planets and nondummy-planets
  var dummy = universe.planets.filter((p) => p.is_dummy);
  var nondummy = universe.planets.filter((p) => !p.is_dummy);
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
      var distance = Math.sqrt(dx*dx + dy*dy);
      // make sure distance is not too close
      distance = Math.max(
        distance,
        radius_bbox * (p1.radius + p2.radius) * universe.physics.length_scale,
      );
      // gravitational acceleration for both planets
      var f = G / distance / distance / distance;
      p1.ax += f * dx * p2.mass;
      p1.ay += f * dy * p2.mass;
      p2.ax -= f * dx * p1.mass;
      p2.ay -= f * dy * p1.mass;
    }
  }
  _last_stats.force_time += performance.now() - start;
}

// do an integration step (Velocity Verlet method)
function integration_step() {
  var dt = universe.physics.dt;
  var dt2 = dt / 2;
  // update forces (acceleration)
  update_forces();
  for (var p of universe.planets) {
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
        ctx.globalAlpha =
          (1 - (universe.physics.time - t[0]) / universe.physics.trace_age) / 2;
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
    planet.trace = planet.trace.filter((t) => t[0] >= deltime);
    planet.trace.push([time, planet.x, planet.y]);
  }
}

// compute and show statistics
var _last_stats = {};
async function do_stats(n) {
  var statsbox = document.getElementById("stats-box");
  var days = "Day " + (universe.physics.time / 60 / 60 / 24).toFixed(0);
  var now = performance.now();
  var fps = ((n - _last_stats.n) / (now - _last_stats.time)) * 1000;
  _last_stats.time = now;
  _last_stats.n = n;
  var fps = fps ? fps.toFixed(0) : "??";
  fps += " fps";
  var ft = Math.round(_last_stats.force_time / 4) + "%<br>";
  statsbox.innerHTML = fps + "<br>" + days;
  _last_stats.force_time = 0;
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

// make the canvas zoomable
window.addEventListener("wheel", zoom_canvas);
function zoom_canvas(event) {
  var zoom_factor = 1 + event.deltaY / 2e4;
  universe.physics.length_scale *= zoom_factor;
  if (universe.physics.bbox == null) universe.physics.bbox = 1;
  universe.physics.bbox /= zoom_factor;
}
