var universe = {
  planets: [],
  physics: {
    G: 6.674e-11, // Graviational constant
    length_scale: 1e9, // length scale
    dt: 60 * 60 * 3, // time step size
    trace_age: 60 * 60 * 24 * 400,
    n_asteroids: 250,
    substeps: 3,
  }
};


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

universe.planets = [milkyway, andromeda];

for (var n = 0; n < universe.physics.n_asteroids; n++) {
  var planet = {
    name: "MW" + n,
    color: "#CCF",
    mass: 1e15,
    radius: 1,
    shadow: 6,
    is_dummy: true,
  };
  universe.planets.push(planet);
  var radius = 1e11 * (0.2 + Math.random());
  circularize(planet, radius, milkyway, 0.9);
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
  universe.planets.push(planet);
  var radius = 1e11 * (0.2 + Math.random());
  circularize(planet, radius, andromeda, 0.9);
}

// hightlight the earth
universe.planets[2].name = "Earth";
universe.planets[2].color = "#0077ff";
universe.planets[2].is_dummy = false;
universe.planets[2].radius = 2;

universe.planets = generate_planets(universe.planets);
universes["galaxy-collision"] = universe;
