import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { RankBadge } from './ui/RankBadge';
import { TeamBadge } from './ui/TeamBadge';

/** The row every ranked list on the site shares: position, team chip, name and detail, a figure. */
export function StandingRow({
  position,
  teamName,
  teamColor,
  name,
  detail,
  figure,
  href,
  selected,
  onPress,
  trailing,
  bar,
}: {
  position?: string | null;
  teamName?: string | null;
  teamColor?: string | null;
  name: string;
  detail?: string;
  figure?: ReactNode;
  href?: Href;
  selected?: boolean;
  onPress?: () => void;
  trailing?: ReactNode;
  /** A slim bar under the name: this row's share of the leader's figure, in the team's colour. */
  bar?: { fraction: number; color: string };
}) {
  const body = (
    <Pressable
      onPress={onPress}
      disabled={!href && !onPress}
      accessibilityState={selected != null ? { selected } : undefined}
      className={`flex-row items-center gap-3 px-4 py-3 transition-colors ${
        selected ? 'bg-lifted' : href || onPress ? 'hover:bg-white/[0.03]' : ''
      }`}
    >
      <RankBadge position={position} />
      <TeamBadge teamName={teamName} exactColor={teamColor} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="font-body-semi text-[16px] text-white">
          {name}
        </Text>
        {detail ? (
          <Text numberOfLines={1} className="font-body text-[14px] text-muted">
            {detail}
          </Text>
        ) : null}
        {bar ? <View className="mt-1.5 h-1 rounded-full" style={{ width: `${Math.max(1.5, Math.min(1, bar.fraction) * 100)}%`, backgroundColor: bar.color }} /> : null}
      </View>
      {typeof figure === 'string' ? <Text className="font-body-semi text-[15px] text-white tnum">{figure}</Text> : figure}
      {trailing}
    </Pressable>
  );
  return href ? (
    <Link href={href} asChild>
      {body}
    </Link>
  ) : (
    body
  );
}
