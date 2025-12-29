/**
 * Represents a planet in the universe.
 */
export class Planet {
  /**
   * Creates a new Planet instance.
   * @param {string} name - The name of the planet.
   * @param {number} mass - The mass of the planet in kg.
   * @param {number} radius - The apparent radius of the planet in the visualization.
   * @param {string} [color="#fff"] - The color of the planet in the visualization.
   */
  constructor(name, mass, radius, color = "#fff") {
    /** @type {string} name - The name of the planet. */
    this.name = name;
    /** @type {number} mass - The mass of the planet in kg. */
    this.mass = mass;
    /** @type {number} radius - The apparent radius of the planet in the visualization. */
    this.radius = radius;
    /** @type {string} color - The color of the planet in the visualization. */
    this.color = color;
    /** @type {number} x - The x-coordinate of the planet's position. */
    this.x = 0;
    /** @type {number} y - The y-coordinate of the planet's position. */
    this.y = 0;
    /** @type {number} vx - The x-component of the planet's velocity. */
    this.vx = 0;
    /** @type {number} vy - The y-component of the planet's velocity. */
    this.vy = 0;
    /** @type {number} ax - The x-component of the planet's acceleration. */
    this.ax = 0;
    /** @type {number} ay - The y-component of the planet's acceleration. */
    this.ay = 0;
    /**
     * @type {boolean} is_dummy - Dummy planets show no trace and do not create force on others.
     * They are more performant.
     */
    this.is_dummy = false;
    /** @type {number[][] | null} trace - Array of trace points [time, x, y]. */
    this.trace = null;
    /** @type {number} shadow - Shadow blur amount. */
    this.shadow = null;
  }

  /**
   * Gets the absolute velocity of the planet.
   * @returns {number} The magnitude of the velocity vector.
   */
  get v() {
    return Math.hypot(this.vx, this.vy);
  }

  /**
   * Calculates the kinetic energy of the planet.
   * @returns {number} The kinetic energy (0.5 * m * v^2).
   */
  E_kin() {
    return 0.5 * this.mass * (Math.pow(this.vx, 2) + Math.pow(this.vy, 2));
  }
}