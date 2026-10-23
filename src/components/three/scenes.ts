// The one entry point to the 3D code. Both scenes are loaded through this single module so three.js
// ends up in one lazily-loaded chunk, rather than being hoisted into the bundle every page loads
// because two separate chunks share it.
export { default as CircuitScene } from './CircuitScene';
export { default as ReplayScene } from './ReplayScene';
