// Coressence+ membership: All-Access (individual or family) and one-time course tracks, Restore Purchases.
// Prices, periods and trials come from the App Store / Google Play at runtime (RevenueCat).
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { billing, useBilling } from '@core/billing/billing';
import type { ShopItem } from '@core/billing/billingCore';
import { ALL_ANNUAL, ALL_MONTHLY, COURSE_BOTH, COURSE_LIVE, COURSE_PERFORM, ENT_COURSE_LIVE, ENT_COURSE_PERFORM, FAMILY_ANNUAL, FAMILY_MONTHLY, LEGAL } from '@core/billing/config';
import { annualSavings, periodWords, trialWords } from '@core/billing/entitlements';
import { FONTS, useTheme } from '@core/theme';
import { Badge, Button, Card, Chip, Screen, SectionTitle, T } from '@core/ui';
import { Hero } from '../components/Hero';

const REASONS: Record<string, string> = {
  history: 'The free plan keeps 7 days of history in each module. Coressence+ keeps all of it, with 30- and 90-day trends.',
  patterns: 'See which of your habits move together, from sleep and steps to energy and mood.',
  lessons: 'Every lesson in Live at Your Peak and Perform at Your Peak is included.',
  routines: 'Every guided routine and warmup is included.',
};

const FEATURES: { icon: React.ComponentProps<typeof Feather>['name']; text: string }[] = [
  { icon: 'trending-up', text: 'Full history and 30- and 90-day trends in every module' },
  { icon: 'book-open', text: 'Both course tracks: Live at Your Peak and Perform at Your Peak' },
  { icon: 'activity', text: 'Every guided routine and performer warmup' },
  { icon: 'shuffle', text: 'Patterns between sleep, movement, food and how you feel' },
  { icon: 'moon', text: 'Every night of your sleep sound checks' },
  { icon: 'lock', text: 'Private by design: your data stays on your phone' },
];

const accountName = () => (Platform.OS === 'android' ? 'Google Play account' : Platform.OS === 'ios' ? 'Apple Account' : 'App Store or Google Play account');

export default function PlusScreen() {
  const c = useTheme();
  const st = useBilling();
  const params = useLocalSearchParams<{ reason?: string }>();
  const reason = params.reason ? REASONS[String(params.reason)] : undefined;
  const [items, setItems] = useState<Record<string, ShopItem> | null>(null);
  const [period, setPeriod] = useState<'annual' | 'monthly'>('annual');
  const [family, setFamily] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; kind: 'ok' | 'warn' | '' }>({ text: '', kind: '' });

  useEffect(() => {
    let live = true;
    billing.products().then((p) => live && setItems(p));
    return () => {
      live = false;
    };
  }, [st.mode]);

  const canBuy = st.mode === 'native' || st.mode === 'preview';
  const active = billing.allAccess();
  const ents = billing.entitlements();
  const id = family ? (period === 'annual' ? FAMILY_ANNUAL : FAMILY_MONTHLY) : period === 'annual' ? ALL_ANNUAL : ALL_MONTHLY;
  const sub = items?.[id];
  const trial = sub ? trialWords(sub.intro) : '';
  const price = (it?: ShopItem) => (it ? it.priceString + (it.source === 'catalog' ? ' (US)' : '') : '…');
  const save = items ? annualSavings(items[family ? FAMILY_MONTHLY : ALL_MONTHLY]?.catalog.price_usd ?? 0, items[family ? FAMILY_ANNUAL : ALL_ANNUAL]?.catalog.price_usd ?? 0) : 0;

  const buy = async (pid: string, what: string) => {
    if (st.mode === 'preview') return setMsg({ text: 'Coressence+ is available in the Coressence Life app for iPhone and Android. Everything in this preview is already unlocked.', kind: '' });
    setBusy(pid);
    setMsg({ text: '', kind: '' });
    const r = await billing.purchase(pid);
    setBusy(null);
    if (r.ok) setMsg({ text: `Thank you. ${what} is active.`, kind: 'ok' });
    else if (!r.cancelled) setMsg({ text: r.error || 'The purchase did not go through.', kind: 'warn' });
  };
  const restore = async () => {
    setMsg({ text: 'Checking your purchases…', kind: '' });
    const r = await billing.restore();
    if (!r.ok) return setMsg({ text: r.error || 'Could not restore.', kind: st.mode === 'preview' ? '' : 'warn' });
    const any = billing.allAccess() || billing.entitlements().size > 0;
    setMsg({ text: any ? 'Purchases restored.' : 'No purchases were found for this account.', kind: any ? 'ok' : '' });
  };

  const disclosure = `Payment is charged to your ${accountName()} when you confirm the purchase. Subscriptions renew automatically at the price shown for each period unless canceled at least 24 hours before the end of the current period; the renewal charge is made within the 24 hours before the period ends. ${trial ? 'If you start a free trial, any unused part of it ends when you subscribe. ' : ''}You can manage or cancel in your ${accountName()} settings at any time after purchase. Course tracks are one-time purchases. Family plans can be shared through Apple Family Sharing or Google Play Family Library.`;

  return (
    <Screen title="Coressence+" subtitle="All-Access membership" testID="plus">
      <Hero>
        <T variant="title" color="#FFFFFF">
          {reason ?? 'Everything in Coressence Life, with both courses.'}
        </T>
        <View style={{ marginTop: 12, gap: 9 }}>
          {FEATURES.map((f) => (
            <View key={f.text} style={{ flexDirection: 'row', gap: 10 }}>
              <Feather name={f.icon} size={16} color="#5FD3CF" style={{ marginTop: 3 }} />
              <T variant="small" color="#E4F0F5" style={{ flex: 1 }}>
                {f.text}
              </T>
            </View>
          ))}
        </View>
      </Hero>

      {st.mode === 'preview' ? (
        <View style={{ backgroundColor: c.accentSoft, borderRadius: 14, padding: 14, marginTop: 14 }}>
          <T variant="small" color={c.ink}>
            <T variant="small" style={{ fontFamily: FONTS.semibold }}>
              Web preview.{' '}
            </T>
            Coressence+ is purchased in the Coressence Life app for iPhone and Android. Prices here are US prices for reference.
          </T>
        </View>
      ) : null}
      {st.mode === 'unconfigured' ? (
        <View style={{ backgroundColor: c.warnSoft, borderRadius: 14, padding: 14, marginTop: 14 }}>
          <T variant="small" color={c.warn}>
            Purchases are not set up in this build yet. Every free feature keeps working.
          </T>
        </View>
      ) : null}

      <Card style={{ marginTop: 14, borderWidth: 2, borderColor: c.teal }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T variant="title">All-Access</T>
          {active ? <Badge text="Active" color={c.ok} /> : null}
        </View>
        {active ? (
          <>
            <T variant="small" color={c.inkSoft} style={{ marginTop: 6 }}>
              Coressence+ is active on this account.
            </T>
            <Button label="Manage or cancel" kind="secondary" icon="external-link" compact onPress={() => Linking.openURL(billing.managementURL())} style={{ marginTop: 12, alignSelf: 'flex-start' }} />
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Chip small label="Just me" selected={!family} onPress={() => setFamily(false)} testID="plan-individual" />
              <Chip small label="Family, up to 6" selected={family} onPress={() => setFamily(true)} testID="plan-family" />
            </View>
            <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              {(['annual', 'monthly'] as const).map((k) => {
                const it = items?.[family ? (k === 'annual' ? FAMILY_ANNUAL : FAMILY_MONTHLY) : k === 'annual' ? ALL_ANNUAL : ALL_MONTHLY];
                const on = period === k;
                return (
                  <Pressable key={k} testID={`period-${k}`} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setPeriod(k)} style={{ flex: 1, minHeight: 72, borderRadius: 14, borderWidth: 1.5, borderColor: on ? c.teal : c.line, backgroundColor: on ? c.accentSoft : 'transparent', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
                    <T variant="bodyStrong">{k === 'annual' ? 'Yearly' : 'Monthly'}</T>
                    <T variant="small" color={c.inkSoft}>
                      {it ? `${price(it)} / ${periodWords(it.period)}` : '…'}
                    </T>
                    {k === 'annual' && save > 0 ? (
                      <T variant="caption" color={c.ok}>
                        Save {save}%
                      </T>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            {sub ? (
              <>
                <T variant="heading" style={{ marginTop: 14 }}>
                  {trial ? `${trial}, then ${sub.priceString} per ${periodWords(sub.period)}` : `${sub.priceString} per ${periodWords(sub.period)}`}
                </T>
                <T variant="small" color={c.muted}>
                  Renews automatically every {periodWords(sub.period)} until canceled.
                </T>
                <Button testID="subscribe" label={busy === sub.id ? 'Connecting…' : trial ? 'Start free trial' : `Subscribe for ${sub.priceString}`} icon="star" kind="teal" disabled={!canBuy || !!busy} onPress={() => buy(sub.id, 'Coressence+')} style={{ marginTop: 14 }} />
              </>
            ) : (
              <T variant="small" color={c.muted} style={{ marginTop: 12 }}>
                {items ? 'All-Access is not available from the store right now.' : 'Loading prices from the store…'}
              </T>
            )}
          </>
        )}
      </Card>

      <SectionTitle>Or buy a course once</SectionTitle>
      <Card>
        <T variant="small" color={c.inkSoft}>
          Lifetime access to the lessons only. Lesson 1 is free to try.
        </T>
        {[
          { pid: COURSE_BOTH, name: 'Both tracks', owned: ents.has(ENT_COURSE_LIVE) && ents.has(ENT_COURSE_PERFORM) },
          { pid: COURSE_LIVE, name: 'Live at Your Peak', owned: ents.has(ENT_COURSE_LIVE) },
          { pid: COURSE_PERFORM, name: 'Perform at Your Peak', owned: ents.has(ENT_COURSE_PERFORM) },
        ].map((x) => (
          <View key={x.pid} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <T variant="bodyStrong" style={{ flex: 1 }}>
              {x.name}
            </T>
            {x.owned ? <Badge text="Owned" color={c.ok} /> : <Button label={busy === x.pid ? '…' : price(items?.[x.pid])} compact kind="secondary" disabled={!canBuy || !!busy} onPress={() => buy(x.pid, x.name)} testID={`buy-${x.pid}`} />}
          </View>
        ))}
      </Card>

      {msg.text ? (
        <T variant="bodyStrong" accessibilityLiveRegion="polite" color={msg.kind === 'ok' ? c.ok : msg.kind === 'warn' ? c.danger : c.ink} style={{ textAlign: 'center', marginTop: 16 }} testID="plus-msg">
          {msg.text}
        </T>
      ) : null}
      <Button testID="restore" label="Restore Purchases" kind="ghost" icon="rotate-ccw" onPress={restore} style={{ marginTop: 8 }} />
      <T variant="caption" style={{ marginTop: 8, lineHeight: 18 }}>
        {disclosure}
      </T>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 }}>
        <T variant="small" color={c.accent} style={{ fontFamily: FONTS.semibold, textDecorationLine: 'underline' }} accessibilityRole="link" onPress={() => Linking.openURL(LEGAL.terms)}>
          Terms of Use
        </T>
        <T variant="small" color={c.muted}>
          ·
        </T>
        <T variant="small" color={c.accent} style={{ fontFamily: FONTS.semibold, textDecorationLine: 'underline' }} accessibilityRole="link" onPress={() => Linking.openURL(LEGAL.privacy)}>
          Privacy Policy
        </T>
      </View>
    </Screen>
  );
}
