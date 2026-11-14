// Gradient panel in the Coressence blues, with an optional faint wave in the corner.
import React, { useId } from 'react';
import { Image, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export function Hero({ children, style, colors = ['#0B2A3C', '#0E5470'], testID }: { children: React.ReactNode; style?: ViewStyle; colors?: [string, string]; testID?: string }) {
  // Each panel needs its own gradient id: on the web a gradient defined inside a hidden screen does not paint.
  const gid = 'hero' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <View testID={testID} style={[{ borderRadius: 24, overflow: 'hidden' }, style]}>
      <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors[0]} />
            <Stop offset="1" stopColor={colors[1]} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gid})`} />
      </Svg>
      <Image source={require('../../assets/brand/wave-white.png')} style={{ position: 'absolute', right: -30, bottom: -26, width: 170, height: 145, opacity: 0.07 }} resizeMode="contain" />
      <View style={{ padding: 18 }}>{children}</View>
    </View>
  );
}
