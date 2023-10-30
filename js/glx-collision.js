var physics = {
  G: 6.674e-11, // Graviational constant
  length_scale: 1e9, // length scale
  dt: 60 * 60 * 12, // time step size
  trace_age: 60 * 60 * 24 * 400,
  time: 0,
  substeps: 1,
  n_asteroids: 200,
  safety_factor: 2,
};

var milchstrasse = [
  {
    name: "Milchstraße",
    color: "#6ff",
    mass: 2e30,
    radius: 10,
    x: 0,
    y: 0,
    v: { x: 0, y: 4e3 },
  },
];

var andromeda = [
  {
    name: "Andromedagalaxie",
    color: "#ff6",
    mass: 3e30,
    radius: 10,
    x: 0,
    y: 0,
    v: { x: -2e3, y: -4e3 },
  },
];

var solar_system = milchstrasse;
for (var n = 0; n < physics.n_asteroids; n++) {
  solar_system.push({
    name: "Asteroid" + n,
    color: "#AAA",
    mass: 1e15,
    radius: 1,
    orbitRadius: 1e11 * (0.2 + Math.random()),
  });
}
initial_condition();
for (var p of solar_system) {
  p.x -= 300e9;
  p.orbitRadius = null;
}
solar_system[1].name = "Erde";
solar_system[1].color = "#0077ff";

var solar_system = andromeda;
for (var n = 0; n < physics.n_asteroids; n++) {
  solar_system.push({
    name: "Asteroid" + (n + physics.n_asteroids),
    color: "#AAA",
    mass: 1e15,
    radius: 1,
    orbitRadius: 8e10 * (0.2 + Math.random()),
  });
}
initial_condition();
for (var p of solar_system) {
  p.x += 300e9;
  p.orbitRadius = null;
}

solar_system = milchstrasse.concat(andromeda);
