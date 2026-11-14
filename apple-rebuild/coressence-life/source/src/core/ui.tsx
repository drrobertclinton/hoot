// Shared interface pieces for every Coressence module.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS, RADIUS, useTheme } from './theme';

export type IconName = React.ComponentProps<typeof Feather>['name'];
type Variant = 'hero' | 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'small' | 'caption' | 'label' | 'stat' | 'figure' | 'quote';

// Type scale 1.2: serif display sizes step by a major third (1.25) from 17.5; numbers are set in Outfit.
const VARIANTS: Record<Variant, TextStyle> = {
  hero: { fontFamily: FONTS.displayBold, fontSize: 38, lineHeight: 42, letterSpacing: -0.8 },
  display: { fontFamily: FONTS.display, fontSize: 30, lineHeight: 35, letterSpacing: -0.5 },
  title: { fontFamily: FONTS.display, fontSize: 22, lineHeight: 27, letterSpacing: -0.2 },
  heading: { fontFamily: FONTS.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: FONTS.body, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: FONTS.medium, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: FONTS.body, fontSize: 14, lineHeight: 20.5 },
  caption: { fontFamily: FONTS.medium, fontSize: 12.5, lineHeight: 17 },
  label: { fontFamily: FONTS.caps, fontSize: 11, lineHeight: 15, letterSpacing: 1.7, textTransform: 'uppercase' },
  stat: { fontFamily: FONTS.num, fontSize: 27, lineHeight: 31, letterSpacing: -0.3 },
  figure: { fontFamily: FONTS.numLight, fontSize: 56, lineHeight: 58, letterSpacing: -2 },
  quote: { fontFamily: FONTS.italic, fontSize: 17, lineHeight: 25 },
};

export function T({ variant = 'body', color, style, ...rest }: TextProps & { variant?: Variant; color?: string }) {
  const c = useTheme();
  const def = variant === 'caption' || variant === 'label' ? c.muted : c.ink;
  return <Text maxFontSizeMultiplier={1.7} {...rest} style={[VARIANTS[variant], { color: color ?? def }, style]} />;
}

export function Card({ children, style, padded = true, onPress, testID, tint }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[]; padded?: boolean; onPress?: () => void; testID?: string; tint?: string }) {
  const c = useTheme();
  const base: ViewStyle = { backgroundColor: tint ?? c.surface, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.line, ...(padded ? { padding: 16 } : {}) };
  if (onPress)
    return (
      <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [base, style as ViewStyle, { opacity: pressed ? 0.85 : 1 }]}>
        {children}
      </Pressable>
    );
  return (
    <View testID={testID} style={[base, style as ViewStyle]}>
      {children}
    </View>
  );
}

type BtnKind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'teal';
export function Button({ label, icon, kind = 'primary', onPress, disabled, loading, style, testID, compact, color }: { label: string; icon?: IconName; kind?: BtnKind; onPress?: () => void; disabled?: boolean; loading?: boolean; style?: ViewStyle; testID?: string; compact?: boolean; color?: string }) {
  const c = useTheme();
  const bg = color ?? { primary: c.accent, secondary: c.surface2, ghost: 'transparent', danger: c.dangerSoft, teal: c.teal }[kind];
  const fg = color ? '#FFFFFF' : { primary: c.onAccent, secondary: c.ink, ghost: c.accent, danger: c.danger, teal: c.dark ? c.onAccent : '#FFFFFF' }[kind];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        { minHeight: compact ? 42 : 52, paddingHorizontal: compact ? 16 : 22, borderRadius: RADIUS.button, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Feather name={icon} size={compact ? 16 : 18} color={fg} /> : null}
      <Text maxFontSizeMultiplier={1.4} style={{ color: fg, fontFamily: FONTS.semibold, fontSize: compact ? 14.5 : 16 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, color, size = 22, filled, style, testID }: { icon: IconName; label: string; onPress?: () => void; color?: string; size?: number; filled?: boolean; style?: ViewStyle; testID?: string }) {
  const c = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: filled ? c.surface2 : 'transparent', opacity: pressed ? 0.6 : 1 }, style]}
    >
      <Feather name={icon} size={size} color={color ?? c.ink} />
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, icon, color, testID, small }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName; color?: string; testID?: string; small?: boolean }) {
  const c = useTheme();
  const on = color ?? c.accent;
  const fg = selected ? (c.dark && !color ? c.onAccent : '#FFFFFF') : c.inkSoft;
  const style: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: small ? 32 : 40, paddingHorizontal: small ? 11 : 14, borderRadius: RADIUS.chip, backgroundColor: selected ? on : c.surface2 };
  const content = (
    <>
      {icon ? <Feather name={icon} size={small ? 13 : 15} color={fg} /> : null}
      <Text maxFontSizeMultiplier={1.4} style={{ fontFamily: FONTS.medium, fontSize: small ? 13 : 14, color: fg }}>
        {label}
      </Text>
    </>
  );
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityState={{ selected: !!selected }} accessibilityLabel={label} onPress={onPress} hitSlop={4} style={({ pressed }) => [style, { opacity: pressed ? 0.7 : 1 }]}>
      {content}
    </Pressable>
  );
}

/** Section heading: a short tide mark, then small capitals. */
export function SectionTitle({ children, right, color }: { children: string; right?: React.ReactNode; color?: string }) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 10, minHeight: 28 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
        <View style={{ width: 14, height: 2, borderRadius: 1, backgroundColor: color ?? c.teal }} />
        <T variant="label" color={color ?? c.inkSoft} accessibilityRole="header">
          {children}
        </T>
      </View>
      {right}
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const c = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginLeft: inset }} />;
}

export function Row({ icon, iconColor, title, subtitle, right, onPress, destructive, testID }: { icon?: IconName; iconColor?: string; title: string; subtitle?: string; right?: React.ReactNode; onPress?: PressableProps['onPress']; destructive?: boolean; testID?: string }) {
  const c = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 54, paddingVertical: 9, opacity: pressed ? 0.6 : 1 })}
    >
      {icon ? (
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: (iconColor ?? c.accent) + '1F', alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={icon} size={17} color={destructive ? c.danger : iconColor ?? c.accent} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <T variant="bodyStrong" color={destructive ? c.danger : c.ink}>
          {title}
        </T>
        {subtitle ? (
          <T variant="small" color={c.muted}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {right ?? (onPress ? <Feather name="chevron-right" size={18} color={c.muted} /> : null)}
    </Pressable>
  );
}

export function ToggleRow({ title, subtitle, value, onChange, testID, icon }: { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void; testID?: string; icon?: IconName }) {
  const c = useTheme();
  return (
    <Row
      icon={icon}
      title={title}
      subtitle={subtitle}
      right={<Switch testID={testID} value={value} onValueChange={onChange} trackColor={{ true: c.teal, false: c.line }} thumbColor="#FFFFFF" accessibilityLabel={title} />}
    />
  );
}

/** Standard screen: header with back button, scrollable body. */
export function Screen({ title, subtitle, children, right, back = true, color, testID, scroll = true, accentBar }: { title: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode; back?: boolean; color?: string; testID?: string; scroll?: boolean; accentBar?: boolean }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const header = (
    <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 12, paddingBottom: 6, backgroundColor: c.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44 }}>
        {back ? <IconButton icon="chevron-left" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} testID="back" /> : <View style={{ width: 8 }} />}
        <View style={{ flex: 1 }} />
        {right}
      </View>
      <View style={{ paddingHorizontal: 8, paddingTop: 2 }}>
        {accentBar ? <View style={{ width: 28, height: 4, borderRadius: 2, backgroundColor: color ?? c.teal, marginBottom: 8 }} /> : null}
        <T variant="display" accessibilityRole="header">
          {title}
        </T>
        {subtitle ? (
          <T variant="small" color={c.muted} style={{ marginTop: 2 }}>
            {subtitle}
          </T>
        ) : null}
      </View>
    </View>
  );
  // Screens without a back button sit above the floating dock.
  const body = { paddingHorizontal: 20, paddingBottom: insets.bottom + (back ? 48 : 124), paddingTop: 8, maxWidth: 720, width: '100%' as const, alignSelf: 'center' as const };
  return (
    <View testID={testID} style={{ flex: 1, backgroundColor: c.bg }}>
      {header}
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={body}>
          {children}
        </ScrollView>
      ) : (
        <View style={[body, { flex: 1 }]}>{children}</View>
      )}
    </View>
  );
}

export function Field({ label, style, ...rest }: TextInputProps & { label?: string }) {
  const c = useTheme();
  return (
    <View style={{ marginTop: 10 }}>
      {label ? (
        <T variant="caption" color={c.inkSoft} style={{ marginBottom: 6 }}>
          {label}
        </T>
      ) : null}
      <TextInput
        placeholderTextColor={c.muted}
        {...rest}
        style={[{ minHeight: rest.multiline ? 84 : 48, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, paddingHorizontal: 14, paddingVertical: 12, color: c.ink, fontFamily: FONTS.body, fontSize: 16, textAlignVertical: rest.multiline ? 'top' : 'center' }, style]}
      />
    </View>
  );
}

/** 1–5 (or any range) tap scale. */
export function Scale({ label, value, onChange, min = 1, max = 5, low, high, color, testID }: { label: string; value: number | null; onChange: (v: number) => void; min?: number; max?: number; low?: string; high?: string; color?: string; testID?: string }) {
  const c = useTheme();
  const vals = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <View style={{ marginTop: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T variant="bodyStrong">{label}</T>
        {value !== null ? (
          <T variant="caption" color={color ?? c.accent}>
            {value} of {max}
          </T>
        ) : null}
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
        {vals.map((v) => {
          const on = value === v;
          return (
            <Pressable
              key={v}
              testID={testID ? `${testID}-${v}` : undefined}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${label} ${v}`}
              onPress={() => onChange(v)}
              style={{ flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? color ?? c.accent : c.surface2 }}
            >
              <Text style={{ fontFamily: FONTS.semibold, fontSize: 15, color: on ? '#FFFFFF' : c.inkSoft }}>{v}</Text>
            </Pressable>
          );
        })}
      </View>
      {low || high ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <T variant="caption">{low}</T>
          <T variant="caption">{high}</T>
        </View>
      ) : null}
    </View>
  );
}

export function Stepper({ label, value, onChange, step = 1, min = 0, max = 9999, unit, testID, display }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; unit?: string; testID?: string; display?: string }) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, marginTop: 6 }}>
      <T variant="bodyStrong" style={{ flex: 1 }}>
        {label}
      </T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <IconButton icon="minus" label={`Less ${label}`} filled onPress={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))} testID={testID ? `${testID}-minus` : undefined} />
        <T variant="heading" style={{ minWidth: 84, textAlign: 'center' }} testID={testID ? `${testID}-value` : undefined}>
          {display ?? `${value}${unit ? ` ${unit}` : ''}`}
        </T>
        <IconButton icon="plus" label={`More ${label}`} filled onPress={() => onChange(Math.min(max, Math.round((value + step) * 100) / 100))} testID={testID ? `${testID}-plus` : undefined} />
      </View>
    </View>
  );
  void c;
}

export function Segmented<K extends string>({ options, value, onChange, testID }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void; testID?: string }) {
  const c = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: c.surface2, borderRadius: 999, padding: 4, marginTop: 8 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            testID={testID ? `${testID}-${o.key}` : undefined}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={{ flex: 1, minHeight: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.surface : 'transparent' }}
          >
            <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: on ? FONTS.semibold : FONTS.medium, fontSize: 14, color: on ? c.ink : c.muted }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stat({ label, value, unit, sub, color }: { label: string; value: string; unit?: string; sub?: string; color?: string }) {
  const c = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 96 }}>
      <T variant="caption">{label}</T>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 2 }}>
        <T variant="stat" color={color ?? c.ink}>
          {value}
        </T>
        {unit ? (
          <T variant="small" color={c.muted}>
            {unit}
          </T>
        ) : null}
      </View>
      {sub ? (
        <T variant="caption" color={c.muted}>
          {sub}
        </T>
      ) : null}
    </View>
  );
}

export function Empty({ icon, title, text, action }: { icon: IconName; title: string; text: string; action?: React.ReactNode }) {
  const c = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 26, paddingHorizontal: 12 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={icon} size={24} color={c.accent} />
      </View>
      <T variant="heading" style={{ marginTop: 12, textAlign: 'center' }}>
        {title}
      </T>
      <T variant="small" color={c.muted} style={{ marginTop: 4, textAlign: 'center', maxWidth: 320 }}>
        {text}
      </T>
      {action ? <View style={{ marginTop: 14 }}>{action}</View> : null}
    </View>
  );
}

export function Note({ text, tone = 'info', icon }: { text: string; tone?: 'info' | 'warn' | 'ok' | 'danger'; icon?: IconName }) {
  const c = useTheme();
  const bg = { info: c.accentSoft, warn: c.warnSoft, ok: c.okSoft, danger: c.dangerSoft }[tone];
  const fg = { info: c.accent, warn: c.warn, ok: c.ok, danger: c.danger }[tone];
  return (
    <View style={{ flexDirection: 'row', gap: 10, backgroundColor: bg, borderRadius: 14, padding: 12, marginTop: 12 }}>
      <Feather name={icon ?? (tone === 'warn' || tone === 'danger' ? 'alert-circle' : 'info')} size={16} color={fg} style={{ marginTop: 2 }} />
      <T variant="small" color={c.dark ? c.ink : c.inkSoft} style={{ flex: 1 }}>
        {text}
      </T>
    </View>
  );
}

export function Badge({ text, color }: { text: string; color?: string }) {
  const c = useTheme();
  return (
    <View style={{ backgroundColor: (color ?? c.accent) + '22', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <T variant="caption" color={color ?? c.accent} style={{ fontFamily: FONTS.semibold }}>
        {text}
      </T>
    </View>
  );
}

export function Progress({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const c = useTheme();
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: c.surface2, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value * 100))}%`, height, backgroundColor: color ?? c.teal, borderRadius: height / 2 }} />
    </View>
  );
}

export const DISCLAIMER = 'General information for education, not medical advice. Talk with your clinician about your own health.';
