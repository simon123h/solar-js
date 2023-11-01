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


// generate a solar system from a list of planet specs (a list of associative arrays)
function generate_solar_system(planet_specs) {
    var solar_system = [];
    for (var p of planet_specs) {
        var planet = new Planet(p.name, p.mass, p.radius, p.color);
        // copy all the other properties (NOTE: this is a bit hacky, maybe remove at some point)
        for (var prop in p)
            planet[prop] = p[prop];
        solar_system.push(planet);
    }
    return solar_system;
}

// converts the list of planets to an associative array of planets with their names as keys
function solar_dict() {
    var result = {};
    for (var planet of solar_system) {
        result[planet.name] = planet;
    }
    return result;
}


// put planet on a circular orbit around another planet (attractor)
function circularize(planet, orbit_radius, attractor) {
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
    var velocity = Math.sqrt(physics.G * attractor.mass / orbit_radius);
    // construct angle from rotating force vector by 90deg
    angle -= Math.PI / 2;
    planet.vx = velocity * Math.cos(angle);
    planet.vy = velocity * Math.sin(angle);
}
