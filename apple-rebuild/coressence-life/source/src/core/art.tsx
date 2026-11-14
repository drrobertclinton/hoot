// Coressence illustration and motion, 1.2: tide lines (layered waves drawn in SVG), the loop map of the Peak
// Cycle, and two small motions used across the app: content rises into place, and the current step breathes.
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useId, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { FONTS, RADIUS, useTheme } from './theme';
import { T, type IconName } from './ui';

const NATIVE = Platform.OS !== 'web';

/** Content rises 14 points and fades in; `i` staggers siblings. */
export function Rise({ i = 0, children, style }: { i?: number; children: React.ReactNode; style?: ViewStyle }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 420, delay: 60 + i * 70, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE }).start();
  }, [v, i]);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>{children}</Animated.View>;
}

/** A slow breathing halo behind the current step. */
export function Breath({ size, color }: { size: number; color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
        Animated.timing(v, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.34, 0.1] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }] }}
    />
  );
}

const wavePath = (w: number, y: number, amp: number, len: number, phase = 0) => {
  let d = `M ${-len + phase} ${y}`;
  for (let x = -len + phase; x < w + len; x += len) d += ` q ${len / 4} ${-amp} ${len / 2} 0 t ${len / 2} 0`;
  return d;
};

/** Tide lines: thin layered waves, the house illustration. Fills its parent. */
export function TideLines({ color, lines = 4, opacity = 0.16, top = 0.45 }: { color: string; lines?: number; opacity?: number; top?: number }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  return (
    <View pointerEvents="none" onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {box.w ? (
        <Svg width={box.w} height={box.h}>
          {Array.from({ length: lines }, (_, i) => (
            <Path key={i} d={wavePath(box.w, box.h * top + i * ((box.h * (1 - top)) / lines), 7 + i * 2, 120 + i * 34, i * 37)} stroke={color} strokeOpacity={opacity * (1 - i / (lines + 2))} strokeWidth={1.4} fill="none" />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

/** Deep-water panel: the hero behind the loop and the signature screens. */
export function Deep({ children, style, testID, padded = true }: { children: React.ReactNode; style?: ViewStyle; testID?: string; padded?: boolean }) {
  const c = useTheme();
  const gid = 'deep' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <View testID={testID} style={[{ borderRadius: RADIUS.hero, overflow: 'hidden', backgroundColor: c.deep }, style]}>
      <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0.9" y2="1">
            <Stop offset="0" stopColor={c.deep} />
            <Stop offset="0.6" stopColor={c.dark ? '#0A3347' : '#0B4560'} />
            <Stop offset="1" stopColor={c.dark ? '#0C5257' : '#0F6E72'} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gid})`} />
      </Svg>
      <TideLines color="#FFFFFF" />
      <View style={padded ? { padding: 18 } : undefined}>{children}</View>
    </View>
  );
}

export type LoopStation = { key: string; label: string; icon: IconName };

/**
 * The loop map: the six steps as stations on one closed track, like a line on a transit map. Steps already passed
 * this cycle are lit, the current one is large and breathing, and the inside of the loop holds whatever the screen
 * puts there. Tap a station to read that step.
 */
export function LoopMap({ stations, current, selected, onSelect, height = 244, children }: { stations: LoopStation[]; current: number; selected: number; onSelect: (i: number) => void; height?: number; children?: React.ReactNode }) {
  const c = useTheme();
  const [w, setW] = useState(0);
  const labelH = 26;
  const r = (height - (labelH + 22) * 2) / 2;
  const cy = height / 2;
  const x1 = r + 14;
  const x3 = Math.max(x1 + 40, w - r - 14);
  const x2 = (x1 + x3) / 2;
  const top = cy - r;
  const bot = cy + r;
  const straight = x3 - x1;
  const arc = Math.PI * r;
  const total = straight * 2 + arc * 2;
  const pos = [
    { x: x1, y: top, at: 0 },
    { x: x2, y: top, at: straight / 2 },
    { x: x3, y: top, at: straight },
    { x: x3, y: bot, at: straight + arc },
    { x: x2, y: bot, at: straight + arc + straight / 2 },
    { x: x1, y: bot, at: straight * 2 + arc },
  ];
  const track = `M ${x1} ${top} H ${x3} A ${r} ${r} 0 0 1 ${x3} ${bot} H ${x1} A ${r} ${r} 0 0 1 ${x1} ${top} Z`;
  const gid = 'loop' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const lit = pos[current]?.at ?? 0;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
      {w ? (
        <>
          <Svg width={w} height={height} style={{ position: 'absolute' }}>
            <Defs>
              <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#3BC4BD" />
                <Stop offset="1" stopColor={c.foam} />
              </LinearGradient>
            </Defs>
            <Path d={track} stroke="#FFFFFF" strokeOpacity={0.16} strokeWidth={9} fill="none" />
            <Path d={track} stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1.2} strokeDasharray="2 9" fill="none" />
            {lit > 0 ? <Path d={track} stroke={`url(#${gid})`} strokeWidth={9} strokeLinecap="round" strokeDasharray={`${lit} ${total}`} fill="none" /> : null}
            {/* direction of travel */}
            <Path d={`M ${x3 + r - 5} ${cy - 5} l 5 6 l 5 -6`} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d={`M ${x1 - r - 5} ${cy + 5} l 5 -6 l 5 6`} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <View pointerEvents="box-none" style={{ position: 'absolute', left: x1 - r * 0.45, right: w - x3 - r * 0.45, top: top + 10, bottom: height - bot + 10, alignItems: 'center', justifyContent: 'center' }}>
            {children}
          </View>
          {stations.map((s, i) => {
            const p = pos[i];
            const now = i === current;
            const passed = i < current;
            const size = now ? 40 : 28;
            const up = i < 3;
            const label = (
              <T variant="label" color={now || i === selected ? '#FFFFFF' : '#A9C6D2'} style={{ marginVertical: 3, fontSize: 10.5, letterSpacing: 1.3, fontFamily: FONTS.caps }}>
                {s.label}
              </T>
            );
            return (
              <Pressable
                key={s.key}
                testID={`step-${s.key}`}
                accessibilityRole="button"
                accessibilityLabel={`Step ${i + 1}, ${s.label}${now ? ', where you are now' : passed ? ', done this cycle' : ''}`}
                accessibilityState={{ selected: i === selected }}
                onPress={() => onSelect(i)}
                hitSlop={8}
                style={{ position: 'absolute', left: p.x - 44, top: up ? p.y - 20 - labelH : p.y - 20, width: 88, height: 40 + labelH, alignItems: 'center', justifyContent: up ? 'flex-end' : 'flex-start' }}
              >
                {up ? label : null}
                <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                  {now ? <Breath size={40} color={c.foam} /> : null}
                  <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: now ? '#FFFFFF' : passed ? '#3BC4BD' : c.deep, borderWidth: now ? 0 : 2, borderColor: passed ? '#3BC4BD' : i === selected ? '#FFFFFF' : '#5F8799' }}>
                    {passed ? (
                      <Feather name="check" size={14} color={c.deep} />
                    ) : now ? (
                      <Feather name={s.icon} size={18} color={c.deep} />
                    ) : (
                      <T variant="caption" color={i === selected ? '#FFFFFF' : '#A9C6D2'} style={{ fontFamily: FONTS.num, fontSize: 12 }}>
                        {i + 1}
                      </T>
                    )}
                  </View>
                </View>
                {!up ? label : null}
              </Pressable>
            );
          })}
        </>
      ) : null}
    </View>
  );
}

/** A page of the course workbook: warm paper with a ruled margin line. */
export function Paper({ children, style, onPress, testID }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void; testID?: string }) {
  const c = useTheme();
  const base: ViewStyle = { backgroundColor: c.paper, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.paperLine, padding: 16, paddingLeft: 22, overflow: 'hidden' };
  const inner = (
    <>
      <View style={{ position: 'absolute', left: 9, top: 0, bottom: 0, width: 1.5, backgroundColor: c.sand, opacity: 0.45 }} />
      {children}
    </>
  );
  return onPress ? (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [base, style, { opacity: pressed ? 0.85 : 1 }]}>
      {inner}
    </Pressable>
  ) : (
    <View testID={testID} style={[base, style]}>
      {inner}
    </View>
  );
}
