
$(document).ready(function () {
    //add the asteroid belt
    asteroid_belt();
    // add all the planets
    for (var planet in solar_system) {
        add_planet(planet, solar_system[planet]);
    }
    // set the initial condition
    initial_condition();
    // assign initial coordinates
    update_positions();
    // start the simulation
    run_simulation();
})


function add_planet(name, properties) {
    var canvas = document.getElementById("canvas");
    var p = properties;
    var planet = document.createElement("div");
    planet.setAttribute("id", name);
    planet.setAttribute("class", "planet");
    planet.style["background-color"] = p.color;
    planet.style.width = `${p.radius * 2}px`;
    planet.style.height = `${p.radius * 2}px`;
    planet.style.margin = `-${p.radius}px`;
    if (!name.startsWith("Asteroid"))
        planet.innerHTML = `<span>${name}</span>`;
    canvas.appendChild(planet);
}

function asteroid_belt() {
    for (var n = 0; n < 60; n++) {
        solar_system["Asteroid" + n] = {
            "color": "#888",
            "mass": 1e15,
            "radius": 1,
            "orbitRadius": 4e11 * (1 + 0.1 * Math.random()),
        }
    }
}

function initial_condition() {
    for (var planet in solar_system) {
        var angle = Math.random() * 2 * Math.PI;
        var rad = solar_system[planet].orbitRadius;
        solar_system[planet].x = rad * Math.sin(angle);
        solar_system[planet].y = rad * Math.cos(angle);
    }
    // update forces, to use them for initial velocity estimation
    update_forces();
    // estimate initial velocity
    for (var planet in solar_system) {
        var p1 = solar_system[planet];
        var p2 = solar_system[p1.main_attractor];
        var dx = p2.x - p1.x;
        var dy = p2.y - p1.y;
        var distance = Math.hypot(dx, dy);
        // gravitational force
        var force = physics.G * p1.mass * p2.mass / distance / distance;
        // compute velocity from equal graviational and centrifugal forces 
        var velocity = Math.sqrt(force * distance / p1.mass);
        if (planet == "Sonne")
            velocity = 0;
        // construct angle by rotating by 90deg
        var angle = Math.atan2(dy, dx) + Math.PI / 2;
        p1["velocity"] = { "x": velocity * Math.cos(angle), "y": velocity * Math.sin(angle) };
    }
}

function update_positions() {
    var scale = physics.length_scale;
    for (var planet in solar_system) {
        var prop = solar_system[planet];
        var p_elmnt = document.getElementById(planet);
        p_elmnt.style.left = (prop.x / scale) + "px";
        p_elmnt.style.top = (prop.y / scale) + "px";
    }
}

function run_simulation() {
    var n = 0;
    var simulation_intvl = setInterval(function () {
        n += 1;
        for (var i = 0; i < physics.substeps; i++) {
            // update the forces
            update_forces();
            // do integration step
            integration_step();
        }
        // update visualization
        update_positions();
        // manage trace
        if (n % 2 == 0)
            manage_trace();
    }, 20);
    return simulation_intvl;
}

function update_forces() {
    var G = physics.G;
    for (var planet in solar_system) {
        var fx = 0;
        var fy = 0;
        var max_force = 0;
        var main_attractor = null;
        var p1 = solar_system[planet];
        for (var planet2 in solar_system) {
            if (planet == planet2)
                continue;
            var p2 = solar_system[planet2];
            var dx = p2.x - p1.x;
            var dy = p2.y - p1.y;
            var distance = Math.hypot(dx, dy);
            // gravitational force
            var force = G * p1.mass * p2.mass / distance / distance;
            // TODO: angle and sin/cos in correct order?
            var angle = Math.atan2(dy, dx);
            fx += force * Math.cos(angle);
            fy += force * Math.sin(angle);
            // store the main attractor
            if (force > max_force) {
                max_force = force;
                main_attractor = planet2;
            }
        }
        // console.log(planet, "circularizes around", main_attractor)
        solar_system[planet]["force"] = { "x": fx, "y": fy };
        solar_system[planet]["main_attractor"] = main_attractor;
    }
}

function integration_step() {
    var dt = physics.dt;
    for (var planet in solar_system) {
        var p = solar_system[planet];
        // equations of motion
        p.x += dt * p.velocity.x;
        p.y += dt * p.velocity.y;
        p.velocity.x += dt * p.force.x / p.mass;
        p.velocity.y += dt * p.force.y / p.mass;
    }
    physics.time += dt;
}


function manage_trace() {
    var canvas = document.getElementById("canvas");
    var time = physics.time;
    var max_age = physics.trace_age;
    for (var planet in solar_system) {
        if (planet.startsWith("Asteroid"))
            continue;
        var p = solar_system[planet];
        var pel = document.getElementById(planet);
        var tr = document.createElement("div");
        tr.setAttribute("class", "trace");
        tr.setAttribute("time", time);
        tr.style.top = pel.style.top;
        tr.style.left = pel.style.left;
        tr.style.backgroundColor = pel.style.backgroundColor;
        canvas.appendChild(tr);
    }
    $(".trace").each(function () {
        var el_time = parseInt(this.getAttribute("time"));
        this.style.opacity = 1 - (time - el_time) / max_age;
        if (time - el_time > max_age)
            $(this).remove();
    });
}