
var physics = {
    "G": 6.674e-11, // Graviational constant
    "length_scale": 1e9, // length scale
    "dt": 60 * 60 * 24, // time step size
    "time": 0
}

var solar_system = {
    "Sonne": {
        "color": "#ff0",
        "mass": 1.988e30,
        "radius": 12,
        "orbitRadius": 0,
    },
    "Merkur": {
        "color": "#999999",
        "mass": 3.3011e23,
        "radius": 5,
        "orbitRadius": 5.9133e10,
    },
    "Venus": {
        "color": "#ffff99",
        "mass": 4.8675e23,
        "radius": 5,
        "orbitRadius": 1.082e11
    },
    "Erde": {
        "color": "#0077ff",
        "mass": 5.972e24,
        "radius": 5,
        "orbitRadius": 1.5e11,
    },
    "Mars": {
        "color": "#ff0000",
        "mass": 6.4185e23,
        "radius": 5,
        "orbitRadius": 2.289e11
    },
    // "Jupiter": {
    //     "color": "#ff8c00",
    //     "mass": 1.8986e27,
    //     "radius": 5,
    //     "orbitRadius": 7.793e11
    // },
    // "Saturn": {
    //     "color": "#ffff80",
    //     "mass": 5.6846e26,
    //     "radius": 5,
    //     "orbitRadius": 1.429e12
    // },
    // "Uranus": {
    //     "color": "#7fffd4",
    //     "mass": 8.6832e25,
    //     "radius": 5,
    //     "orbitRadius": 2.874e12
    // },
    // "Neptun": {
    //     "color": "#4169e1",
    //     "mass": 1.0243e26,
    //     "radius": 5,
    //     "orbitRadius": 4.498e12
    // },
    // "Pluto": {
    //     "color": "#808080",
    //     "mass": 1.303e22,
    //     "radius": 5,
    //     "orbitRadius": 6.089e12
    // }
};
