import { useState } from 'react';
import { Text, View } from 'react-native';

export interface ChartRound {
  round: string;
  name: string;
  points: number;
}

const W = 640;
const H = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

/**
 * Points built up round by round, as a line in the team's colour. Hovering a round shows what that
 * race added. Grand Prix points only: sprint results come without a round to place them on.
 */
export function PointsChart({ rounds, color }: { rounds: ChartRound[]; color: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (rounds.length < 2) return null;

  const series = rounds.reduce<(ChartRound & { total: number })[]>((acc, r) => [...acc, { ...r, total: (acc.at(-1)?.total ?? 0) + r.points }], []);
  const max = Math.max(25, series.at(-1)?.total ?? 0);
  const x = (i: number) => PAD.left + (i / (series.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom);
  const line = series.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(' ');
  const area = `${line} L${x(series.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const ticks = [0, Math.round(max / 2), max];
  const focus = hover != null ? series[hover] : series[series.length - 1];

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap items-baseline justify-between gap-2">
        <Text className="font-body text-[14px] text-muted">
          {hover != null ? `After round ${focus.round}, ${focus.name}` : 'Grand Prix points so far, sprints not included'}
        </Text>
        <Text className="font-body-semi text-[15px] text-white tnum">
          {focus.total} points{hover != null ? `, +${focus.points} that race` : ''}
        </Text>
      </View>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Points by round: ${series.map((p) => `round ${p.round} ${p.total}`).join(', ')}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="pts-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#2A2A30" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fill="#9A9AA2" fontSize="12" fontFamily="Barlow_500Medium, sans-serif">
              {t}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#pts-fill)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {series.map((p, i) => (
          <g key={p.round} onMouseEnter={() => setHover(i)}>
            {/* A wide invisible column per round makes hovering forgiving. */}
            <rect x={x(i) - (W / series.length) / 2} y={0} width={W / series.length} height={H} fill="transparent" />
            <circle cx={x(i)} cy={y(p.total)} r={hover === i ? 5 : 3} fill={hover === i ? '#FFFFFF' : color} />
            {i % Math.ceil(series.length / 12) === 0 || i === series.length - 1 ? (
              <text x={x(i)} y={H - 8} textAnchor="middle" fill="#9A9AA2" fontSize="12" fontFamily="Barlow_500Medium, sans-serif">
                {p.round}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </View>
  );
}
