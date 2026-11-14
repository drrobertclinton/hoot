// Coressence+ gates: range picker with free-plan limits, and a lock card that opens the membership screen.
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { usePremium } from './billing/billing';
import { FREE } from './billing/config';
import { useTheme } from './theme';
import { Button, Card, Segmented, T } from './ui';

export type Range = 7 | 30 | 90;

export function RangePicker({ value, onChange, testID }: { value: Range; onChange: (r: Range) => void; testID?: string }) {
  const premium = usePremium();
  return (
    <Segmented
      testID={testID ?? 'range'}
      value={String(value) as '7' | '30' | '90'}
      onChange={(k) => {
        const r = Number(k) as Range;
        if (!premium && r > FREE.historyDays) return router.push({ pathname: '/plus', params: { reason: 'history' } });
        onChange(r);
      }}
      options={[
        { key: '7', label: '7 days' },
        { key: '30', label: premium ? '30 days' : '30 days ·+' },
        { key: '90', label: premium ? '90 days' : '90 days ·+' },
      ]}
    />
  );
}

export function LockCard({ title, text, reason }: { title: string; text: string; reason: string }) {
  const c = useTheme();
  return (
    <Card style={{ marginTop: 12, borderColor: c.teal, borderWidth: 1 }} testID={`lock-${reason}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="lock" size={16} color={c.accent} />
        </View>
        <T variant="heading" style={{ flex: 1 }}>
          {title}
        </T>
      </View>
      <T variant="small" color={c.inkSoft} style={{ marginTop: 8 }}>
        {text}
      </T>
      <Button label="See Coressence+" kind="teal" compact icon="star" style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={() => router.push({ pathname: '/plus', params: { reason } })} />
    </Card>
  );
}
