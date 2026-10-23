import { Text, View } from 'react-native';

/** Where the numbers come from, and the line every unofficial F1 site owes its readers. */
export function SiteFooter() {
  return (
    <View className="border-t border-line/60 pb-24 md:pb-0">
      <View className="mx-auto w-full max-w-page gap-2 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-8">
        <Text className="font-body text-[14px] text-muted">
          Data from{' '}
          <a href="https://openf1.org" target="_blank" rel="noreferrer" style={{ color: '#FFFFFF' }}>
            OpenF1
          </a>{' '}
          and{' '}
          <a href="https://github.com/jolpica/jolpica-f1" target="_blank" rel="noreferrer" style={{ color: '#FFFFFF' }}>
            Jolpica
          </a>
          . Live sessions appear about half an hour after they finish.
        </Text>
        <Text className="font-body text-[14px] text-muted">An unofficial fan site, not affiliated with Formula 1.</Text>
      </View>
    </View>
  );
}
