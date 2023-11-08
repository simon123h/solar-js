class Universe {
    constructor() {
        this.planets = [] // array of planets in the universe
        this.physics = {
            G: 6.674e-11, // graviational constant
            length_scale: 1e9, // length scale
            dt: 60 * 60 * 6, // time step size
            trace_age: 60 * 60 * 24 * 400, // length of traces in the visualization
            substeps: 1, // number of time steps per frame
        }
    }

    // generate list of Planet objects from a list of planet specs (a list of associative arrays)
    generate_planets(planet_specs) {
        for (var p of planet_specs) {
            var planet = new Planet(p.name, p.mass, p.radius, p.color);
            // copy all the other properties (NOTE: this is a bit hacky, maybe remove at some point)
            for (var prop in p)
                planet[prop] = p[prop];
            this.planets.push(planet);
        }
    }

    // return the planets as an associative dict, makes debugging easier
    as_dict() {
        var result = {};
        for (var planet of universe.planets) {
            if (planet.name == "") continue;
            result[planet.name] = planet;
        }
        return result;
    }

    // find a planet by its name
    get_planet_by_name(name) {
        for (var planet of this.planets) {
            if (planet.name == name)
                return planet
        }
        return null;
    }
}

class Planet {
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
    get v() { return Math.hypot(this.vx, this.vy); }
    // kinetic Energy
    E_kin() { return 0.5 * this.mass * (Math.pow(this.vx, 2) + Math.pow(this.vy, 2)); }
}

// put planet on a circular orbit around another planet (attractor)
function circularize(planet, orbit_radius, attractor, sign = 1) {
    // if attractor is a list of planets, compute their graviational center
    if (attractor.constructor === Array) {
        var new_attr = { x: 0, y: 0, mass: 0 };
        for (var a of attractor) {
            new_attr.mass += a.mass;
            new_attr.x += a.mass * a.x;
            new_attr.y += a.mass * a.y;
        }
        new_attr.x /= new_attr.mass;
        new_attr.y /= new_attr.mass;
        attractor = new_attr;
    }
    // put planet somewhere on the orbit
    var angle = Math.random() * 2 * Math.PI;
    planet.x = attractor.x + orbit_radius * Math.cos(angle);
    planet.y = attractor.y + orbit_radius * Math.sin(angle);
    // compute the velocity from the equality of graviational and centripetal forces
    var velocity = Math.sqrt(universe.physics.G * attractor.mass / orbit_radius);
    // construct angle from rotating force vector by 90deg
    angle -= Math.PI / 2 * sign;
    planet.vx = velocity * Math.cos(angle);
    planet.vy = velocity * Math.sin(angle);
}
