var universe = {
  planets: [],
  physics: {
    G: 6.674e-11, // Graviational constant
    length_scale: 1e1, // length scale
    dt: (60 * 60 * 12) / 1e6, // time step size
    trace_age: -1,
    substeps: 1,
    n_asteroids: 400,
    substeps: 1,
  }
};


// add the asteroid belt
for (var n = 0; n < universe.physics.n_asteroids; n++) {
  universe.planets.push({
    name: "",
    color: "#AAA",
    mass: 1e15,
    radius: 2,
    x: 800 * universe.physics.length_scale * (0.5 - Math.random()),
    y: 800 * universe.physics.length_scale * (0.5 - Math.random()),
  });
}

universe.planets = generate_planets(universe.planets)
universes["n-body-universe"] = universe;

