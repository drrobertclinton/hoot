// Fuel > Add a specific food: search Open Food Facts or scan a barcode, choose the portion, and log it as a meal.
// The pattern-based meal log on the Fuel screen stays the default; this is the optional, more specific path.
// Nutrients are shown as estimates for the portion. No calorie targets or goals are set anywhere (the app does not
// know the person's age, so it treats targets as off for everyone).
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import { dayKey, fmtHm } from '@core/dates';
import { moduleColor, useTheme } from '@core/theme';
import { Button, Card, Chip, Field, Note, Screen, Segmented, SectionTitle, Stepper, T } from '@core/ui';
import { MEAL_KINDS, TAGS, mealFood, portionWords, type MealKind, type MealTag } from './model';
import { NUTRIENT_LABELS, OFF_ATTRIBUTION, defaultPortion, lookupBarcode, portionNutrients, searchFoods, validBarcode, type FoodItem, type Portion } from './off';
import { BarcodeScanner, SCANNER_AVAILABLE } from './Scanner';
import { logMeal, setMealPortion, useFuel } from './state';

type Tab = 'search' | 'scan' | 'label';
const sendUA = Platform.OS !== 'web';

function guessKind(h: number): MealKind {
  return h < 10.5 ? 'breakfast' : h < 15 ? 'lunch' : h < 17 ? 'snack' : 'dinner';
}

export function Attribution() {
  const c = useTheme();
  return (
    <T variant="caption" color={c.muted} style={{ marginTop: 8 }}>
      {OFF_ATTRIBUTION} (openfoodfacts.org, Open Database License). Values are estimates from product labels and may be incomplete.
    </T>
  );
}

function NutrientTable({ item, portion }: { item: Pick<FoodItem, 'servingG' | 'per100'>; portion: Portion }) {
  const c = useTheme();
  const { grams, nutrients } = portionNutrients(item, portion);
  return (
    <View testID="nutrients">
      <T variant="label" color={c.inkSoft}>
        Estimated for this portion{grams !== null ? ` (${grams} g)` : ''}
      </T>
      {NUTRIENT_LABELS.map((n) => (
        <View key={n.key} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <T variant="small" color={n.label.startsWith('of which') ? c.muted : c.ink} style={{ paddingLeft: n.label.startsWith('of which') ? 12 : 0 }}>
            {n.label}
          </T>
          <T variant="small">{nutrients[n.key] === null ? 'not on label' : `about ${nutrients[n.key]} ${n.unit}`}</T>
        </View>
      ))}
      {grams === null ? (
        <T variant="caption" color={c.warn} style={{ marginTop: 6 }}>
          This label has no serving size. Enter the amount in grams to see estimates.
        </T>
      ) : null}
    </View>
  );
}

function PortionEditor({ item, portion, onChange }: { item: Pick<FoodItem, 'servingG' | 'servingText'>; portion: Portion; onChange: (p: Portion) => void }) {
  const servings = !!item.servingG;
  return (
    <View>
      {servings ? (
        <Segmented
          options={[
            { key: 'servings', label: `Servings${item.servingText ? ` (${item.servingText})` : ''}` },
            { key: 'grams', label: 'Grams' },
          ]}
          value={portion.mode}
          onChange={(m) => onChange(m === 'grams' ? { mode: 'grams', amount: Math.round((portion.amount || 1) * (item.servingG || 100)) } : { mode: 'servings', amount: 1 })}
          testID="portion-mode"
        />
      ) : null}
      {portion.mode === 'servings' ? (
        <Stepper label="Servings" value={portion.amount} step={0.5} min={0.5} max={20} onChange={(v) => onChange({ mode: 'servings', amount: v })} display={`${portion.amount}`} testID="portion-servings" />
      ) : (
        <Stepper label="Grams (or ml)" value={portion.amount} step={10} min={5} max={2000} unit=" g" onChange={(v) => onChange({ mode: 'grams', amount: v })} testID="portion-grams" />
      )}
    </View>
  );
}

export function FoodScreen() {
  const c = useTheme();
  const color = moduleColor(c, 'fuel');
  const params = useLocalSearchParams<{ edit?: string }>();
  const fuel = useFuel();
  const editing = params.edit ? fuel.meals.find((m) => m.id === params.edit && m.food) : undefined;
  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<FoodItem[] | null>(null);
  const [error, setError] = useState('');
  const [barcode, setBarcode] = useState('');
  const [picked, setPicked] = useState<FoodItem | null>(null);
  const [portion, setPortion] = useState<Portion>(editing?.food?.portion ?? { mode: 'servings', amount: 1 });
  const [kind, setKind] = useState<MealKind>(guessKind(new Date().getHours()));
  const [tags, setTags] = useState<MealTag[]>([]);
  const [retry, setRetry] = useState(0);
  const seq = useRef(0);

  // Debounced search; stale answers are ignored.
  useEffect(() => {
    if (tab !== 'search') return;
    const q = query.trim();
    setError('');
    if (q.length < 2) {
      setResults(null);
      setBusy(false);
      return;
    }
    const my = ++seq.current;
    setBusy(true);
    const t = setTimeout(async () => {
      const r = await searchFoods(q, { sendUserAgent: sendUA });
      if (my !== seq.current) return;
      setBusy(false);
      if (r.status === 'ok') setResults(r.items);
      else {
        setResults(null);
        setError(r.message);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [query, tab, retry]);

  const lookup = async (code: string) => {
    setError('');
    setBusy(true);
    const r = await lookupBarcode(code, { sendUserAgent: sendUA });
    setBusy(false);
    if (r.status === 'ok') choose(r.item);
    else setError(r.status === 'not_found' ? `No product with barcode ${code} is in Open Food Facts yet. Try searching by name, or log the meal by pattern.` : r.message);
  };
  const choose = (it: FoodItem) => {
    setPicked(it);
    setPortion(defaultPortion(it));
  };

  if (editing?.food) {
    const f = editing.food;
    return (
      <Screen title="Edit portion" subtitle={f.brand ? `${f.name} · ${f.brand}` : f.name} color={color} accentBar testID="food-edit">
        <Card>
          <PortionEditor item={f} portion={portion} onChange={setPortion} />
          <View style={{ marginTop: 14 }}>
            <NutrientTable item={f} portion={portion} />
          </View>
          <Attribution />
        </Card>
        <Button
          label="Save portion"
          icon="check"
          style={{ marginTop: 16 }}
          color={color}
          testID="food-save-portion"
          onPress={() => {
            setMealPortion(editing.id, portion);
            router.back();
          }}
        />
      </Screen>
    );
  }

  if (picked) {
    return (
      <Screen title={picked.name} subtitle={[picked.brand, picked.quantity].filter(Boolean).join(' · ') || 'Open Food Facts'} color={color} accentBar testID="food-detail">
        <Card>
          <PortionEditor item={picked} portion={portion} onChange={setPortion} />
          <View style={{ marginTop: 14 }}>
            <NutrientTable item={picked} portion={portion} />
          </View>
          <Attribution />
        </Card>
        <SectionTitle>Log it as</SectionTitle>
        <Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MEAL_KINDS.map((k) => (
              <Chip key={k.key} small label={k.label} selected={kind === k.key} onPress={() => setKind(k.key)} color={color} />
            ))}
          </View>
          <T variant="caption" style={{ marginTop: 12 }}>
            What else was on the plate? (optional, counts toward your meal pattern)
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {TAGS.map((t) => (
              <Chip key={t.key} small label={t.label} selected={tags.includes(t.key)} onPress={() => setTags(tags.includes(t.key) ? tags.filter((x) => x !== t.key) : [...tags, t.key])} color={t.good ? c.ok : c.muted} />
            ))}
          </View>
        </Card>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <Button label="Back" kind="secondary" onPress={() => setPicked(null)} style={{ flex: 1 }} />
          <Button
            label="Log meal"
            icon="check"
            color={color}
            style={{ flex: 1 }}
            testID="food-log"
            onPress={() => {
              const now = new Date();
              logMeal({ date: dayKey(), time: fmtHm(now.getHours() * 60 + now.getMinutes()), kind, tags, food: mealFood(picked, portion) });
              router.back();
            }}
          />
        </View>
        <T variant="caption" style={{ marginTop: 10 }}>
          Saved on this device with your other meals. Estimates only; there are no calorie targets in Coressence.
        </T>
      </Screen>
    );
  }

  return (
    <Screen title="Add a specific food" subtitle="Search or scan; optional" color={color} accentBar testID="food">
      <Segmented
        options={[
          { key: 'search', label: 'Search' },
          { key: 'scan', label: 'Barcode' },
        ]}
        value={tab}
        onChange={(t) => {
          setTab(t);
          setError('');
        }}
        testID="food-tab"
      />
      {tab === 'search' ? (
        <>
          <Field label="Food or product name" value={query} onChangeText={setQuery} placeholder="Greek yogurt, oat bar, lentil soup…" autoCorrect={false} testID="food-query" />
          {busy ? <ActivityIndicator style={{ marginTop: 16 }} color={color} /> : null}
          {error ? (
            <Card tint={c.warnSoft} style={{ marginTop: 12 }} testID="food-error">
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Feather name="wifi-off" size={18} color={c.warn} />
                <T variant="small" style={{ flex: 1 }}>
                  {error}
                </T>
              </View>
              <Button label="Try again" icon="rotate-ccw" compact kind="secondary" style={{ alignSelf: 'flex-start', marginTop: 10 }} onPress={() => setRetry((x) => x + 1)} testID="food-retry" />
            </Card>
          ) : null}
          {!busy && !error && results === null ? (
            <T variant="small" color={c.muted} style={{ marginTop: 14 }}>
              Type at least two letters. Results come from Open Food Facts, a free, open database of food products.
            </T>
          ) : null}
          {!busy && results && !results.length ? (
            <Card style={{ marginTop: 12 }} testID="food-empty">
              <T variant="small">No matches for “{query.trim()}”. Try a simpler name, or log the meal by pattern on the Fuel screen.</T>
            </Card>
          ) : null}
          {results && results.length ? (
            <Card padded={false} style={{ marginTop: 12 }} testID="food-results">
              {results.map((it, i) => (
                <Pressable key={it.code} onPress={() => choose(it)} testID={`food-result-${i}`} style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <T variant="bodyStrong" numberOfLines={2}>
                      {it.name}
                    </T>
                    <T variant="caption">{[it.brand, it.quantity, it.per100.energyKcal !== null ? `about ${Math.round(it.per100.energyKcal)} kcal per 100 g` : null].filter(Boolean).join(' · ')}</T>
                  </View>
                  <Feather name="chevron-right" size={16} color={c.muted} />
                </Pressable>
              ))}
            </Card>
          ) : null}
          {results && results.length ? <Attribution /> : null}
        </>
      ) : null}
      {tab === 'scan' ? (
        <>
          <View style={{ marginTop: 12 }}>
            <BarcodeScanner paused={busy || !!picked} onCode={(code) => validBarcode(code) && lookup(code)} />
          </View>
          <Field label={SCANNER_AVAILABLE ? 'Or type the barcode number' : 'Barcode number'} value={barcode} onChangeText={(v) => setBarcode(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="13 digits under the bars" testID="food-barcode" />
          <Button label="Look up" icon="search" compact kind="secondary" disabled={!validBarcode(barcode) || busy} style={{ alignSelf: 'flex-start', marginTop: 10 }} onPress={() => lookup(barcode)} testID="food-lookup" />
          {busy ? <ActivityIndicator style={{ marginTop: 16 }} color={color} /> : null}
          {error ? (
            <Card tint={c.warnSoft} style={{ marginTop: 12 }} testID="food-error">
              <T variant="small">{error}</T>
            </Card>
          ) : null}
          <Attribution />
        </>
      ) : null}
      {tab === 'label' ? (
        <Card style={{ marginTop: 12 }} testID="food-label-soon">
          <Feather name="camera" size={22} color={color} />
          <T variant="title" style={{ marginTop: 6 }}>
            Label scan: coming soon
          </T>
          <T variant="small" color={c.inkSoft} style={{ marginTop: 4 }}>
            Reading a nutrition label from a photo needs on-device text recognition, which is not in this version. For now, scan the barcode or search by name.
          </T>
        </Card>
      ) : null}
      <Note text="Optional. Logging meals by pattern on the Fuel screen is enough for the course and your Fuel score. Numbers here are estimates, not targets." />
    </Screen>
  );
}

/** One line for a logged food on the Fuel screen. */
export function foodLine(f: NonNullable<ReturnType<typeof mealFood>>) {
  return `${f.name}${f.brand ? ` (${f.brand})` : ''} · ${portionWords(f)}${f.nutrients.energyKcal !== null ? ` · about ${f.nutrients.energyKcal} kcal (estimate)` : ''}`;
}
