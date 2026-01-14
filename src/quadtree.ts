export interface Node {
  centerX: number;
  centerY: number;
  size: number;
  mass: number;
  comX: number;
  comY: number;
  bodyIndex: number;
  nw: Node | null;
  ne: Node | null;
  sw: Node | null;
  se: Node | null;
}

export class QuadTree {
  root: Node | null = null;
  private nodePool: Node[] = [];
  private poolUsed: number = 0;

  constructor() {}

  reset(x: number, y: number, size: number): void {
    this.poolUsed = 0;
    this.root = this.allocateNode(x, y, size);
  }

  private allocateNode(x: number, y: number, size: number): Node {
    if (this.poolUsed >= this.nodePool.length) {
      this.nodePool.push({
        centerX: x,
        centerY: y,
        size,
        mass: 0,
        comX: 0,
        comY: 0,
        bodyIndex: -1,
        nw: null,
        ne: null,
        sw: null,
        se: null,
      });
      return this.nodePool[this.poolUsed++];
    }
    const node = this.nodePool[this.poolUsed++];
    node.centerX = x;
    node.centerY = y;
    node.size = size;
    node.mass = 0;
    node.comX = 0;
    node.comY = 0;
    node.bodyIndex = -1;
    node.nw = node.ne = node.sw = node.se = null;
    return node;
  }

  insert(bodyIndex: number, x: number, y: number, mass: number, px: Float64Array, py: Float64Array, pmass: Float64Array): void {
    if (!this.root) return;
    this.insertBody(this.root, bodyIndex, x, y, mass, px, py, pmass);
  }

  private insertBody(node: Node, bodyIndex: number, x: number, y: number, mass: number, px: Float64Array, py: Float64Array, pmass: Float64Array): void {
    const totalMass = node.mass + mass;
    if (totalMass > 0) {
      node.comX = (node.comX * node.mass + x * mass) / totalMass;
      node.comY = (node.comY * node.mass + y * mass) / totalMass;
    } else {
      node.comX = x;
      node.comY = y;
    }
      node.mass = totalMass;

      // 2. If node is empty (leaf), just put body here
      // Must check ALL children to ensure it's truly a leaf
      if (node.bodyIndex === -1 && node.nw === null && node.ne === null && node.sw === null && node.se === null) {
          node.bodyIndex = bodyIndex;
          return;
      }



    if (node.bodyIndex !== -1) {
      const existingBody = node.bodyIndex;
      const ex = px[existingBody];
      const ey = py[existingBody];
      const em = pmass[existingBody];
      node.bodyIndex = -1;
      this.subdivideAndPush(node, existingBody, ex, ey, em, px, py, pmass);
    }

    this.subdivideAndPush(node, bodyIndex, x, y, mass, px, py, pmass);
  }

  private subdivideAndPush(node: Node, bodyIndex: number, x: number, y: number, mass: number, px: Float64Array, py: Float64Array, pmass: Float64Array): void {
    // Safety: Prevent infinite recursion if bodies are extremely close or identical
    if (node.size < 0.1) {
        node.bodyIndex = bodyIndex;
        return;
    }

    const cx = node.centerX;
    const cy = node.centerY;
    const half = node.size / 2;
    const quarter = half / 2;

    let child: Node;
    if (x < cx) {
      if (y < cy) {
        if (!node.nw) node.nw = this.allocateNode(cx - quarter, cy - quarter, half);
        child = node.nw;
      } else {
        if (!node.sw) node.sw = this.allocateNode(cx - quarter, cy + quarter, half);
        child = node.sw;
      }
    } else {
      if (y < cy) {
        if (!node.ne) node.ne = this.allocateNode(cx + quarter, cy - quarter, half);
        child = node.ne;
      } else {
        if (!node.se) node.se = this.allocateNode(cx + quarter, cy + quarter, half);
        child = node.se;
      }
    }
    this.insertBody(child, bodyIndex, x, y, mass, px, py, pmass);
  }

  calculateForce(
    bodyIndex: number,
    bx: number,
    by: number,
    pax: Float64Array,
    pay: Float64Array,
    G: number,
    theta: number,
    minDist: number,
    pRadius: Float64Array
  ): void {
    if (!this.root) return;
    this.calcForceRecursive(this.root, bodyIndex, bx, by, pax, pay, G, theta, minDist, pRadius);
  }

  private calcForceRecursive(
    node: Node,
    bodyIndex: number,
    bx: number,
    by: number,
    pax: Float64Array,
    pay: Float64Array,
    G: number,
    theta: number,
    minDist: number,
    pRadius: Float64Array
  ): void {
    const dx = node.comX - bx;
    const dy = node.comY - by;
    const distSq = dx * dx + dy * dy;
    
    // Check if node is effectively the body itself
    // (Optimization: avoid sqrt if very close/same)
    if (distSq === 0) return;

    const distance = Math.sqrt(distSq);

    // Barnes-Hut criterion
    // If node is internal and size / distance < theta, treat as single body
    // OR if node is a leaf (has a bodyIndex or no children)
    const isLeaf = node.bodyIndex !== -1 || (node.nw === null && node.ne === null && node.sw === null && node.se === null);
    
    if (isLeaf || (node.size / distance < theta)) {
        // Compute force
        if (isLeaf && node.bodyIndex === bodyIndex) return; // Self-interaction

        // Collision safety / softening
        // For leaves, we use actual radii sum. For nodes, just use body radius + arbitrary?
        // Let's rely on the passed minDist logic roughly.
        // Actually, if it's a node, we don't know the "radius" of the cluster.
        // Just use distance clamping.
        
        let d = distance;
        
        // If it's a leaf, use accurate radii collision
        if (isLeaf && node.bodyIndex !== -1) {
             const rSum = pRadius[bodyIndex] + pRadius[node.bodyIndex];
             // Note: external logic applied scale to minDist, assume minDist here is scaled
             if (d < minDist) d = minDist;
             // Actually, the original code had: max(dist, bbox * (r1+r2) * scale)
             // We can approximate.
             // If we really want accuracy for close interactions, BH might be less accurate unless we recurse.
             // But for optimization, let's assume standard gravity.
        } else {
            // For cluster, just prevent singularity
            if (d < minDist) d = minDist; 
        }
        
        // Recalculate distSq with clamped d?
        // Yes, to handle very close encounters cleanly.
        const dSq = d * d;

        const f = G * node.mass / (dSq * d); // f = G * M * m / r^2 -> a = G * M / r^2
        pax[bodyIndex] += f * dx;
        pay[bodyIndex] += f * dy;
    } else {
        // Recurse
        if (node.nw) this.calcForceRecursive(node.nw, bodyIndex, bx, by, pax, pay, G, theta, minDist, pRadius);
        if (node.ne) this.calcForceRecursive(node.ne, bodyIndex, bx, by, pax, pay, G, theta, minDist, pRadius);
        if (node.sw) this.calcForceRecursive(node.sw, bodyIndex, bx, by, pax, pay, G, theta, minDist, pRadius);
        if (node.se) this.calcForceRecursive(node.se, bodyIndex, bx, by, pax, pay, G, theta, minDist, pRadius);
    }
  }
}
