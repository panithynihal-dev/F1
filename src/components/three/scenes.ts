// The one entry point to the 3D code, loaded lazily so three.js stays out of the bundle every page
// loads. Only the replay uses 3D now; the home hero is a photo carousel.
export { default as ReplayScene } from './ReplayScene';
