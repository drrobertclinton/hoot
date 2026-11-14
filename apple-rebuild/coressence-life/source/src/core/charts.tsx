// Lightweight SVG charts: the tide gauge, bars, lines and the sleep-sound timeline.
import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { FONTS, useTheme } from './theme';
import { T } from './ui';

function useWidth(initial = 320): [number, (e: { nativeEvent: { layout: { width: number } } }) => void] {
  const [w, setW] = useState(initial);
  return [w, (e) => setW(Math.max(120, Math.round(e.nativeEvent.layout.width)))];
}

/**
 * Tide gauge: a square vessel whose water level is the value (0..1, null = no data). The wave on top is the
 * Coressence mark; `stroke` is the wall thickness.
 */
export function Tide({ value, color, size = 64, stroke = 8, label, center }: { value: number | null; color: string; size?: number; stroke?: number; label?: string; center?: React.ReactNode }) {
  const c = useTheme();
  const v = value === null ? 0 : Math.max(0, Math.min(1, value));
  const wall = Math.max(2, Math.round(stroke / 4));
  const inner = size - wall * 2;
  const level = inner * (1 - v);
  const amp = v > 0 && v < 1 ? Math.min(4, inner * 0.035) : 0;
  const q = inner / 4;
  const wave = `M0 ${level} Q ${q / 2} ${level - amp} ${q} ${level} T ${q * 2} ${level} T ${q * 3} ${level} T ${inner} ${level} V ${inner} H 0 Z`;
  return (
    <View
      accessible
      accessibilityLabel={label ? `${label}: ${value === null ? 'no data' : Math.round(v * 100) + ' percent'}` : undefined}
      style={{ width: size, height: size, borderRadius: size * 0.26, borderWidth: wall, borderColor: color + (c.dark ? '55' : '40'), backgroundColor: color + (c.dark ? '14' : '0D'), overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
    >
      {v > 0 ? (
        <Svg width={inner} height={inner} style={{ position: 'absolute', top: 0, left: 0 }}>
          <Path d={wave} fill={color + (c.dark ? '66' : '4D')} />
          <Path d={`M0 ${level} Q ${q / 2} ${level - amp} ${q} ${level} T ${q * 2} ${level} T ${q * 3} ${level} T ${inner} ${level}`} stroke={color} strokeWidth={2} fill="none" />
        </Svg>
      ) : null}
      {center}
    </View>
  );
}

export type BarDatum = { label: string; value: number | null; color?: string };

export function Bars({ data, color, goal, height = 140, unit = '', valueLabels = false, testID, max: maxIn }: { data: BarDatum[]; color: string; goal?: number; height?: number; unit?: string; valueLabels?: boolean; testID?: string; max?: number }) {
  const c = useTheme();
  const [w, onLayout] = useWidth();
  const top = valueLabels ? 16 : 6;
  const bottom = 20;
  const h = height - top - bottom;
  const max = maxIn ?? Math.max(1, goal ?? 0, ...data.map((d) => d.value ?? 0)) * 1.08;
  const slot = w / Math.max(1, data.length);
  const bw = Math.max(3, Math.min(26, slot * 0.6));
  const labelEvery = Math.ceil(data.length / 10);
  return (
    <View testID={testID} onLayout={onLayout} style={{ width: '100%', height }}>
      <Svg width={w} height={height}>
        {data.map((d, i) => {
          const v = d.value ?? 0;
          const bh = (v / max) * h;
          const x = i * slot + (slot - bw) / 2;
          return (
            <G key={i}>
              <Rect x={x} y={top} width={bw} height={h} rx={bw / 2.5} fill={c.surface2} />
              {v > 0 ? <Rect x={x} y={top + h - bh} width={bw} height={Math.max(bh, 2)} rx={bw / 2.5} fill={d.color ?? color} /> : null}
              {valueLabels && d.value ? (
                <SvgText x={x + bw / 2} y={top + h - bh - 4} fontSize={10} fill={c.muted} textAnchor="middle" fontFamily={FONTS.medium}>
                  {Math.round(v)}
                </SvgText>
              ) : null}
              {i % labelEvery === 0 ? (
                <SvgText x={x + bw / 2} y={height - 5} fontSize={10.5} fill={c.muted} textAnchor="middle" fontFamily={FONTS.medium}>
                  {d.label}
                </SvgText>
              ) : null}
            </G>
          );
        })}
        {goal ? (
          <G>
            <Line x1={0} x2={w} y1={top + h - (goal / max) * h} y2={top + h - (goal / max) * h} stroke={c.inkSoft} strokeDasharray="4 4" strokeWidth={1} opacity={0.6} />
            <SvgText x={w - 2} y={top + h - (goal / max) * h - 4} fontSize={10} fill={c.inkSoft} textAnchor="end" fontFamily={FONTS.medium}>
              {`Goal ${goal}${unit}`}
            </SvgText>
          </G>
        ) : null}
      </Svg>
    </View>
  );
}

export function LineChart({ data, color, height = 150, band, unit = '', decimals = 0, testID, minY, maxY }: { data: { label: string; value: number | null }[]; color: string; height?: number; band?: [number, number]; unit?: string; decimals?: number; testID?: string; minY?: number; maxY?: number }) {
  const c = useTheme();
  const [w, onLayout] = useWidth();
  const vals = data.map((d) => d.value).filter((v): v is number => v !== null);
  const pad = { l: 34, r: 10, t: 12, b: 22 };
  if (!vals.length)
    return (
      <View testID={testID} style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <T variant="small" color={c.muted}>
          No entries in this period yet
        </T>
      </View>
    );
  let lo = minY ?? Math.min(...vals, ...(band ? [band[0]] : []));
  let hi = maxY ?? Math.max(...vals, ...(band ? [band[1]] : []));
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const span = hi - lo;
  lo -= span * 0.12;
  hi += span * 0.12;
  const iw = w - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const x = (i: number) => pad.l + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - ((v - lo) / (hi - lo)) * ih;
  let d = '';
  let pen = false;
  data.forEach((p, i) => {
    if (p.value === null) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)} `;
    pen = true;
  });
  const ticks = [lo + (hi - lo) * 0.15, (lo + hi) / 2, hi - (hi - lo) * 0.15];
  const labelEvery = Math.ceil(data.length / 7);
  const fmt = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(decimals));
  return (
    <View testID={testID} onLayout={onLayout} style={{ width: '100%', height }}>
      <Svg width={w} height={height}>
        {band ? <Rect x={pad.l} width={iw} y={y(band[1])} height={Math.max(1, y(band[0]) - y(band[1]))} fill={color + '1C'} /> : null}
        {ticks.map((t, i) => (
          <G key={i}>
            <Line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke={c.line} strokeWidth={1} />
            <SvgText x={pad.l - 6} y={y(t) + 3.5} fontSize={10} fill={c.muted} textAnchor="end" fontFamily={FONTS.medium}>
              {fmt(t)}
            </SvgText>
          </G>
        ))}
        <Path d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((p, i) =>
          p.value === null ? null : <Circle key={i} cx={x(i)} cy={y(p.value)} r={data.length > 40 ? 0 : i === data.length - 1 ? 4.5 : 2.8} fill={i === data.length - 1 ? color : c.surface} stroke={color} strokeWidth={1.6} />,
        )}
        {data.map((p, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <SvgText key={'l' + i} x={x(i)} y={height - 5} fontSize={10} fill={c.muted} textAnchor={i === data.length - 1 && data.length > 1 ? 'end' : i === 0 && data.length > 1 ? 'start' : 'middle'} fontFamily={FONTS.medium}>
              {p.label}
            </SvgText>
          ) : null,
        )}
      </Svg>
      {unit ? null : null}
    </View>
  );
}

/** Night timeline: loudness buckets with events highlighted. */
export function NightTimeline({ buckets, events, start, end, height = 120, color, eventColor, hourLabel }: { buckets: { t: number; max: number }[]; events: { start: number; end: number; kind: string }[]; start: number; end: number; height?: number; color: string; eventColor: (kind: string) => string; hourLabel: (ts: number) => string }) {
  const c = useTheme();
  const [w, onLayout] = useWidth();
  const pad = { t: 8, b: 20 };
  const ih = height - pad.t - pad.b;
  const span = Math.max(1, end - start);
  const x = (ts: number) => ((ts - start) / span) * w;
  const lo = -70;
  const hi = -10;
  const yh = (db: number) => Math.max(1.5, ((Math.min(hi, Math.max(lo, db)) - lo) / (hi - lo)) * ih);
  const bw = Math.max(1, w / Math.max(1, buckets.length) - 0.5);
  const hours: number[] = [];
  const first = new Date(start);
  first.setMinutes(0, 0, 0);
  for (let t = first.getTime() + 3600_000; t < end; t += 3600_000) hours.push(t);
  const every = Math.ceil(hours.length / 6);
  return (
    <View onLayout={onLayout} style={{ width: '100%', height }}>
      <Svg width={w} height={height}>
        {events.map((e, i) => (
          <Rect key={'e' + i} x={x(e.start)} y={pad.t} width={Math.max(2, x(e.end) - x(e.start))} height={ih} fill={eventColor(e.kind) + '30'} />
        ))}
        {buckets.map((b, i) => {
          const hgt = yh(b.max);
          const inEvent = events.find((e) => b.t >= e.start - 1000 && b.t <= e.end + 1000);
          return <Rect key={i} x={x(b.t)} y={pad.t + ih - hgt} width={bw} height={hgt} fill={inEvent ? eventColor(inEvent.kind) : color} opacity={inEvent ? 1 : 0.55} />;
        })}
        {hours.map((t, i) =>
          i % every === 0 ? (
            <G key={t}>
              <Line x1={x(t)} x2={x(t)} y1={pad.t} y2={pad.t + ih} stroke={c.line} strokeWidth={1} />
              <SvgText x={x(t)} y={height - 5} fontSize={10} fill={c.muted} textAnchor="middle" fontFamily={FONTS.medium}>
                {hourLabel(t)}
              </SvgText>
            </G>
          ) : null,
        )}
      </Svg>
    </View>
  );
}

/** Small sparkline for tiles. */
export function Spark({ values, color, width = 90, height = 30 }: { values: (number | null)[]; color: string; width?: number; height?: number }) {
  const v = values.filter((x): x is number => x !== null);
  if (v.length < 2) return <View style={{ width, height }} />;
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const span = hi - lo || 1;
  let d = '';
  let pen = false;
  values.forEach((p, i) => {
    if (p === null) return void (pen = false);
    const px = (i / (values.length - 1)) * (width - 4) + 2;
    const py = height - 3 - ((p - lo) / span) * (height - 6);
    d += `${pen ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)} `;
    pen = true;
  });
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Stacked bars (sleep stages per night, zone minutes per day). Each datum lists its segments bottom to top. */
export function StackedBars({ data, height = 150, testID, max: maxIn, unit = '' }: { data: { label: string; parts: { value: number; color: string }[] }[]; height?: number; testID?: string; max?: number; unit?: string }) {
  const c = useTheme();
  const [w, onLayout] = useWidth();
  const top = 8;
  const bottom = 20;
  const h = height - top - bottom;
  const totals = data.map((d) => d.parts.reduce((a, p) => a + p.value, 0));
  const max = maxIn ?? Math.max(1, ...totals) * 1.08;
  const slot = w / Math.max(1, data.length);
  const bw = Math.max(4, Math.min(26, slot * 0.6));
  const labelEvery = Math.ceil(data.length / 10);
  return (
    <View testID={testID} onLayout={onLayout} style={{ width: '100%', height }}>
      <Svg width={w} height={height}>
        {data.map((d, i) => {
          const x = i * slot + (slot - bw) / 2;
          let y = top + h;
          return (
            <G key={i}>
              <Rect x={x} y={top} width={bw} height={h} rx={4} fill={c.surface2} />
              {d.parts.map((p, k) => {
                const ph = (p.value / max) * h;
                y -= ph;
                return ph > 0 ? <Rect key={k} x={x} y={y} width={bw} height={ph} fill={p.color} rx={k === d.parts.length - 1 ? 3 : 0} /> : null;
              })}
              {i % labelEvery === 0 ? (
                <SvgText x={x + bw / 2} y={height - 5} fontSize={10.5} fill={c.muted} textAnchor="middle" fontFamily={FONTS.medium}>
                  {d.label}
                </SvgText>
              ) : null}
            </G>
          );
        })}
        <SvgText x={w - 2} y={top + 8} fontSize={10} fill={c.muted} textAnchor="end" fontFamily={FONTS.medium}>
          {`${Math.round(max)}${unit}`}
        </SvgText>
      </Svg>
    </View>
  );
}

/** Hypnogram: one night's sleep stages over time (awake at the top, deep at the bottom). */
export function Hypnogram({ segments, start, end, colors, height = 130, hourLabel, testID }: { segments: { s: number; e: number; stage: 'awake' | 'rem' | 'core' | 'deep' }[]; start: number; end: number; colors: Record<'awake' | 'rem' | 'core' | 'deep', string>; height?: number; hourLabel: (ts: number) => string; testID?: string }) {
  const c = useTheme();
  const [w, onLayout] = useWidth();
  const pad = { l: 46, t: 6, b: 20 };
  const rows: ('awake' | 'rem' | 'core' | 'deep')[] = ['awake', 'rem', 'core', 'deep'];
  const names = { awake: 'Awake', rem: 'REM', core: 'Light', deep: 'Deep' };
  const rh = (height - pad.t - pad.b) / rows.length;
  const iw = w - pad.l;
  const x = (t: number) => pad.l + ((t - start) / Math.max(1, end - start)) * iw;
  const hours: number[] = [];
  const first = new Date(start);
  first.setMinutes(0, 0, 0);
  for (let t = first.getTime() + 3600_000; t < end; t += 3600_000) hours.push(t);
  const every = Math.ceil(hours.length / 5);
  return (
    <View testID={testID} onLayout={onLayout} style={{ width: '100%', height }}>
      <Svg width={w} height={height}>
        {rows.map((r, i) => (
          <G key={r}>
            <Line x1={pad.l} x2={w} y1={pad.t + rh * (i + 0.5)} y2={pad.t + rh * (i + 0.5)} stroke={c.line} strokeWidth={1} />
            <SvgText x={0} y={pad.t + rh * (i + 0.5) + 3.5} fontSize={10.5} fill={c.muted} fontFamily={FONTS.medium}>
              {names[r]}
            </SvgText>
          </G>
        ))}
        {segments.map((sg, i) => {
          const row = rows.indexOf(sg.stage);
          return <Rect key={i} x={x(sg.s)} y={pad.t + rh * row + rh * 0.18} width={Math.max(1.5, x(sg.e) - x(sg.s))} height={rh * 0.64} rx={2} fill={colors[sg.stage]} />;
        })}
        {hours.map((t, i) =>
          i % every === 0 ? (
            <SvgText key={t} x={x(t)} y={height - 5} fontSize={10} fill={c.muted} textAnchor="middle" fontFamily={FONTS.medium}>
              {hourLabel(t)}
            </SvgText>
          ) : null,
        )}
      </Svg>
    </View>
  );
}

/** Several lines on one set of axes (blood pressure top and bottom numbers), with an optional target line per series. */
export function MultiLine({ labels, series, height = 160, testID, decimals = 0 }: { labels: string[]; series: { values: (number | null)[]; color: string; target?: number }[]; height?: number; testID?: string; decimals?: number }) {
  const c = useTheme();
  const [w, onLayout] = useWidth();
  const pad = { l: 34, r: 10, t: 12, b: 22 };
  const all = series.flatMap((s) => [...s.values.filter((v): v is number => v !== null), ...(s.target ? [s.target] : [])]);
  if (!all.length)
    return (
      <View testID={testID} style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <T variant="small" color={c.muted}>
          No readings in this period yet
        </T>
      </View>
    );
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  const span = hi - lo || 2;
  lo -= span * 0.12;
  hi += span * 0.12;
  const iw = w - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const x = (i: number) => pad.l + (labels.length <= 1 ? iw / 2 : (i / (labels.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - ((v - lo) / (hi - lo)) * ih;
  const ticks = [lo + (hi - lo) * 0.15, (lo + hi) / 2, hi - (hi - lo) * 0.15];
  const labelEvery = Math.ceil(labels.length / 7);
  return (
    <View testID={testID} onLayout={onLayout} style={{ width: '100%', height }}>
      <Svg width={w} height={height}>
        {ticks.map((t, i) => (
          <G key={i}>
            <Line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke={c.line} strokeWidth={1} />
            <SvgText x={pad.l - 6} y={y(t) + 3.5} fontSize={10} fill={c.muted} textAnchor="end" fontFamily={FONTS.medium}>
              {t.toFixed(decimals)}
            </SvgText>
          </G>
        ))}
        {series.map((s, k) => {
          let d = '';
          let pen = false;
          s.values.forEach((v, i) => {
            if (v === null) return void (pen = false);
            d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
            pen = true;
          });
          return (
            <G key={k}>
              {s.target ? <Line x1={pad.l} x2={w - pad.r} y1={y(s.target)} y2={y(s.target)} stroke={s.color} strokeDasharray="4 4" strokeWidth={1.2} opacity={0.7} /> : null}
              <Path d={d} stroke={s.color} strokeWidth={2.4} fill="none" strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) => (v === null || labels.length > 40 ? null : <Circle key={i} cx={x(i)} cy={y(v)} r={2.6} fill={c.surface} stroke={s.color} strokeWidth={1.5} />))}
            </G>
          );
        })}
        {labels.map((l, i) =>
          (i % labelEvery === 0 && labels.length - 1 - i >= labelEvery / 2) || i === labels.length - 1 ? (
            <SvgText key={'l' + i} x={x(i)} y={height - 5} fontSize={10} fill={c.muted} textAnchor={i === labels.length - 1 && labels.length > 1 ? 'end' : i === 0 && labels.length > 1 ? 'start' : 'middle'} fontFamily={FONTS.medium}>
              {l}
            </SvgText>
          ) : null,
        )}
      </Svg>
    </View>
  );
}
