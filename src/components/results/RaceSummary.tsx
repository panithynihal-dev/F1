import { Link } from 'expo-router';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import type { RaceResult } from '@/api/types';
import { SectionTitle } from '@/components/layout/Page';
import { CreditedImage } from '@/components/ui/CreditedImage';
import { HelmetText } from '@/components/ui/HelmetText';
import { celebrationPhoto } from '@/data/photos';
import { driverPalette } from '@/domain/helmets';
import { teamBrand } from '@/domain/teamBrand';

const MEDAL: Record<string, string> = { '1': '#F5C518', '2': '#C0C0C8', '3': '#CD7F32' };
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
const fullName = (r: RaceResult) => `${r.Driver.givenName} ${r.Driver.familyName}`;
const classified = (r: RaceResult) => /^\d+$/.test(r.positionText);

/**
 * What the time column says for one car. A lapped car's `time` is a gap measured on the lap it
 * finished on, which reads as being seconds behind; it's shown as laps down instead.
 */
export function raceOutcome(r: RaceResult, winnerLaps: number) {
  if (r.status === 'Finished') return r.Time?.time || 'Finished';
  if (r.status === 'Lapped' || r.status.startsWith('+')) {
    const down = winnerLaps - Number(r.laps);
    return down > 0 ? `+${down} ${down === 1 ? 'lap' : 'laps'}` : 'Lapped';
  }
  return `Out, lap ${r.laps}`;
}

/** "+14.602" or "+1:02.345" as seconds; null for the winner and anyone not on the lead lap. */
function gapSeconds(r: RaceResult) {
  const t = r.Time?.time ?? '';
  if (!t.startsWith('+')) return null;
  const [a, b] = t.slice(1).split(':');
  return b != null ? Number(a) * 60 + Number(b) : Number(a);
}

/** The top three: a celebration photo of each, their name in their own helmet colours. */
export function PodiumBand({ results }: { results: RaceResult[] }) {
  const winnerLaps = Number(results[0]?.laps) || 0;
  const wide = useWindowDimensions().width >= 768;
  return (
    <View className="gap-2 md:flex-row md:gap-3">
      {results.slice(0, 3).map((r) => {
        const color = teamBrand(r.Constructor.name).color;
        const photo = celebrationPhoto(r.Driver.driverId);
        return (
          <Link key={r.Driver.driverId} href={`/drivers/${r.Driver.driverId}`} asChild>
            <Pressable className="md:flex-1" accessibilityLabel={`${r.position}: ${fullName(r)}`}>
              <CreditedImage photo={photo} scrim="bottom" creditPosition="none" tint={color} className="h-full" >
                <View className="h-[3px]" style={{ backgroundColor: color, height: 4 }} />
                <View className={`flex-row items-center gap-4 p-4 pb-5 md:flex-col md:items-start md:gap-2.5 md:p-6 md:pb-7 ${photo ? 'md:pt-[120px]' : ''}`}>
                  <Text className="font-display tnum text-[48px] leading-[44px] md:text-[88px] md:leading-[80px]" style={{ color: MEDAL[r.position] }}>
                    {r.position}
                  </Text>
                  <View className="min-w-0 flex-1">
                    <HelmetText palette={driverPalette(r.Driver.driverId, r.Constructor.name)} size={wide ? 40 : 26}>
                      {wide ? fullName(r) : r.Driver.familyName}
                    </HelmetText>
                    <Text className="mt-1.5 font-body text-[15px] text-muted">
                      {r.Constructor.name}, from {r.grid === '0' ? 'the pit lane' : ordinal(Number(r.grid))}
                    </Text>
                  </View>
                  <Text className="font-display text-[20px] text-paper tnum md:text-[26px]">{raceOutcome(r, winnerLaps)}</Text>
                </View>
                {photo ? (
                  <Text numberOfLines={1} className="absolute bottom-1 right-2 max-w-[90%] font-body text-[9px] text-paper/60 md:text-[10px]">
                    {photo.credit}
                  </Text>
                ) : null}
              </CreditedImage>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

/** Three facts that tell the race's story beyond the order: who started on pole, who climbed, who was quickest. */
export function RaceFacts({ results }: { results: RaceResult[] }) {
  const gain = (r: RaceResult) => (Number(r.grid) || results.length) - Number(r.position);
  const pole = results.find((r) => r.grid === '1');
  const climb = [...results].filter(classified).sort((a, b) => gain(b) - gain(a))[0];
  const fastest = results.find((r) => r.FastestLap?.rank === '1');
  const items = [
    pole && { label: 'Pole', r: pole, line: classified(pole) ? `finished ${ordinal(Number(pole.position))}` : `out on lap ${pole.laps}` },
    climb && gain(climb) > 0 && { label: 'Biggest climb', r: climb, line: `${ordinal(Number(climb.grid) || results.length)} on the grid to ${ordinal(Number(climb.position))}` },
    fastest && { label: 'Fastest lap', r: fastest, line: `${fastest.FastestLap?.Time?.time ?? ''} on lap ${fastest.FastestLap?.lap ?? '?'}` },
  ].filter(Boolean) as { label: string; r: RaceResult; line: string }[];
  if (!items.length) return null;
  return (
    <View className="gap-2.5 md:flex-row">
      {items.map(({ label, r, line }) => (
        <View key={label} className="flex-row gap-3.5 border border-line bg-surface p-3.5 md:flex-1 md:p-[18px]">
          <View className="w-1 self-stretch" style={{ backgroundColor: teamBrand(r.Constructor.name).color }} />
          <View>
            <Text className="font-display-semi text-[15px] tracking-[0.04em] text-muted">{label}</Text>
            <Text className="mt-1 font-body-semi text-[17px] text-paper">{fullName(r)}</Text>
            <Text className="font-display text-[16px] text-muted">{line}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/** The full order, with places gained or lost and, for cars on the lead lap, how far behind they were. */
export function Classification({ results, laps }: { results: RaceResult[]; laps?: number }) {
  const winnerLaps = Number(results[0]?.laps) || 0;
  const leadLap = (r: RaceResult) => r.laps === results[0]?.laps;
  const gapMax = Math.max(1, ...results.filter(leadLap).map((r) => gapSeconds(r) ?? 0));
  return (
    <View>
      <SectionTitle aside={<Text className="hidden font-body text-[14px] text-muted md:flex">{laps ?? winnerLaps} laps. Bars show the gap to the winner for cars on the lead lap.</Text>}>
        Classification
      </SectionTitle>
      <View className="hidden flex-row gap-[18px] border-b border-strong px-4 pb-2.5 md:flex">
        {[
          ['Pos', 'w-[30px]'],
          ['', 'w-1'],
          ['Driver', 'w-[250px]'],
          ['Grid', 'w-14'],
          ['+/-', 'w-[46px]'],
          ['Gap to the winner (lead lap)', 'flex-1'],
          ['Time', 'w-[130px] text-right'],
          ['Pts', 'w-[50px] text-right'],
        ].map(([label, w], i) => (
          <Text key={i} className={`font-display-semi text-[15px] tracking-[0.04em] text-muted ${w}`}>
            {label}
          </Text>
        ))}
      </View>
      {results.map((r) => {
        const color = teamBrand(r.Constructor.name).color;
        const pos = classified(r) ? r.position : r.positionText;
        const moved = r.grid !== '0' && classified(r) ? Number(r.grid) - Number(r.position) : null;
        const gap = leadLap(r) ? gapSeconds(r) : null;
        const out = !classified(r) || raceOutcome(r, winnerLaps).startsWith('Out');
        return (
          <Link key={r.Driver.driverId} href={`/drivers/${r.Driver.driverId}`} asChild>
            <Pressable className={`flex-row items-center gap-2.5 border-b border-line py-[11px] transition-colors hover:bg-lifted md:gap-[18px] md:px-4 ${out ? 'opacity-55' : ''}`}>
              <Text className="w-[26px] font-display text-[20px] tnum md:w-[30px] md:text-[24px]" style={{ color: MEDAL[pos] ?? '#8E949D' }}>
                {pos}
              </Text>
              <View className="h-[30px] w-1" style={{ backgroundColor: color }} />
              <View className="min-w-0 flex-1 md:w-[250px] md:flex-none">
                <Text numberOfLines={1} className="font-body-semi text-[15px] text-paper md:text-[16px]">
                  <Text className="md:hidden">{r.Driver.familyName}</Text>
                  <Text className="hidden md:flex">{fullName(r)}</Text>
                </Text>
                <Text numberOfLines={1} className="font-body text-[13px] text-muted md:text-[14px]">
                  <Text className="md:hidden">
                    {r.grid === '0' ? 'Pit lane start' : `P${r.grid} start`}
                    {moved ? <Text style={{ color: moved > 0 ? '#43B02A' : '#E10600' }}>{`  ${moved > 0 ? '▲' : '▼'}${Math.abs(moved)}`}</Text> : null}
                  </Text>
                  <Text className="hidden md:flex">{r.Constructor.name}</Text>
                </Text>
              </View>
              <Text className="hidden w-14 font-display text-[17px] text-muted md:flex">{r.grid === '0' ? 'Pit' : `P${r.grid}`}</Text>
              <Text className="hidden w-[46px] font-display text-[16px] md:flex" style={{ color: moved && moved > 0 ? '#43B02A' : '#E10600' }}>
                {moved ? `${moved > 0 ? '▲' : '▼'}${Math.abs(moved)}` : ''}
              </Text>
              <View className="hidden flex-1 md:flex">{gap ? <View className="h-1.5 opacity-85" style={{ width: `${Math.max(2, (gap / gapMax) * 100)}%`, backgroundColor: color }} /> : null}</View>
              <View className="items-end md:w-[130px]">
                <Text className="font-display text-[16px] text-paper tnum md:text-[18px]">{raceOutcome(r, winnerLaps)}</Text>
                <Text className="font-display text-[14px] text-muted md:hidden">{r.points !== '0' ? `${r.points} pts` : ''}</Text>
              </View>
              <Text className="hidden w-[50px] text-right font-display text-[18px] text-paper tnum md:flex">{r.points !== '0' ? r.points : ''}</Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}
