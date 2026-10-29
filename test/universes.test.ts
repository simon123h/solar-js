import { describe, it, expect } from "vitest";
import createSolarSystem from "../src/universes/solar-system";
import createGalaxyCollision, {
  GALAXY_BULGE_RADIUS,
  GALAXY_ENCOUNTER,
  GALAXY_HALO,
  GALAXY_UNITS,
  add_velocity_dispersion,
  exponential_disk_radius,
  spiral_angle,
} from "../src/universes/galaxy-collision";
import createNBodyUniverse from "../src/universes/n-body-universe";
import { seeded_random } from "../src/random";
import { Universe } from "../src/universe";
import { Planet } from "../src/planet";

describe("Universe Factories", () => {
  it("should create Solar System", () => {
    const universe = createSolarSystem();
    expect(universe.planets.length).toBeGreaterThan(10);
    expect(universe.get_planet_by_name("Sun")).toBeDefined();
    expect(universe.get_planet_by_name("Earth")).toBeDefined();
  });

  it("should create Galaxy Collision", () => {
    const universe = createGalaxyCollision();
    expect(universe.planets.length).toBeGreaterThan(2);
    expect(universe.get_planet_by_name("Milky Way")).toBeDefined();
    expect(universe.get_planet_by_name("Andromeda Galaxy")).toBeDefined();

    // thousands of stars, all but the two galaxies and the Earth being cheap dummy planets
    expect(universe.planets.length).toBeGreaterThan(6000);
    expect(universe.planets.filter((p) => !p.is_dummy)).toHaveLength(3);

    const earth = universe.get_planet_by_name("Earth");
    expect(earth?.is_dummy).toBe(false);
    expect(universe.planets.filter((p) => !p.is_dummy).map((p) => p.name)).toEqual(["Milky Way", "Andromeda Galaxy", "Earth"]);
  });

  it.each([
    ["without a bulge", {}],
    ["with halos and bulges", { halo: GALAXY_HALO, bulge_radius: GALAXY_BULGE_RADIUS }],
  ])("should resolve passes through the galaxy cores with its time step %s", (_name, options) => {
    const universe = createGalaxyCollision(seeded_random(1), options);
    const heaviest = Math.max(...universe.planets.map((p) => p.mass));
    const [mw] = universe.planets;
    const core = Math.sqrt(universe.physics.softening ** 2 + mw.core_radius ** 2);
    const core_crossing_time = Math.sqrt(core ** 3 / (universe.physics.G * heaviest));
    // a time step much longer than this injects spurious energy and flings bodies out of the galaxies
    expect(core_crossing_time).toBeGreaterThan(universe.physics.dt * 2);
  });

  describe("dynamical friction and the number of stars", () => {
    const options = { halo: GALAXY_HALO, bulge_radius: GALAXY_BULGE_RADIUS, stars: 0 };

    /** The distance between the two galaxies, sampled every 25 days for the given number of days. */
    function separations(friction: boolean, days: number): number[] {
      const universe = createGalaxyCollision(seeded_random(1), { ...options, friction });
      const [mw, ag] = universe.planets;
      const result: number[] = [];
      for (let day = 0; day <= days; day += 25) {
        while (universe.physics.time < day * 86400 - 1) universe.integration_step();
        result.push(Math.hypot(mw.x - ag.x, mw.y - ag.y));
      }
      return result;
    }

    it("should create the given number of stars per galaxy", () => {
      const universe = createGalaxyCollision(seeded_random(1), { stars: 40 });
      expect(universe.planets.filter((p) => p.name.startsWith("MW") || p.name === "Earth")).toHaveLength(40);
      expect(universe.planets.filter((p) => p.name.startsWith("AG"))).toHaveLength(40);
      expect(createGalaxyCollision(seeded_random(1), { stars: 0 }).planets).toHaveLength(2);
    });

    it("should only enable friction when asked for", () => {
      expect(createGalaxyCollision(seeded_random(1), { halo: GALAXY_HALO, stars: 0 }).halos.map((h) => h.friction)).toEqual([false, false]);
      expect(createGalaxyCollision(seeded_random(1), { halo: GALAXY_HALO, stars: 0, friction: true }).halos.map((h) => h.friction)).toEqual(
        [true, true],
      );
    });

    it("should make the galaxies bounce apart without friction, and merge with it", () => {
      const without = separations(false, 800);
      const with_friction = separations(true, 800);
      // after the first close pass the rigid halos let the galaxies swing apart again, and again and again
      const after_first_pass = without.slice(Math.floor(300 / 25));
      expect(Math.max(...after_first_pass)).toBeGreaterThan(450e9);
      // with friction they stay together: no body is ever farther apart than a few kpc again
      const merged = with_friction.slice(Math.floor(300 / 25));
      expect(Math.max(...merged)).toBeLessThan(30e9);
      // before the first pass friction hardly matters
      expect(with_friction[2] / without[2]).toBeCloseTo(1, 1);
    });

    it("should account for the energy the friction removed", () => {
      const universe = createGalaxyCollision(seeded_random(1), { ...options, friction: true });
      const initial_energy = universe.total_energy();
      while (universe.physics.time < 600 * 86400) universe.integration_step();
      const removed = universe.stats.dissipated_energy;
      expect(removed).toBeGreaterThan(Math.abs(initial_energy));
      // without the accounting the energy would seem to have collapsed; with it, it has not drifted much
      expect(Math.abs(universe.total_energy() - initial_energy) / Math.abs(initial_energy)).toBeGreaterThan(5);
      expect(Math.abs(universe.total_energy() + removed - initial_energy) / Math.abs(initial_energy)).toBeLessThan(0.15);
    });
  });

  describe("the merger preset", () => {
    it("should pass twice at a wide distance and then merge", () => {
      const universe = createGalaxyCollision(seeded_random(1), {
        halo: GALAXY_HALO,
        bulge_radius: GALAXY_BULGE_RADIUS,
        friction: true,
        encounter: GALAXY_ENCOUNTER,
        stars: 0,
      });
      const [mw, ag] = universe.planets;
      let previous = 600e9;
      let before_previous = 600e9;
      const pericenters: number[] = [];
      while (universe.physics.time < 800 * 86400) {
        universe.integration_step();
        const distance = Math.hypot(mw.x - ag.x, mw.y - ag.y);
        if (previous < before_previous && previous < distance) pericenters.push(previous);
        before_previous = previous;
        previous = distance;
      }
      // two wide passes, as far apart as the disks are large, and then a plunge into a merger
      expect(pericenters[0] / GALAXY_ENCOUNTER.pericenter).toBeCloseTo(1, 1);
      expect(pericenters[1]).toBeGreaterThan(0.7 * GALAXY_ENCOUNTER.pericenter);
      expect(pericenters[2]).toBeLessThan(0.1 * GALAXY_ENCOUNTER.pericenter);
      expect(previous).toBeLessThan(0.1 * GALAXY_ENCOUNTER.pericenter);
    });
  });

  describe("spin direction", () => {
    /** The total angular momentum of a galaxy's stars around it, in the z direction (negative: counter-clockwise on screen). */
    function spin_of(universe: Universe, galaxy: "Milky Way" | "Andromeda Galaxy"): number {
      const center = universe.get_planet_by_name(galaxy)!;
      const prefix = galaxy === "Milky Way" ? "MW" : "AG";
      return universe.planets
        .filter((p) => p.name.startsWith(prefix))
        .reduce((sum, p) => sum + (p.x - center.x) * (p.vy - center.vy) - (p.y - center.y) * (p.vx - center.vx), 0);
    }

    /** The angular momentum of the two galaxies' relative orbit. */
    function orbit_of(universe: Universe): number {
      const [mw, ag] = universe.planets;
      return (ag.x - mw.x) * (ag.vy - mw.vy) - (ag.y - mw.y) * (ag.vx - mw.vx);
    }

    it("should make both galaxies prograde by default", () => {
      const universe = createGalaxyCollision(seeded_random(1));
      expect(Math.sign(spin_of(universe, "Milky Way"))).toBe(Math.sign(orbit_of(universe)));
      expect(Math.sign(spin_of(universe, "Andromeda Galaxy"))).toBe(Math.sign(orbit_of(universe)));
    });

    it("should reverse the rotation of a single galaxy", () => {
      const universe = createGalaxyCollision(seeded_random(1), { spins: [1, -1] });
      expect(Math.sign(spin_of(universe, "Milky Way"))).toBe(Math.sign(orbit_of(universe)));
      expect(Math.sign(spin_of(universe, "Andromeda Galaxy"))).toBe(-Math.sign(orbit_of(universe)));
    });

    it("should reverse both galaxies", () => {
      const universe = createGalaxyCollision(seeded_random(1), { spins: [-1, -1] });
      expect(Math.sign(spin_of(universe, "Milky Way"))).toBe(-Math.sign(orbit_of(universe)));
      expect(Math.sign(spin_of(universe, "Andromeda Galaxy"))).toBe(-Math.sign(orbit_of(universe)));
    });

    it("should not change the orbit radii of the stars", () => {
      const radii = (spins: [number, number]) => {
        const universe = createGalaxyCollision(seeded_random(7), { spins });
        const [mw] = universe.planets;
        return universe.planets.filter((p) => p.name.startsWith("MW")).map((p) => Math.hypot(p.x - mw.x, p.y - mw.y));
      };
      const reversed = radii([-1, 1]);
      const prograde = radii([1, 1]);
      expect(reversed).toHaveLength(prograde.length);
      reversed.forEach((r, i) => expect(r / prograde[i]).toBeCloseTo(1, 12));
    });
  });

  describe("units", () => {
    it("should show the galaxy collision in kpc and Myr, and the other scenes in days", () => {
      expect(createGalaxyCollision().units).toBe(GALAXY_UNITS);
      expect(createSolarSystem().units).toBeNull();
      expect(createNBodyUniverse().units).toBeNull();
    });

    it("should map the halo's flat rotation speed to the Milky Way's 220 km/s", () => {
      // 1 km/s is 1.0227e-3 kpc per Myr
      const kpc_per_myr = (GALAXY_HALO.v0 * GALAXY_UNITS.seconds_per_time_unit) / GALAXY_UNITS.meters_per_length_unit;
      expect(kpc_per_myr / 1.0227e-3).toBeCloseTo(220, 0);
    });

    it("should put the disks at galactic sizes and the encounter at a few hundred Myr", () => {
      const universe = createGalaxyCollision(seeded_random(1));
      const [mw, ag] = universe.planets;
      const kpc = (meters: number) => meters / GALAXY_UNITS.meters_per_length_unit;
      expect(kpc(1.2e11)).toBeCloseTo(12, 9);
      expect(kpc(Math.hypot(ag.x - mw.x, ag.y - mw.y))).toBeCloseTo(60, 9);
      // the first close approach happens after about 160 simulated days
      const myr = (160 * 86400) / GALAXY_UNITS.seconds_per_time_unit;
      expect(myr).toBeGreaterThan(200);
      expect(myr).toBeLessThan(400);
    });
  });

  describe("exponential disk", () => {
    const scale = 0.35e11;
    const min_radius = 0.02e11;
    const max_radius = 1.6e11;
    const cumulative = (r: number) => 1 - (1 + r / scale) * Math.exp(-r / scale);
    const expected_fraction_within = (r: number) =>
      (cumulative(r) - cumulative(min_radius)) / (cumulative(max_radius) - cumulative(min_radius));

    it("should stay within the given limits", () => {
      const random = seeded_random(5);
      for (let i = 0; i < 2000; i++) {
        const r = exponential_disk_radius(random, scale, min_radius, max_radius);
        expect(r).toBeGreaterThanOrEqual(min_radius);
        expect(r).toBeLessThanOrEqual(max_radius);
      }
    });

    it("should follow the radial distribution of an exponential disk", () => {
      const random = seeded_random(6);
      const radii = Array.from({ length: 20000 }, () => exponential_disk_radius(random, scale, min_radius, max_radius));
      for (const r of [0.05e11, 0.2e11, 0.35e11, 0.7e11, 1.1e11, 1.5e11]) {
        const fraction = radii.filter((x) => x <= r).length / radii.length;
        expect(Math.abs(fraction - expected_fraction_within(r))).toBeLessThan(0.01);
      }
    });

    it("should put the most stars in the center, per unit area", () => {
      const universe = createGalaxyCollision(seeded_random(1));
      const [mw] = universe.planets;
      const radii = universe.planets.filter((p) => p.name.startsWith("MW")).map((p) => Math.hypot(p.x - mw.x, p.y - mw.y));
      const density = (inner: number, outer: number) =>
        radii.filter((r) => r >= inner && r < outer).length / (Math.PI * (outer ** 2 - inner ** 2));
      // the old uniform radii left the middle of the galaxy empty
      expect(Math.min(...radii)).toBeLessThan(0.05e11);
      const bands = [density(0.02e11, 0.2e11), density(0.2e11, 0.5e11), density(0.5e11, 0.9e11), density(0.9e11, 1.6e11)];
      expect(bands[0]).toBeGreaterThan(bands[1]);
      expect(bands[1]).toBeGreaterThan(bands[2]);
      expect(bands[2]).toBeGreaterThan(bands[3]);
    });
  });

  describe("velocity dispersion", () => {
    /**
     * The velocity of every Milky Way star relative to its galaxy, split into radial and tangential parts.
     * The tangential part is the angular momentum per unit radius: negative for counter-clockwise on screen.
     */
    function motions(universe: Universe) {
      const [mw] = universe.planets;
      return universe.planets
        .filter((p) => p.name.startsWith("MW"))
        .map((p) => {
          const dx = p.x - mw.x;
          const dy = p.y - mw.y;
          const r = Math.hypot(dx, dy);
          const vx = p.vx - mw.vx;
          const vy = p.vy - mw.vy;
          return { radial: (vx * dx + vy * dy) / r, tangential: (dx * vy - dy * vx) / r, speed: Math.hypot(vx, vy) };
        });
    }

    it("should add a random velocity proportional to the orbital speed", () => {
      const galaxy = new Planet("G", 1e30, 1);
      const random = seeded_random(4);
      const deltas = Array.from({ length: 4000 }, () => {
        const star = new Planet("S", 1, 1);
        star.vx = 3e4;
        add_velocity_dispersion(star, galaxy, 0.1, random);
        return [star.vx - 3e4, star.vy];
      });
      const rms = Math.sqrt(deltas.reduce((sum, [dx, dy]) => sum + (dx * dx + dy * dy) / 2, 0) / deltas.length);
      // each component has a standard deviation of 10% of the orbital speed
      expect(rms / 3e3).toBeCloseTo(1, 1);
      expect(deltas.reduce((sum, [dx]) => sum + dx, 0) / deltas.length / 3e3).toBeCloseTo(0, 1);
    });

    it("should leave the stars on exactly circular orbits without dispersion", () => {
      const universe = createGalaxyCollision(seeded_random(1), { dispersion: 0 });
      for (const m of motions(universe)) {
        expect(Math.abs(m.radial) / m.speed).toBeLessThan(1e-9);
        expect(m.tangential).toBeLessThan(0);
      }
    });

    it("should spread the stars evenly around circular motion, with no outward bias", () => {
      const universe = createGalaxyCollision(seeded_random(1));
      const radial = motions(universe).map((m) => m.radial / m.speed);
      const mean = radial.reduce((a, b) => a + b, 0) / radial.length;
      // the old tilt gave every star an outward speed of about 16% of its orbital speed
      expect(Math.abs(mean)).toBeLessThan(0.02);
      const spread = Math.sqrt(radial.reduce((sum, v) => sum + (v - mean) ** 2, 0) / radial.length);
      expect(spread).toBeGreaterThan(0.07);
      expect(spread).toBeLessThan(0.13);
    });
  });

  describe("spiral arms", () => {
    /**
     * Phase coherence of the stars around a center: 0 for a uniform disk, 1 if all stars lie exactly on
     * the arms. Each star's angle is corrected by the arm's winding, then folded onto one arm period.
     */
    function arm_coherence(
      bodies: { x: number; y: number }[],
      center: { x: number; y: number },
      arms: number,
      winding: number = 2.75,
    ): number {
      let re = 0;
      let im = 0;
      for (const b of bodies) {
        const radius = Math.hypot(b.x - center.x, b.y - center.y);
        const angle = Math.atan2(b.y - center.y, b.x - center.x);
        const phase = arms * (angle - winding * Math.log(radius / 0.2e11));
        re += Math.cos(phase);
        im += Math.sin(phase);
      }
      return Math.hypot(re, im) / bodies.length;
    }

    it("should gather the stars of both galaxies along two spiral arms", () => {
      const universe = createGalaxyCollision(seeded_random(3));
      const [mw, ag] = universe.planets;
      const stars = (prefix: string) => universe.planets.filter((p) => p.name.startsWith(prefix));
      expect(arm_coherence(stars("MW"), mw, 2)).toBeGreaterThan(0.6);
      expect(arm_coherence(stars("AG"), ag, 2)).toBeGreaterThan(0.6);
    });

    it("should not gather them along arms with a different count of arms", () => {
      const universe = createGalaxyCollision(seeded_random(3));
      const stars = universe.planets.filter((p) => p.name.startsWith("MW"));
      // three arms would see the two real arms cancel out
      expect(arm_coherence(stars, universe.planets[0], 3)).toBeLessThan(0.2);
    });

    it("should put stars on both arms, spread over the whole disk", () => {
      const random = seeded_random(5);
      const angles = Array.from({ length: 2000 }, () => spiral_angle(1e11, random));
      const per_arm = [0, 0];
      const offset = 2.75 * Math.log(1e11 / 0.2e11);
      for (const a of angles) per_arm[Math.round((a - offset) / Math.PI) % 2 === 0 ? 0 : 1]++;
      expect(per_arm[0]).toBeGreaterThan(800);
      expect(per_arm[1]).toBeGreaterThan(800);
    });

    it("should mirror the arms of a galaxy that rotates the other way", () => {
      const fixed = () => 0.5;
      // with this random source the arm offset is pi and there is no scatter
      for (const radius of [0.3e11, 0.7e11, 1.1e11]) {
        expect(spiral_angle(radius, fixed, -1) - Math.PI).toBeCloseTo(-(spiral_angle(radius, fixed, 1) - Math.PI), 12);
      }
      // still trailing: against the direction of rotation, the angle now decreases outwards
      expect(spiral_angle(1e11, fixed, -1)).toBeLessThan(spiral_angle(0.5e11, fixed, -1));
    });

    it("should trail the arms of a clockwise galaxy in the mirrored spiral", () => {
      const universe = createGalaxyCollision(seeded_random(3), { spins: [1, -1] });
      const [mw, ag] = universe.planets;
      const stars = (prefix: string) => universe.planets.filter((p) => p.name.startsWith(prefix));
      expect(arm_coherence(stars("MW"), mw, 2)).toBeGreaterThan(0.6);
      expect(arm_coherence(stars("AG"), ag, 2, -2.75)).toBeGreaterThan(0.6);
      expect(arm_coherence(stars("AG"), ag, 2, 2.75)).toBeLessThan(0.3);
    });

    it("should trail the arms: the angle increases outwards, against the direction of rotation", () => {
      const fixed = () => 0.5;
      expect(spiral_angle(1e11, fixed)).toBeGreaterThan(spiral_angle(0.5e11, fixed));
    });
  });

  describe("galaxy collision with halos", () => {
    /** The mean orbital speed of the Milky Way's stars within a radius band, relative to the galaxy. */
    function mean_speed(universe: Universe, min_radius: number, max_radius: number): number {
      const [mw] = universe.planets;
      const speeds = universe.planets
        .filter((p) => p.name.startsWith("MW"))
        .filter((p) => {
          const r = Math.hypot(p.x - mw.x, p.y - mw.y);
          return r >= min_radius && r < max_radius;
        })
        .map((p) => Math.hypot(p.vx - mw.vx, p.vy - mw.vy));
      return speeds.reduce((a, b) => a + b, 0) / speeds.length;
    }

    it("should have no halos unless asked for", () => {
      expect(createGalaxyCollision().halos).toEqual([]);
    });

    it("should give both galaxies a halo", () => {
      const universe = createGalaxyCollision(seeded_random(1), { halo: GALAXY_HALO });
      expect(universe.halos.map((h) => h.center.name)).toEqual(["Milky Way", "Andromeda Galaxy"]);
      expect(universe.halos.every((h) => h.v0 === GALAXY_HALO.v0)).toBe(true);
    });

    it("should flatten the rotation curve", () => {
      const slope = (universe: Universe) => mean_speed(universe, 0.2e11, 0.35e11) / mean_speed(universe, 0.95e11, 1.2e11);
      const plain = slope(createGalaxyCollision(seeded_random(1)));
      const with_halo = slope(createGalaxyCollision(seeded_random(1), { halo: GALAXY_HALO }));
      // a Keplerian disk is almost twice as fast at its inner edge as at its outer edge
      expect(plain).toBeGreaterThan(1.7);
      expect(with_halo).toBeLessThan(1.5);
      expect(with_halo).toBeGreaterThan(1);
    });

    it("should give both galaxies an extended bulge only when asked for", () => {
      const point = createGalaxyCollision(seeded_random(1));
      expect([point.planets[0].core_radius, point.planets[1].core_radius]).toEqual([0, 0]);
      const bulge = createGalaxyCollision(seeded_random(1), { bulge_radius: GALAXY_BULGE_RADIUS });
      expect([bulge.planets[0].core_radius, bulge.planets[1].core_radius]).toEqual([GALAXY_BULGE_RADIUS, GALAXY_BULGE_RADIUS]);
    });

    it("should give a rotation curve that rises through the bulge and then stays flat", () => {
      const universe = createGalaxyCollision(seeded_random(1), { halo: GALAXY_HALO, bulge_radius: GALAXY_BULGE_RADIUS });
      const inner = mean_speed(universe, 0.2e11, 0.3e11);
      const middle = mean_speed(universe, 0.45e11, 0.55e11);
      const outer = mean_speed(universe, 1.1e11, 1.2e11);
      expect(middle).toBeGreaterThan(inner * 1.05);
      expect(outer / middle).toBeGreaterThan(0.85);
      expect(outer / middle).toBeLessThan(1.1);
    });

    it("should place the stars in the same spiral arms with or without halos", () => {
      const positions = (halo: typeof GALAXY_HALO | null) =>
        createGalaxyCollision(seeded_random(2), { halo }).planets.map((p) => [p.x, p.y]);
      expect(positions(GALAXY_HALO)).toEqual(positions(null));
    });
  });

  it("should create N-Body Universe", () => {
    const universe = createNBodyUniverse();
    expect(universe.planets.length).toBeGreaterThan(0);
  });

  it.each([
    ["Solar System", createSolarSystem],
    ["Galaxy Collision", createGalaxyCollision],
    ["N-Body Universe", createNBodyUniverse],
  ])("should create the same %s from the same seed", (_name, create) => {
    const state = (random: () => number) => create(random).planets.map((p) => [p.x, p.y, p.vx, p.vy]);
    expect(state(seeded_random(1))).toEqual(state(seeded_random(1)));
    expect(state(seeded_random(1))).not.toEqual(state(seeded_random(2)));
  });
});
