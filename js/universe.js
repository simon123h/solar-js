var physics = {
  G: 6.674e-11, // Graviational constant
  length_scale: 1e1, // length scale
  dt: (60 * 60 * 12) / 1e6, // time step size
  trace_age: -1,
  substeps: 1,
  n_asteroids: 400,
};

var solar_system = [];

// add the asteroid belt
for (var n = 0; n < physics.n_asteroids; n++) {
  solar_system.push({
    name: "Asteroid" + n,
    color: "#AAA",
    mass: 1e15,
    radius: 1,
    x: 800 * physics.length_scale * (0.5 - Math.random()),
    y: 800 * physics.length_scale * (0.5 - Math.random()),
  });
}

solar_system = generate_solar_system(solar_system)

// convert to associative array
s = solar_dict();