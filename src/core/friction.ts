/**
 * The velocity-dependent factor of Chandrasekhar's dynamical friction in a halo with a Maxwellian velocity
 * distribution: erf(x) - 2x / sqrt(pi) * exp(-x^2), where x is the speed over sqrt(2) times the dispersion.
 * It rises like x^3 for slow bodies and approaches 1 for fast ones.
 * @param x - The speed relative to the halo, in units of sqrt(2) times its velocity dispersion.
 * @returns A number between 0 and 1.
 */
export function friction_factor(x: number): number {
  if (x < 0.5) {
    // erf and the exponential term cancel for small x, so use their series: the first terms of
    // 2/sqrt(pi) * (2x^3/3 - 2x^5/5 + x^7/7 - x^9/27 + x^11/132)
    const x2 = x * x;
    return (2 / Math.sqrt(Math.PI)) * x * x2 * (2 / 3 - (2 / 5) * x2 + (1 / 7) * x2 ** 2 - (1 / 27) * x2 ** 3 + (1 / 132) * x2 ** 4);
  }
  return erf(x) - ((2 * x) / Math.sqrt(Math.PI)) * Math.exp(-x * x);
}

/**
 * The error function, by the approximation of Abramowitz and Stegun (formula 7.1.26), with an error below 1.5e-7.
 * @param x - A non-negative number.
 */
function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * x);
  const polynomial = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return 1 - polynomial * Math.exp(-x * x);
}

/**
 * The Coulomb logarithm, ln(Lambda), of the dynamical friction on a body of mass M moving at speed v.
 * Lambda is the ratio of the largest impact parameter b_max to the one for a strong deflection, G M / v^2. The
 * form 1/2 ln(1 + Lambda^2) stays positive and fades out when the body is too massive for the halo around it.
 * @param b_max - The largest impact parameter that still counts, e.g. the distance to the center of the halo.
 * @param speed - The speed relative to the halo.
 * @param G - The gravitational constant.
 * @param mass - The mass of the body.
 */
export function coulomb_logarithm(b_max: number, speed: number, G: number, mass: number): number {
  const lambda = (b_max * speed * speed) / (G * mass);
  return 0.5 * Math.log(1 + lambda * lambda);
}
