// Coressence Shop. Until the store is live (SHOP.storeUrl), this is a gear guide: what is worth having for each part
// of the method and what to look for, with nothing to buy and no outbound links.
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { SHOP } from '@core/appConfig';
import { moduleColor, useTheme } from '@core/theme';
import { Button, Card, Note, Screen, SectionTitle, T, type IconName } from '@core/ui';

const GUIDE: { icon: IconName; title: string; text: string; look: string[]; skip: string }[] = [
  { icon: 'watch', title: 'Wearables', text: 'A watch, ring or strap that syncs with Apple Health gives the app your sleep, heart rate and steps.', look: ['Overnight battery so sleep is captured', 'Heart rate variability and resting heart rate', 'Comfort you will keep on for a week straight'], skip: 'You do not need the newest model. Last year’s reads the same signals.' },
  { icon: 'droplet', title: 'Hydration', text: 'A bottle you like is the cheapest performance tool there is.', look: ['Marked volume so logging is one glance', 'A lid you can open with one hand', 'Electrolytes with sodium listed and little sugar'], skip: 'Skip “detox” and “alkaline” claims.' },
  { icon: 'moon', title: 'Sleep', text: 'Dark, cool and quiet beats any gadget.', look: ['A contoured mask that does not press on the eyes', 'A fan or steady sound source', 'Breathable bedding for a cooler bed'], skip: 'Skip sleep supplements until you have talked with your clinician.' },
  { icon: 'refresh-cw', title: 'Recovery and mobility', text: 'The Move routines need very little.', look: ['A mat with enough grip for bare feet', 'Loop and long bands in two strengths', 'A medium-density roller'], skip: 'Percussion guns are optional. Walking and sleep do more.' },
  { icon: 'mic', title: 'Voice care', text: 'For singers, actors and speakers on heavy voice days.', look: ['Straws for semi-occluded warmups', 'A personal steamer or room humidifier', 'A water bottle that lives with your script'], skip: 'Numbing lozenges hide strain. Rest and steam do not.' },
  { icon: 'book', title: 'Coressence books', text: 'Live at Your Peak and Perform at Your Peak. The full text of both courses is already in this app under Course.', look: ['Worksheets are in the app too', 'Homework syncs with your weekly cycle'], skip: '' },
];

export function ShopScreen() {
  const c = useTheme();
  const color = moduleColor(c, 'shop');
  const [open, setOpen] = useState<string | null>(GUIDE[0].title);
  return (
    <Screen title="Coressence Shop" subtitle="What is worth having, and what to look for" color={color} accentBar testID="shop">
      {SHOP.storeUrl ? (
        <Card style={{ borderColor: color, borderWidth: 1 }}>
          <T variant="body">The Coressence Shop carries the gear and books in this guide.</T>
          <Button label="Open Coressence Shop" icon="external-link" color={color} style={{ marginTop: 12 }} onPress={() => Linking.openURL(SHOP.storeUrl)} testID="shop-open" />
          <T variant="caption" style={{ marginTop: 10 }}>
            Opens in your browser. Purchases are made on the shop’s website, not in the app.
          </T>
        </Card>
      ) : (
        <Note text="This is a buying guide, not a store: there is nothing to buy in the app and no links out. Nothing here is required to follow the program." />
      )}
      <SectionTitle>Gear guide</SectionTitle>
      {GUIDE.map((x) => {
        const on = open === x.title;
        return (
          <Card key={x.title} style={{ marginBottom: 10 }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: on }} accessibilityLabel={x.title} onPress={() => setOpen(on ? null : x.title)} testID={`shop-${x.title}`} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: color + '1F', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={x.icon} size={19} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{x.title}</T>
                <T variant="small" color={c.muted}>
                  {x.text}
                </T>
              </View>
              <Feather name={on ? 'chevron-up' : 'chevron-down'} size={18} color={c.muted} />
            </Pressable>
            {on ? (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line }}>
                <T variant="label">What to look for</T>
                {x.look.map((l) => (
                  <View key={l} style={{ flexDirection: 'row', gap: 10, paddingTop: 6 }}>
                    <Feather name="check" size={16} color={color} style={{ marginTop: 3 }} />
                    <T variant="small" color={c.inkSoft} style={{ flex: 1 }}>
                      {l}
                    </T>
                  </View>
                ))}
                {x.skip ? (
                  <T variant="quote" color={c.muted} style={{ fontSize: 15, lineHeight: 21, marginTop: 10 }}>
                    {x.skip}
                  </T>
                ) : null}
              </View>
            ) : null}
          </Card>
        );
      })}
      <T variant="caption" style={{ marginTop: 8 }}>
        Supplements are not sold in the app. Talk with your clinician before starting any supplement.
      </T>
    </Screen>
  );
}
