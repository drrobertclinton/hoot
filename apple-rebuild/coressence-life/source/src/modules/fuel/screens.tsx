// Fuel: hydration, meal pattern and optional eating window.
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Bars, Tide } from '@core/charts';
import { RangePicker, type Range } from '@core/gate';
import { clock, clockOf, dayKey, durationWords, fmtHm, lastDays, shortDate, weekdayShort } from '@core/dates';
import { useSettings, setGoals } from '@core/settings';
import { moduleColor, useTheme } from '@core/theme';
import { Button, Card, Chip, Field, Note, Screen, SectionTitle, Stat, T } from '@core/ui';
import { GLASS_ML, MEAL_KINDS, TAGS, activeFast, fastHours, fastSeries, fuelScore, hydrationStreak, waterSeries, type MealKind, type MealTag } from './model';
import { addWater, deleteMeal, endFast, logMeal, startFast, useFuel } from './state';
import { foodLine } from './food';
import { OFF_ATTRIBUTION } from './off';

function guessKind(h: number): MealKind {
  return h < 10.5 ? 'breakfast' : h < 15 ? 'lunch' : h < 17 ? 'snack' : 'dinner';
}

export function FuelScreen() {
  const c = useTheme();
  const s = useFuel();
  const goals = useSettings((x) => x.goals);
  const params = useLocalSearchParams<{ add?: string }>();
  const [adding, setAdding] = useState(params.add === 'meal');
  const [kind, setKind] = useState<MealKind>(guessKind(new Date().getHours()));
  const [tags, setTags] = useState<MealTag[]>([]);
  const [note, setNote] = useState('');
  const [range, setRange] = useState<Range>(7);
  const [, tick] = useState(0);
  const today = dayKey();
  const color = moduleColor(c, 'fuel');
  const water = s.water[today] || 0;
  const meals = s.meals.filter((m) => m.date === today);
  const fast = activeFast(s);
  const score = fuelScore(s, today, goals.waterMl);
  const week = lastDays(7, today);
  const weekMeals = s.meals.filter((m) => week.includes(m.date));
  const pct = (t: MealTag) => (weekMeals.length ? Math.round((weekMeals.filter((m) => m.tags.includes(t)).length / weekMeals.length) * 100) : 0);

  useEffect(() => {
    if (!fast) return;
    const t = setInterval(() => tick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, [fast]);

  return (
    <Screen title="Fuel" subtitle="Food pattern, water and eating window" color={color} accentBar testID="fuel">
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Tide
            value={water / goals.waterMl}
            color={c.pillar.recover}
            size={96}
            stroke={10}
            label="Water"
            center={
              <View style={{ alignItems: 'center' }}>
                <T variant="heading">{(water / 1000).toFixed(water % 1000 ? 2 : 1)}</T>
                <T variant="caption">of {(goals.waterMl / 1000).toFixed(1)} L</T>
              </View>
            }
          />
          <View style={{ flex: 1 }}>
            <T variant="label" color={c.pillar.recover}>
              Water today
            </T>
            <T variant="small" color={c.inkSoft} style={{ marginTop: 4 }}>
              {Math.round(water / GLASS_ML)} glasses · {hydrationStreak(s, goals.waterMl, today)} day goal streak
            </T>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Button label={`+ ${GLASS_ML} ml`} icon="droplet" compact onPress={() => addWater(today, GLASS_ML)} testID="water-add" />
              <Button label="Undo" kind="ghost" compact onPress={() => addWater(today, -GLASS_ML)} />
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' }}>
          <T variant="caption" style={{ flex: 1 }}>
            Daily goal
          </T>
          {[1500, 2000, 2500, 3000].map((g) => (
            <Chip key={g} small label={`${g / 1000} L`} selected={goals.waterMl === g} onPress={() => setGoals({ waterMl: g })} />
          ))}
        </View>
      </Card>

      <SectionTitle right={!adding ? <Button label="Add meal" icon="plus" compact kind="secondary" onPress={() => setAdding(true)} testID="meal-add" /> : undefined}>Meals today</SectionTitle>
      {adding ? (
        <Card style={{ marginBottom: 10 }} testID="meal-form">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MEAL_KINDS.map((k) => (
              <Chip key={k.key} small label={k.label} selected={kind === k.key} onPress={() => setKind(k.key)} color={color} />
            ))}
          </View>
          <T variant="caption" style={{ marginTop: 12 }}>
            What was on the plate?
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {TAGS.map((t) => (
              <Chip key={t.key} small label={t.label} selected={tags.includes(t.key)} onPress={() => setTags(tags.includes(t.key) ? tags.filter((x) => x !== t.key) : [...tags, t.key])} color={t.good ? c.ok : c.muted} testID={`tag-${t.key}`} />
            ))}
          </View>
          <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Chicken salad and an apple" />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Button
              label="Save meal"
              icon="check"
              compact
              testID="meal-save"
              onPress={() => {
                const now = new Date();
                logMeal({ date: today, time: fmtHm(now.getHours() * 60 + now.getMinutes()), kind, tags, note: note.trim() || undefined });
                setAdding(false);
                setTags([]);
                setNote('');
              }}
            />
            <Button label="Cancel" kind="ghost" compact onPress={() => setAdding(false)} />
          </View>
        </Card>
      ) : null}
      <Pressable onPress={() => router.push('/fuel-food')} testID="food-specific" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, marginBottom: 6 }}>
        <Feather name="search" size={15} color={color} />
        <T variant="small" color={color} style={{ flex: 1 }}>
          Add a specific food (search or scan a barcode)
        </T>
        <Feather name="chevron-right" size={15} color={c.muted} />
      </Pressable>
      <Card padded={false}>
        {meals.length ? (
          meals.map((m, i) => (
            <Pressable key={m.id} onLongPress={() => deleteMeal(m.id)} style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T variant="bodyStrong">{MEAL_KINDS.find((k) => k.key === m.kind)?.label}</T>
                <T variant="caption">{clock(m.time)}</T>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {m.tags.length ? m.tags.map((t) => <Chip key={t} small label={TAGS.find((x) => x.key === t)!.label} />) : m.food ? null : <T variant="caption">No details</T>}
              </View>
              {m.food ? (
                <Pressable onPress={() => router.push({ pathname: '/fuel-food', params: { edit: m.id } })} testID={`meal-food-${i}`}>
                  <T variant="small" style={{ marginTop: 6 }}>
                    {foodLine(m.food)}
                  </T>
                  <T variant="caption" color={c.muted}>
                    {OFF_ATTRIBUTION} · tap to change the portion
                  </T>
                </Pressable>
              ) : null}
              {m.note ? (
                <T variant="small" color={c.muted} style={{ marginTop: 4 }}>
                  {m.note}
                </T>
              ) : null}
            </Pressable>
          ))
        ) : (
          <T variant="small" color={c.muted} style={{ padding: 16 }}>
            No meals logged today.
          </T>
        )}
      </Card>
      {score !== null ? (
        <T variant="caption" style={{ marginTop: 6 }}>
          Fuel ring today: {Math.round(score * 100)}%. Half water, half meal pattern.
        </T>
      ) : null}

      <SectionTitle>This week’s pattern</SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 }}>
          <Stat label="Meals with protein" value={`${pct('protein')}%`} color={c.ok} />
          <Stat label="With vegetables or fruit" value={`${pct('plants')}%`} color={c.ok} />
          <Stat label="Mostly packaged" value={`${pct('processed')}%`} />
        </View>
      </Card>

      <SectionTitle>Water per day</SectionTitle>
      <RangePicker value={range} onChange={setRange} />
      <Card style={{ marginTop: 10 }}>
        <Bars data={waterSeries(s, range, today).map((x) => ({ label: range <= 7 ? weekdayShort(x.date) : shortDate(x.date), value: x.value }))} color={c.pillar.recover} goal={goals.waterMl} unit=" ml" testID="water-chart" />
      </Card>

      <SectionTitle>Eating window (optional)</SectionTitle>
      <Card testID="fast-card">
        {fast ? (
          <>
            <T variant="label" color={color}>
              Since your last meal
            </T>
            <T variant="display" style={{ marginTop: 4 }}>
              {durationWords(fastHours(fast) * 60)}
            </T>
            <T variant="small" color={c.muted}>
              Started {clockOf(fast.start)} · target {goals.fastHours} h
            </T>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: c.surface2, marginTop: 10, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(100, (fastHours(fast) / goals.fastHours) * 100)}%`, height: 8, backgroundColor: color }} />
            </View>
            <Button label="I ate: end the window" icon="square" compact kind="secondary" style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={() => endFast()} testID="fast-end" />
          </>
        ) : (
          <>
            <T variant="small" color={c.inkSoft}>
              Tap when you finish your last meal of the day. The timer runs until you eat again.
            </T>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' }}>
              <Button label="Start now" icon="clock" compact onPress={() => startFast()} testID="fast-start" />
              {[12, 13, 14].map((h) => (
                <Chip key={h} small label={`${h} h`} selected={goals.fastHours === h} onPress={() => setGoals({ fastHours: h })} />
              ))}
            </View>
          </>
        )}
        <View style={{ marginTop: 14 }}>
          <Bars data={fastSeries(s, 7, today).map((x) => ({ label: weekdayShort(x.date), value: x.value === null ? null : Math.round(x.value * 10) / 10 }))} color={color} goal={goals.fastHours} unit=" h" height={110} />
        </View>
      </Card>
      <Note tone="warn" text="Eating windows are optional and not right for everyone. Skip them if you are pregnant or breastfeeding, under 18, have a history of eating disorders, or take medicine that lowers blood sugar, unless your clinician says otherwise." />
      <Note text="Fluid needs vary with heat, activity and health. People told to limit fluids should follow their clinician’s advice. General information, not medical advice." />
      <View style={{ height: 10 }} />
      <Feather name="droplet" size={1} color="transparent" />
    </Screen>
  );
}
