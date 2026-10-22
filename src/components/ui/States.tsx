import { Text, View } from 'react-native';

import { SecondaryButton } from './Buttons';
import { LoadingCar } from './LoadingCar';

/** Placeholder bars in the shape of what's coming, so a list fills in rather than appearing. */
export function SkeletonRows({ count = 8 }: { count?: number }) {
  return (
    <View accessibilityLabel="Loading" className="animate-pulse">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} className="flex-row items-center gap-3 border-b border-line/60 px-4 py-3.5">
          <View className="h-7 w-7 rounded-full bg-white/10" />
          <View className="h-[18px] w-[42px] rounded-badge bg-white/10" />
          <View className="flex-1 gap-2">
            <View className="h-3.5 rounded bg-white/10" style={{ width: `${45 + ((i * 17) % 30)}%` }} />
            <View className="h-3 w-1/4 rounded bg-white/[0.06]" />
          </View>
          <View className="h-3.5 w-12 rounded bg-white/10" />
        </View>
      ))}
    </View>
  );
}

/** The full loading state, for waits where there is genuinely nothing to show yet. */
export function PageLoading({ caption }: { caption?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 py-24">
      <LoadingCar width={280} />
      {caption ? <Text className="font-body text-[15px] text-muted">{caption}</Text> : null}
    </View>
  );
}

/** Errors say what failed and how to fix it, in the interface's voice. */
export function ErrorState({ title, detail, onRetry }: { title: string; detail?: string; onRetry?: () => void }) {
  return (
    <View className="items-start gap-3 py-16">
      <Text className="font-display text-[26px] text-white">{title}</Text>
      {detail ? <Text className="max-w-[60ch] font-body text-[16px] leading-6 text-muted">{detail}</Text> : null}
      {onRetry ? <SecondaryButton onPress={onRetry}>Try again</SecondaryButton> : null}
    </View>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <View className="gap-2 py-16">
      <Text className="font-display text-[26px] text-white">{title}</Text>
      <Text className="max-w-[60ch] font-body text-[16px] leading-6 text-muted">{detail}</Text>
    </View>
  );
}

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong loading this data.');
