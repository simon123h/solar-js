/**
 * Represents a planet in the universe.
 */
export class Planet {
  name: string;
  mass: number;
  radius: number;
  color: string;
  x: number = 0;
  y: number = 0;
  vx: number = 0;
  vy: number = 0;
  ax: number = 0;
  ay: number = 0;
  is_dummy: boolean = false;
  trace: Array<[number, number, number]> | null = null;
  shadow: number | null = null;

  /**
   * Creates a new Planet instance.
   * @param name - The name of the planet.
   * @param mass - The mass of the planet in kg.
   * @param radius - The apparent radius of the planet in the visualization.
   * @param color - The color of the planet in the visualization.
   */
  constructor(name: string, mass: number, radius: number, color: string = "#fff") {
    this.name = name;
    this.mass = mass;
    this.radius = radius;
    this.color = color;
  }

  /**
   * Gets the absolute velocity of the planet.
   * @returns The magnitude of the velocity vector.
   */
  get v(): number {
    return Math.hypot(this.vx, this.vy);
  }

  /**
   * Calculates the kinetic energy of the planet.
   * @returns The kinetic energy (0.5 * m * v^2).
   */
  E_kin(): number {
    return 0.5 * this.mass * (Math.pow(this.vx, 2) + Math.pow(this.vy, 2));
  }
}
