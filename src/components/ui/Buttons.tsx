import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';

// The pill family from the app's Buttons.kt. Every one scales down slightly while pressed instead
// of rippling — the app's single shared press feel.
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
    <Pressed action={action as Action} className={`self-start rounded-full bg-red px-6 py-3 hover:bg-red-dark ${press}`}>
      <Text className="font-body-bold text-[15px] text-white">{children}</Text>
    </Pressed>
  );
}

/** A quieter outlined pill for secondary actions. */
export function SecondaryButton({ children, ...action }: { children: string } & Action) {
  return (
    <Pressed action={action as Action} className={`self-start rounded-full border border-line px-4 py-2 hover:border-muted ${press}`}>
      <Text className="font-body-semi text-[14px] text-white">{children}</Text>
    </Pressed>
  );
}

/**
 * An on/off pill for switching what a page shows. "On" is the same pill lit up — filled red with a
 * red glow — rather than a different control; it animates only when toggled.
 */
export function TogglePill({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      className={`rounded-full border px-4 py-2 transition-all duration-200 ${press} ${
        active ? 'border-red bg-red shadow-[0_0_16px_rgba(225,6,0,0.55)]' : 'border-line hover:border-muted'
      }`}
    >
      <Text className={`font-body-semi text-[14px] ${active ? 'text-white' : 'text-muted'}`}>{label}</Text>
    </Pressable>
  );
}
