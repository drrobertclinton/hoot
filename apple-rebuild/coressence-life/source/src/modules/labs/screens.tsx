// Labs: results you enter, trends over time, and plain-language reference notes.
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { STOREFRONTS_LIVE } from '@core/appConfig';
import { Pressable, View } from 'react-native';
import { LineChart } from '@core/charts';
import { dayKey, shortDate } from '@core/dates';
import { moduleColor, useTheme } from '@core/theme';
import { Badge, Button, Card, Chip, Empty, Field, Note, Screen, SectionTitle, T } from '@core/ui';
import { LAB_TESTS, labTest } from './catalog';
import { latestByTest, rangeStatus, rangeWords, resultsFor } from './model';
import { addResult, deleteResult, useLabs } from './state';

const DISCLAIMER = 'Reference notes are general education. Ranges differ between labs; use the range printed on your own report. Only your clinician can interpret your results. Coressence does not diagnose conditions.';

export function LabsScreen() {
  const c = useTheme();
  const s = useLabs();
  const color = moduleColor(c, 'labs');
  const [adding, setAdding] = useState(false);
  const [testId, setTestId] = useState(LAB_TESTS[0].id);
  const [date, setDate] = useState(dayKey());
  const [value, setValue] = useState('');
  const [low, setLow] = useState('');
  const [high, setHigh] = useState('');
  const [err, setErr] = useState('');
  const latest = latestByTest(s);
  const groups = [...new Set(LAB_TESTS.map((t) => t.group))];
  const have = LAB_TESTS.filter((t) => latest[t.id]);
  const num = (x: string) => (x.trim() === '' ? undefined : Number(x));

  return (
    <Screen title="Labs" subtitle="Your results, trends and plain-language notes" color={color} accentBar testID="labs">
      {!adding ? <Button label="Add a result" icon="plus" compact onPress={() => setAdding(true)} style={{ alignSelf: 'flex-start' }} testID="lab-add" color={color} /> : null}
      {adding ? (
        <Card testID="lab-form">
          <T variant="caption">Test</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {LAB_TESTS.map((t) => (
              <Chip key={t.id} small label={t.short} selected={testId === t.id} onPress={() => setTestId(t.id)} color={color} testID={`lab-test-${t.id}`} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label={`Result (${labTest(testId)!.unit})`} value={value} onChangeText={setValue} keyboardType="decimal-pad" testID="lab-value" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
            </View>
          </View>
          <T variant="caption" style={{ marginTop: 10 }}>
            Range printed on your report (optional)
          </T>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field placeholder="Low" value={low} onChangeText={setLow} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field placeholder="High" value={high} onChangeText={setHigh} keyboardType="decimal-pad" />
            </View>
          </View>
          {err ? (
            <T variant="small" color={c.danger} style={{ marginTop: 8 }}>
              {err}
            </T>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Button
              label="Save"
              icon="check"
              compact
              testID="lab-save"
              onPress={() => {
                const v = Number(value);
                if (!value.trim() || !Number.isFinite(v)) return setErr('Enter the number from your report.');
                if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setErr('Use the date format YYYY-MM-DD.');
                addResult({ testId, date, value: v, low: num(low), high: num(high) });
                setAdding(false);
                setValue('');
                setLow('');
                setHigh('');
                setErr('');
              }}
            />
            <Button label="Cancel" kind="ghost" compact onPress={() => setAdding(false)} />
          </View>
        </Card>
      ) : null}

      {have.length ? (
        groups.map((g) => {
          const tests = have.filter((t) => t.group === g);
          if (!tests.length) return null;
          return (
            <View key={g}>
              <SectionTitle>{g}</SectionTitle>
              <Card padded={false}>
                {tests.map((t, i) => {
                  const r = latest[t.id];
                  const st = rangeStatus(r);
                  const n = resultsFor(s, t.id).length;
                  return (
                    <Pressable key={t.id} onPress={() => router.push(`/labs/${t.id}`)} testID={`lab-row-${t.id}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                      <View style={{ flex: 1 }}>
                        <T variant="bodyStrong">{t.name}</T>
                        <T variant="caption">
                          {shortDate(r.date)} · {n} result{n === 1 ? '' : 's'}
                        </T>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <T variant="heading">
                          {r.value} <T variant="caption">{t.unit}</T>
                        </T>
                        {st !== 'none' ? <Badge text={st === 'within' ? 'In report range' : st === 'above' ? 'Above report range' : 'Below report range'} color={st === 'within' ? c.ok : c.warn} /> : null}
                      </View>
                      <Feather name="chevron-right" size={18} color={c.muted} />
                    </Pressable>
                  );
                })}
              </Card>
            </View>
          );
        })
      ) : !adding ? (
        <Card style={{ marginTop: 14 }}>
          <Empty icon="droplet" title="No results yet" text="Add results from your lab reports to see them over time, with a short note on what each test measures." />
        </Card>
      ) : null}

      {STOREFRONTS_LIVE ? (
        <>
          <SectionTitle>Lab panels</SectionTitle>
          <Card>
            <T variant="heading">Order a panel</T>
            <T variant="small" color={c.inkSoft} style={{ marginTop: 4 }}>
              Coming soon: lab panels ordered through a partner lab and reviewed by a licensed clinician. Panels are a separate service, billed outside the app.
            </T>
          </Card>
        </>
      ) : null}
      <Note text={DISCLAIMER} />
    </Screen>
  );
}

export function LabTestScreen() {
  const c = useTheme();
  const s = useLabs();
  const { test } = useLocalSearchParams<{ test: string }>();
  const t = labTest(String(test));
  const color = moduleColor(c, 'labs');
  if (!t)
    return (
      <Screen title="Lab test">
        <T>Unknown test.</T>
      </Screen>
    );
  const rs = resultsFor(s, t.id);
  const last = rs[rs.length - 1];
  const vals = rs.map((r) => r.value);
  const band: [number, number] | undefined =
    last && (last.low !== undefined || last.high !== undefined)
      ? [last.low ?? Math.min(...vals, last.high ?? Infinity) * 0.85, last.high ?? Math.max(...vals, last.low ?? -Infinity) * 1.15]
      : undefined;
  return (
    <Screen title={t.name} subtitle={`${t.group} · ${t.unit}`} color={color} accentBar testID="lab-test">
      <Card>
        {rs.length ? <LineChart data={rs.map((r) => ({ label: shortDate(r.date), value: r.value }))} color={color} band={band} decimals={t.unit === '%' || t.unit === 'mIU/L' ? 1 : 0} testID="lab-chart" /> : <T variant="small">No results yet.</T>}
        {band ? <T variant="caption">Shaded band: the range on your most recent report{last && last.low === undefined ? ' (upper limit only)' : last && last.high === undefined ? ' (lower limit only)' : ''}.</T> : null}
        {last ? (
          <T variant="small" color={c.inkSoft} style={{ marginTop: 8 }}>
            Latest: {last.value} {t.unit} on {shortDate(last.date)}. {rangeWords(last)}
          </T>
        ) : null}
      </Card>
      <SectionTitle>What it measures</SectionTitle>
      <Card>
        <T variant="body">{t.about}</T>
        <T variant="small" color={c.inkSoft} style={{ marginTop: 10 }}>
          {t.notes}
        </T>
      </Card>
      <SectionTitle>Results</SectionTitle>
      <Card padded={false}>
        {[...rs].reverse().map((r, i) => (
          <Pressable key={r.id} onLongPress={() => deleteResult(r.id)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
            <T variant="body" style={{ flex: 1 }}>
              {shortDate(r.date)} {r.date.slice(0, 4)}
            </T>
            <T variant="caption" style={{ marginRight: 12 }}>
              {r.low !== undefined && r.high !== undefined ? `range ${r.low}–${r.high}` : r.high !== undefined ? `range up to ${r.high}` : r.low !== undefined ? `range from ${r.low}` : ''}
            </T>
            <T variant="heading">{r.value}</T>
          </Pressable>
        ))}
      </Card>
      <T variant="caption" style={{ marginTop: 6 }}>
        Long-press a result to delete it.
      </T>
      <Note text={DISCLAIMER} />
    </Screen>
  );
}
