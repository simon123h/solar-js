var universe = new Universe()
universe.physics.G = 6.674e-11;
universe.physics.length_scale = 1e5;
universe.physics.dt = 60 * 60 * 24;
universe.physics.trace_age = 1e7;
universe.physics.substeps = 1;
universe.physics.n_asteroids = 400;



// add the asteroid belt
for (var n = 0; n < universe.physics.n_asteroids; n++) {
  universe.generate_planets([{
    name: "",
    color: `hsl(${Math.random() * 360} 60% 70%)`,
    mass: 1e15,
    radius: 3,
    x: 800 * universe.physics.length_scale * (0.5 - Math.random()),
    y: 800 * universe.physics.length_scale * (0.5 - Math.random()),
  }]);
}

universes["n-body-universe"] = universe;

