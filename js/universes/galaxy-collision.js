var universe = new Universe()
universe.physics.G = 6.674e-11;
universe.physics.length_scale = 1e9;
universe.physics.dt = 60 * 60 * 3;
universe.physics.trace_age = 60 * 60 * 24 * 400;
universe.physics.substeps = 3;
universe.physics.n_asteroids = 500;




var milkyway = {
  name: "Milky Way",
  color: "#6ff",
  mass: 2e30,
  radius: 5,
  x: -300e9,
  y: 0,
  vx: 0,
  vy: 4e3,
};

var andromeda = {
  name: "Andromeda Galaxy",
  color: "#ff6",
  mass: 4e30,
  radius: 5,
  x: 300e9,
  y: 0,
  vx: -2e3,
  vy: -4e3,
};

universe.generate_planets([milkyway, andromeda]);

for (var n = 0; n < universe.physics.n_asteroids; n++) {
  var planet = {
    name: "MW" + n,
    color: "#CCF",
    mass: 1e15,
    radius: 1,
    shadow: 6,
    is_dummy: true,
  };
  var radius = 1e11 * (0.2 + Math.random());
  circularize(planet, radius, milkyway, 0.9);
  universe.generate_planets([planet]);
}

for (var n = 0; n < universe.physics.n_asteroids; n++) {
  var planet = {
    name: "AG" + n,
    color: "#FFC",
    mass: 1e15,
    radius: 1,
    shadow: 6,
    is_dummy: true,
  };
  var radius = 1e11 * (0.2 + Math.random());
  circularize(planet, radius, andromeda, 0.9);
  universe.generate_planets([planet]);
}

// hightlight the earth
universe.planets[2].name = "Earth";
universe.planets[2].color = "#0077ff";
universe.planets[2].is_dummy = false;
universe.planets[2].radius = 2;

universes["galaxy-collision"] = universe;
