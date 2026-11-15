import { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';

export interface ChartRound {
  round: string;
  name: string;
  points: number;
}

export interface ChartSeries {
  label: string;
  color: string;
  rounds: ChartRound[];
}

const PAD = { top: 14, right: 14, bottom: 30, left: 40 };

const cumulative = (rounds: ChartRound[]) =>
  rounds.reduce<(ChartRound & { total: number })[]>((acc, r) => [...acc, { ...r, total: (acc.at(-1)?.total ?? 0) + r.points }], []);

/**
 * The points race: running totals round by round (Grand Prix plus sprint), one line per driver or
 * team. The first series is the page's subject, drawn thicker; an optional second is the rival it's
 * measured against. Hovering a round shows what each scored there.
 */
export function PointsChart({ series }: { series: ChartSeries[] }) {
  const [hover, setHover] = useState<number | null>(null);
  // A phone gets its own proportions so the axis labels stay readable instead of shrinking.
  const phone = useWindowDimensions().width < 768;
  const W = phone ? 380 : 760;
  const H = phone ? 240 : 300;
  const lines = series.filter((s) => s.rounds.length >= 2).map((s) => ({ ...s, points: cumulative(s.rounds) }));
  if (!lines.length) return null;

  const n = Math.max(...lines.map((l) => l.points.length));
  const max = Math.max(25, ...lines.map((l) => l.points.at(-1)?.total ?? 0)) * 1.05;
  const x = (i: number) => PAD.left + (i / Math.max(1, n - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom);
  const step = max > 300 ? 100 : max > 120 ? 50 : 25;
  const ticks = Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);
  const subject = lines[0];
  const at = hover ?? subject.points.length - 1;

  return (
    <View className="gap-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={lines.map((l) => `${l.label}: ${l.points.at(-1)?.total ?? 0} points after round ${l.points.at(-1)?.round}`).join('. ')}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#272C34" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fill="#8E949D" fontSize="12" fontFamily="Barlow_400Regular, sans-serif">
              {t}
            </text>
          </g>
        ))}
        {Array.from({ length: n }, (_, i) => i)
          .filter((i) => i % 3 === 0 || i === n - 1)
          .map((i) => (
            <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fill="#8E949D" fontSize="12" fontFamily="Barlow_400Regular, sans-serif">
              {subject.points[i]?.round ?? i + 1}
            </text>
          ))}
        {hover != null ? <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke="#3A404A" strokeWidth="1" /> : null}
        {[...lines].reverse().map((l) => {
          const d = l.points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(' ');
          const last = l.points.length - 1;
          return (
            <g key={l.label}>
              <path d={d} fill="none" stroke={l.color} strokeWidth={l === subject ? 3 : 2.5} strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={x(Math.min(at, last))} cy={y(l.points[Math.min(at, last)].total)} r="5" fill={l.color} />
            </g>
          );
        })}
        {Array.from({ length: n }, (_, i) => (
          <rect key={i} x={x(i) - (W - PAD.left - PAD.right) / Math.max(1, n - 1) / 2} y={0} width={(W - PAD.left - PAD.right) / Math.max(1, n - 1)} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      <View className="flex-row flex-wrap gap-x-5 gap-y-1">
        {lines.map((l) => {
          const p = l.points[Math.min(at, l.points.length - 1)];
          return (
            <View key={l.label} className="flex-row items-center gap-2">
              <View className="h-1 w-3.5" style={{ backgroundColor: l.color }} />
              <Text className="font-body text-[14px] text-paper tnum">
                {l.label} {p.total}
                {hover != null ? <Text className="text-muted">{`  +${p.points} at ${p.name}`}</Text> : null}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
