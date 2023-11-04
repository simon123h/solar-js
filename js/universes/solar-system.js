var universe = {
  planets: [],
  physics: {
    G: 6.674e-11, // Graviational constant
    length_scale: 1e9, // length scale
    dt: 60 * 60 * 6, // time step size
    trace_age: 60 * 60 * 24 * 400,
    substeps: 2,
    n_asteroids: 400,
  }
};


universe.planets = generate_planets([
  {
    name: "Sun",
    color: "#ff0",
    mass: 1.988e30,
    radius: 20,
    shadow: 10,
    x: 0,
    y: 0
  },
  // {
  //     "name": "Sun2",
  //     "color": "#f0f",
  //     "mass": 1.988e29,
  //     "radius": 12,
  //     "orbitRadius": 5e10,
  // },
  {
    name: "Mercury",
    color: "#999999",
    mass: 3.3011e23,
    radius: 2,
    orbitRadius: 5.9133e10,
  },
  {
    name: "Venus",
    color: "#ffff99",
    mass: 4.8675e23,
    radius: 4,
    orbitRadius: 1.082e11,
  },
  {
    name: "Earth",
    color: "#0077ff",
    mass: 5.972e24,
    radius: 5,
    orbitRadius: 1.5e11,
  },
  {
    name: "Mars",
    color: "#ff0000",
    mass: 6.4185e23,
    radius: 4,
    orbitRadius: 2.289e11,
  },
  {
    name: "Jupiter",
    color: "#ff8c00",
    mass: 1.8986e27,
    radius: 11,
    orbitRadius: 7.793e11,
  },
  {
    name: "Saturn",
    color: "#ffff80",
    mass: 5.6846e26,
    radius: 5,
    orbitRadius: 1.429e12,
  },
  {
    name: "Uranus",
    color: "#7fffd4",
    mass: 8.6832e25,
    radius: 5,
    orbitRadius: 2.874e12,
  },
  {
    name: "Neptune",
    color: "#4169e1",
    mass: 1.0243e26,
    radius: 5,
    orbitRadius: 4.498e12,
  },
  {
    name: "Pluto",
    color: "#808080",
    mass: 1.303e22,
    radius: 5,
    orbitRadius: 6.089e12,
  },
]);

// add the asteroid belt
for (var n = 0; n < universe.physics.n_asteroids; n++) {
  universe.planets.push({
    name: "Asteroid" + n,
    color: "#AAA",
    mass: 1e15,
    radius: 1,
    orbitRadius: 4e11 * (1 + 0.05 * Math.random()),
    is_dummy: true,
  });
}

// make all planets circle around the sun
var sun = universe.planets[0]; // sun should have index 0
for (var planet of universe.planets) {
  if (planet == sun) continue;
  circularize(planet, planet.orbitRadius, sun);
}

universes["solar-system"] = universe;