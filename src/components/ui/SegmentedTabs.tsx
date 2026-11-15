import { Pressable, Text, View } from 'react-native';

/** A square segmented control; the selected option is filled red, the one red thing in the row. */
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
    <View accessibilityRole="tablist" accessibilityLabel={label} className="flex-row border border-line p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={`flex-1 items-center px-7 py-2.5 transition-colors duration-200 ${selected ? 'bg-red' : 'hover:bg-surface'}`}
          >
            <Text className={`font-display text-[18px] uppercase tracking-[0.04em] ${selected ? 'text-white' : 'text-muted'}`}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
