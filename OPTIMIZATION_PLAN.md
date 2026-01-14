# SolarJS Optimization Plan

This document outlines the strategy for optimizing the N-body physics simulation to support a significantly larger number of bodies.

## 1. Current Bottlenecks

### 1.1 Algorithmic Complexity ($O(N^2)$)

The current implementation uses a brute-force approach to gravity: every body's force is calculated against every other body.

- **Problem:** Doubling the number of bodies ($N$) results in $4 \times$ the calculation time.
- **Impact:** Critical. This is the hard limit for scaling.

### 1.2 Excessive Memory Allocation (Garbage Collection)

In `update_forces`, the simulation filters the entire `planets` array into two new arrays (`dummy` and `nondummy`) every single step.

- **Problem:** Frequent allocations trigger the JavaScript Garbage Collector (GC), causing periodic "stutters" or frame drops.
- **Impact:** High. Affects smoothness even at low body counts.

### 1.3 Data Locality & Object Overhead

The `Planet` class stores data as individual object properties.

- **Problem:** Iterating over an array of objects leads to "pointer chasing" in memory. CPUs are much faster when they can stream contiguous blocks of numbers.
- **Impact:** Medium/High. Limits the efficiency of the calculation loops.

### 1.4 Rendering Overhead

The Canvas 2D API is used to draw every planet as a path (`ctx.arc`).

- **Problem:** Drawing thousands of individual paths is expensive for the CPU.
- **Impact:** Medium. Becomes a bottleneck once the physics is optimized.

---

## 2. Phased Optimization Roadmap

### Phase 1: Low-Hanging Fruit (Immediate Gains)

- **Eliminate Allocations:** Replace `.filter()` with an in-place partitioning of the `planets` array or use pre-allocated index arrays.
- **Loop Optimization:** Use simple `for` loops instead of high-order functions.
- **RequestAnimationFrame:** Switch from `setInterval` to `requestAnimationFrame` to sync with the monitor's refresh rate and reduce unnecessary draws.

### Phase 2: Data Architecture (TypedArrays)

- **Structure of Arrays (SoA):** Refactor `Universe` to store physics data in `Float64Array` buffers (e.g., `this.positionsX`, `this.velocitiesX`).
- **Benefits:**
  - Dramatically improved cache locality.
  - Zero GC pressure during the physics loop.
  - Modern JS engines can often auto-vectorize (SIMD) these loops.

### Phase 3: Algorithmic Scaling (Barnes-Hut)

- **Implementation:** Implement a QuadTree (for 2D) to group distant bodies.
- **Complexity:** Reduces $O(N^2)$ to $O(N \log N)$.
- **Benefits:** This is the only way to reach tens of thousands of bodies.

### Phase 4: Advanced Hardware Utilization

- **OffscreenCanvas / WebWorkers:** Move the physics calculations to a separate thread so the UI remains responsive.
- **WebGL Rendering:** Use GPU instancing to draw all bodies in a single draw call.

---

## 3. Expected Performance Gains

| Phase       | Est. Max Bodies (60 FPS) | Improvement Factor |
| :---------- | :----------------------- | :----------------- |
| **Current** | ~200 - 400               | 1x                 |
| **Phase 1** | ~500 - 800               | 2x                 |
| **Phase 2** | ~1,500 - 2,500           | 5-8x               |
| **Phase 3** | 10,000+                  | 50x+               |

---

## 4. Summary of Recommendations

Start with **Phase 1** to stabilize the current engine, then move to **Phase 2** for a robust performance foundation. **Phase 3** should be pursued if the goal is to simulate massive galaxy-scale systems.
