var universe = {
  planets: [],
  physics: {
    G: 6.674e-11, // Graviational constant
    length_scale: 1e5, // length scale
    dt: 60 * 60 * 24, // time step size
    trace_age: 1e7,
    substeps: 1,
    n_asteroids: 400,
    substeps: 1,
  }
};


// add the asteroid belt
for (var n = 0; n < universe.physics.n_asteroids; n++) {
  universe.planets.push({
    name: "",
    color: `hsl(${Math.random() * 360} 60% 70%)`,
    mass: 1e15,
    radius: 3,
    x: 800 * universe.physics.length_scale * (0.5 - Math.random()),
    y: 800 * universe.physics.length_scale * (0.5 - Math.random()),
  });
}

universe.planets = generate_planets(universe.planets)
universes["n-body-universe"] = universe;

