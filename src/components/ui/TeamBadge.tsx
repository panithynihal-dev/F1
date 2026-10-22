import { Text, View } from 'react-native';

import { hexColor, teamBrand } from '@/domain/teamBrand';

/**
 * A team's three-letter code on its colour — the stand-in for logos, which are other companies'
 * trademarks. Pass OpenF1's exact team_colour when the caller has it; Jolpica-sourced pages fall
 * back to the captured palette.
 */
export function TeamBadge({ teamName, exactColor }: { teamName?: string | null; exactColor?: string | null }) {
  const brand = teamBrand(teamName);
  return (
    <View
      className="min-w-[42px] items-center rounded-badge px-1.5 py-[3px]"
      style={{ backgroundColor: hexColor(exactColor) ?? brand.color }}
      accessibilityLabel={teamName ?? undefined}
    >
      <Text className="font-body-bold text-[11px] text-white">{brand.abbreviation}</Text>
    </View>
  );
}
