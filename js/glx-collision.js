var physics = {
  G: 6.674e-11, // Graviational constant
  length_scale: 1e9, // length scale
  dt: 60 * 60 * 12, // time step size
  trace_age: 60 * 60 * 24 * 400,
  n_asteroids: 200,
};

var milchstrasse = {
  name: "Milchstraße",
  color: "#6ff",
  mass: 2e30,
  radius: 10,
  x: -300e9,
  y: 0,
  vx: 0,
  vy: 4e3,
};

var andromeda = {
  name: "Andromedagalaxie",
  color: "#ff6",
  mass: 3e30,
  radius: 10,
  x: 300e9,
  y: 0,
  vx: -2e3,
  vy: -4e3,
};

var solar_system = [milchstrasse, andromeda];

for (var n = 0; n < physics.n_asteroids; n++) {
  var planet = {
    name: "MW" + n,
    color: "#CCF",
    mass: 1e15,
    radius: 1,
    is_dummy: true,
  }
  solar_system.push(planet);
  var radius = 1e11 * (0.2 + Math.random());
  circularize(planet, radius, milchstrasse);
}

for (var n = 0; n < physics.n_asteroids; n++) {
  var planet = {
    name: "AG" + n,
    color: "#FFC",
    mass: 1e15,
    radius: 1,
    is_dummy: true,
  }
  solar_system.push(planet);
  var radius = 1e11 * (0.2 + Math.random());
  circularize(planet, radius, andromeda);
}

// hightlight the earth
solar_system[2].name = "Erde";
solar_system[2].color = "#0077ff";
solar_system[2].is_dummy = false;
solar_system[2].radius = 2;

solar_system = generate_solar_system(solar_system)

// convert to associative array
s = solar_dict();