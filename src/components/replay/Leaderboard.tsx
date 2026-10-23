import { formatGap, type LiveDriverRow } from '@/domain/leaderboard';
import { hexColor, teamBrand } from '@/domain/teamBrand';

const ROW = 36;

// Pirelli's own compound colours.
const COMPOUND: Record<string, { letter: string; color: string }> = {
  SOFT: { letter: 'S', color: '#E10600' },
  MEDIUM: { letter: 'M', color: '#FFC400' },
  HARD: { letter: 'H', color: '#F0F0F0' },
  INTERMEDIATE: { letter: 'I', color: '#00C853' },
  WET: { letter: 'W', color: '#2B7BE4' },
};

/**
 * The running order at this moment of the replay. Rows are placed absolutely and slide to their
 * new slot when the order changes, so an overtake reads as two cars swapping rather than a list
 * redrawing. Hovering or focusing a row highlights that car on the map.
 */
export function Leaderboard({
  rows,
  retired,
  gapsLoaded,
  highlighted,
  onHighlight,
}: {
  rows: LiveDriverRow[];
  retired: (driver: number) => boolean;
  gapsLoaded: boolean;
  highlighted: number | null;
  onHighlight: (driver: number | null) => void;
}) {
  // Stable DOM order (by car number) so each row keeps its element and the transform animates.
  const stable = [...rows].sort((a, b) => a.driverNumber - b.driverNumber);
  const slot = new Map(rows.map((row, i) => [row.driverNumber, i]));
  return (
    <div role="list" aria-label="Running order" style={{ position: 'relative', height: rows.length * ROW }}>
      {stable.map((row) => {
        const index = slot.get(row.driverNumber) ?? 0;
        const out = retired(row.driverNumber);
        const focus = highlighted === row.driverNumber;
        const colour = hexColor(row.teamColour) ?? teamBrand(row.teamName).color;
        const tyre = row.compound ? COMPOUND[row.compound.toUpperCase()] : undefined;
        return (
          <div
            key={row.driverNumber}
            role="listitem"
            tabIndex={0}
            className="tm-lb-row"
            onMouseEnter={() => onHighlight(row.driverNumber)}
            onMouseLeave={() => onHighlight(null)}
            onFocus={() => onHighlight(row.driverNumber)}
            onBlur={() => onHighlight(null)}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: ROW,
              transform: `translateY(${index * ROW}px)`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0 12px',
              borderRadius: 8,
              background: focus ? '#201F25' : 'transparent',
              opacity: out ? 0.4 : 1,
              cursor: 'default',
              fontFamily: 'Barlow_500Medium, system-ui, sans-serif',
              fontSize: 14,
              color: '#FFFFFF',
            }}
          >
            <span style={{ width: 22, textAlign: 'right', fontFamily: 'Rajdhani_700Bold', fontSize: 17, fontVariantNumeric: 'tabular-nums' }}>
              {row.position ?? '–'}
            </span>
            <span style={{ width: 4, height: 18, borderRadius: 2, background: colour }} />
            <span style={{ width: 40, fontFamily: 'Barlow_700Bold' }}>{row.acronym}</span>
            <span style={{ flex: 1, color: '#9A9AA2', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {out ? 'Out' : row.isPitting ? <span style={{ color: '#FFA733', fontFamily: 'Barlow_700Bold' }}>In the pits</span> : row.name}
            </span>
            <span style={{ width: 74, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: index === 0 ? '#FFFFFF' : '#C8C8CE' }}>
              {out ? '' : index === 0 ? 'Leader' : gapsLoaded ? formatGap(row.gapToLeader) : '…'}
            </span>
            <span
              title={row.compound ?? undefined}
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                border: `2px solid ${tyre?.color ?? '#3C3C42'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontFamily: 'Barlow_700Bold',
                color: tyre?.color ?? '#9A9AA2',
              }}
            >
              {tyre?.letter ?? ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
