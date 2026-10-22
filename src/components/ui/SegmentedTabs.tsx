import { Pressable, Text, View } from 'react-native';

/**
 * An outlined segmented control with a lifted pill behind the selected option — selection reads as
 * a lift off the surface rather than a colour swap.
 */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} className="flex-row rounded-[14px] border border-line p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={`flex-1 items-center rounded-[10px] px-5 py-2.5 transition-colors duration-200 ${
              selected ? 'bg-lifted' : 'hover:bg-surface'
            }`}
          >
            <Text className={`font-body-semi text-[15px] ${selected ? 'text-white' : 'text-muted'}`}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
