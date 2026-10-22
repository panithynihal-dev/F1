import { useEffect, useState } from 'react';

/**
 * The next circuit's racing line, large, wiped on in brand red with the logo's glow — the one piece
 * of motion on the page, played once on arrival.
 *
 * F1's artwork (via OpenF1) is a light racing line inside a thick dark outline. Masking by its
 * alpha would paint both, which reads as a blob; so the image is read once on a canvas and only
 * its bright pixels kept, giving a mask of the line alone. The whole silhouette stays underneath
 * as a faint ghost so the wipe has somewhere to land. The host sends CORS headers, which is what
 * makes reading the pixels allowed.
 */
export function CircuitHero({ imageUrl, label }: { imageUrl: string; label: string }) {
  const line = useRacingLineMask(imageUrl);
  const mask = (url: string) =>
    ({
      WebkitMaskImage: `url("${url}")`,
      maskImage: `url("${url}")`,
      WebkitMaskSize: 'contain',
      maskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
    }) as const;

  return (
    <div role="img" aria-label={label} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.05)', ...mask(imageUrl) }} />
      {line ? (
        <div className="tm-circuit-glow" style={{ position: 'absolute', inset: 0 }}>
          <div
            className="tm-circuit-wipe"
            style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #FF3B2F 0%, #E10600 55%, #B30000 100%)', ...mask(line) }}
          />
        </div>
      ) : null}
    </div>
  );
}

function useRacingLineMask(imageUrl: string) {
  const [mask, setMask] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0);
      try {
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = pixels.data;
        for (let i = 0; i < data.length; i += 4) {
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          // Keep the light line, ramping in over the anti-aliased edge; drop the dark outline.
          data[i + 3] = Math.round(Math.max(0, Math.min(1, (brightness - 120) / 80)) * data[i + 3]);
          data[i] = data[i + 1] = data[i + 2] = 255;
        }
        context.putImageData(pixels, 0, 0);
        if (!cancelled) setMask(canvas.toDataURL('image/png'));
      } catch {
        // A host without CORS taints the canvas; the ghost silhouette alone still shows the track.
      }
    };
    image.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);
  return mask;
}
