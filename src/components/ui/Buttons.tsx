import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';

// Broadcast-graphics buttons: the primary action is a red slanted plate (the one slanted shape on
// the site), secondary actions are square outlined boxes. Both press down slightly.
const press = 'transition-transform duration-150 active:scale-[0.97]';

type Action = { onPress: () => void; href?: never } | { href: Href; onPress?: never };

function Pressed({ action, className, children, label }: { action: Action; className: string; children: ReactNode; label?: string }) {
  if (action.href) {
    return (
      <Link href={action.href} asChild>
        <Pressable className={className} accessibilityLabel={label}>
          {children}
        </Pressable>
      </Link>
    );
  }
  return (
    <Pressable className={className} onPress={action.onPress} accessibilityRole="button" accessibilityLabel={label}>
      {children}
    </Pressable>
  );
}

/** The one filled call to action. */
export function PrimaryButton({ children, ...action }: { children: string } & Action) {
  return (
    <Pressed action={action as Action} className={`tm-slant self-start bg-red px-8 py-3 hover:bg-red-dark ${press}`}>
      <Text className="font-display text-[18px] uppercase tracking-[0.05em] text-white">{children}</Text>
    </Pressed>
  );
}

/** A quieter outlined pill for secondary actions. */
export function SecondaryButton({ children, ...action }: { children: string } & Action) {
  return (
    <Pressed action={action as Action} className={`self-start border border-strong px-5 py-[11px] hover:border-paper ${press}`}>
      <Text className="font-display text-[18px] uppercase tracking-[0.05em] text-paper">{children}</Text>
    </Pressed>
  );
}

/** An on/off box for switching what a page shows; "on" is outlined in paper white. */
export function TogglePill({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      className={`border px-4 py-2 transition-colors duration-200 ${press} ${active ? 'border-paper' : 'border-line hover:border-muted'}`}
    >
      <Text className={`font-display text-[16px] uppercase tracking-[0.04em] ${active ? 'text-paper' : 'text-muted'}`}>{label}</Text>
    </Pressable>
  );
}
