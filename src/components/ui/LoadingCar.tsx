import { Asset } from 'expo-asset';

const car = Asset.fromModule(require('../../../assets/brand/aero_car.png')).uri;
const frontWheel = Asset.fromModule(require('../../../assets/brand/aero_wheel_front.png')).uri;
const rearWheel = Asset.fromModule(require('../../../assets/brand/aero_wheel_rear.png')).uri;

// Geometry from the app's F1LoadingAnimation.kt. The wheels are circular cut-outs of the car
// artwork itself, spun in place: a disc rotated about its own centre covers exactly the area it
// came from, so there is no seam to match — even the sidewall lettering turns with the tyre.
const SPRITE_W = 810;
const SPRITE_H = 275;
const REAR_CX = 0.3025;
const FRONT_CX = 0.779;
const WHEEL_CY = 0.68;

/** The site's loading state: the car on a rolling road, wheels turning, air streaming back over it. */
export function LoadingCar({ width = 300 }: { width?: number }) {
  const height = (width * SPRITE_H) / SPRITE_W;
  const scale = width / SPRITE_W;
  const wheel = (src: string, cx: number, size: number) => (
    <img
      src={src}
      alt=""
      className="tm-wheel"
      style={{
        position: 'absolute',
        width: size * scale,
        height: size * scale,
        left: cx * width - (size * scale) / 2,
        top: WHEEL_CY * height - (size * scale) / 2,
      }}
    />
  );

  return (
    <div role="img" aria-label="Loading" style={{ position: 'relative', width, height, overflow: 'hidden', borderRadius: 12 }}>
      <div className="tm-chassis" style={{ position: 'absolute', inset: 0 }}>
        <img src={car} alt="" style={{ width, height, display: 'block' }} />
        {wheel(rearWheel, REAR_CX, 106)}
        {wheel(frontWheel, FRONT_CX, 102)}
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="tm-streak"
          style={{
            top: `${26 + i * 10}%`,
            width: `${16 + (i % 3) * 5}%`,
            opacity: 0.2 - i * 0.022,
            animationDelay: `${-i * 0.42}s`,
          }}
        />
      ))}
    </div>
  );
}
