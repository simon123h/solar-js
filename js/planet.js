export class Planet {
  constructor(name, mass, radius, color = "#fff") {
    this.name = name; // name
    this.mass = mass; // mass [kg]
    this.radius = radius; // apparent radius in the visualization
    this.color = color; // color in the visualization
    this.x = 0; // position
    this.y = 0;
    this.vx = 0; // velocity
    this.vy = 0;
    this.ax = 0; // acceleration
    this.ay = 0;
    // dummy-planets show no trace and do not create force on others
    // they are more performant
    this.is_dummy = false;
  }

  // absolute velocity
  get v() {
    return Math.hypot(this.vx, this.vy);
  }
  // kinetic Energy
  E_kin() {
    return 0.5 * this.mass * (Math.pow(this.vx, 2) + Math.pow(this.vy, 2));
  }
}
