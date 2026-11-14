// Stack Check: everything you take in one list, by time of day, ready to show a pharmacist or clinician.
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { dayKey } from '@core/dates';
import { uid } from '@core/id';
import { shareText } from '@core/share';
import { useStore } from '@core/store';
import { moduleColor, useTheme } from '@core/theme';
import { Badge, Button, Card, Chip, Divider, Empty, Field, Note, Screen, SectionTitle, T } from '@core/ui';
import { KINDS, TIMES, active, byTime, questions, summaryText, type StackItem, type StackKind, type StackTime } from './model';
import { deleteItem, saveItem, setReviewed, useStack } from './state';

const blank = (): StackItem => ({ id: uid('stk'), name: '', kind: 'supplement', amount: '', times: [], why: '', by: '', started: null, paused: false, note: '' });

export function StackScreen() {
  const c = useTheme();
  const color = moduleColor(c, 'stack');
  const s = useStack();
  const name = useStore((st) => st.settings.name ?? '');
  const today = dayKey();
  const [edit, setEdit] = useState<StackItem | null>(null);
  const [who, setWho] = useState('');
  const groups = byTime(s);
  const qs = questions(s, today);
  const paused = s.items.filter((i) => i.paused);
  const count = active(s).length;

  if (edit) {
    const set = (p: Partial<StackItem>) => setEdit({ ...edit, ...p });
    const isNew = !s.items.some((i) => i.id === edit.id);
    return (
      <Screen title={isNew ? 'Add to my stack' : edit.name || 'Edit'} subtitle="Copy it from the label" color={color} accentBar testID="stack-edit">
        <Field label="Name" value={edit.name} onChangeText={(name) => set({ name })} placeholder="As written on the bottle or box" testID="stack-name" autoCapitalize="words" />
        <T variant="caption" color={c.inkSoft} style={{ marginTop: 14, marginBottom: 6 }}>
          What kind
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {KINDS.map((k) => (
            <Chip key={k.key} label={k.label} selected={edit.kind === k.key} color={color} onPress={() => set({ kind: k.key as StackKind })} testID={`stack-kind-${k.key}`} />
          ))}
        </View>
        <Field label="Amount, as the label says" value={edit.amount} onChangeText={(amount) => set({ amount })} placeholder="For example: 1 tablet, 10 mg" testID="stack-amount" />
        <T variant="caption" color={c.inkSoft} style={{ marginTop: 14, marginBottom: 6 }}>
          When I take it
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TIMES.map((t) => {
            const on = edit.times.includes(t.key);
            return <Chip key={t.key} label={t.label} selected={on} color={color} onPress={() => set({ times: on ? edit.times.filter((x) => x !== t.key) : [...edit.times, t.key as StackTime] })} testID={`stack-time-${t.key}`} />;
          })}
        </View>
        <Field label="What it is for" value={edit.why} onChangeText={(why) => set({ why })} placeholder="In your own words" testID="stack-why" />
        <Field label="Who prescribed or suggested it (optional)" value={edit.by} onChangeText={(by) => set({ by })} placeholder="Leave empty if you started it yourself" />
        <Field label="Notes (optional)" value={edit.note} onChangeText={(note) => set({ note })} placeholder="With food, side effects you noticed, refill date" multiline />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Button label="Save" icon="check" color={color} style={{ flex: 1 }} disabled={!edit.name.trim()} onPress={() => { saveItem({ ...edit, name: edit.name.trim(), started: edit.started ?? today }); setEdit(null); }} testID="stack-save" />
          <Button label="Cancel" kind="secondary" style={{ flex: 1 }} onPress={() => setEdit(null)} />
        </View>
        {!isNew ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <Button label={edit.paused ? 'Taking it again' : 'Paused or stopped'} icon={edit.paused ? 'play' : 'pause'} kind="ghost" compact style={{ flex: 1 }} onPress={() => { saveItem({ ...edit, paused: !edit.paused }); setEdit(null); }} testID="stack-pause" />
            <Button label="Remove" icon="trash-2" kind="ghost" compact style={{ flex: 1 }} onPress={() => { deleteItem(edit.id); setEdit(null); }} testID="stack-remove" />
          </View>
        ) : null}
        <Note text="Write the amount exactly as the label says. The app does not work out or suggest doses." />
      </Screen>
    );
  }

  return (
    <Screen title="Stack Check" subtitle="Everything you take, on one page" color={color} accentBar testID="stack">
      {count === 0 && !paused.length ? (
        <Empty icon="layers" title="Start your list" text="Medicines, vitamins, supplements, peptides, powders, drops. If you take it, it goes on the list. Most people forget two or three until they write it down." action={<Button label="Add the first one" icon="plus" color={color} onPress={() => setEdit(blank())} testID="stack-add-first" />} />
      ) : (
        <>
          <Card style={{ borderColor: color, borderWidth: 1 }} testID="stack-summary">
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
              <T variant="figure" color={color}>
                {count}
              </T>
              <T variant="small" color={c.inkSoft} style={{ flex: 1, paddingBottom: 8 }}>
                {count === 1 ? 'thing on your list' : 'things on your list'}
                {s.reviewedOn ? `. Last reviewed ${s.reviewedOn}${s.reviewedBy ? ` with ${s.reviewedBy}` : ''}.` : '. Not yet reviewed with a professional.'}
              </T>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Button label="Add" icon="plus" color={color} compact style={{ flex: 1 }} onPress={() => setEdit(blank())} testID="stack-add" />
              <Button label="Share my list" icon="share" kind="secondary" compact style={{ flex: 1 }} onPress={() => shareText('Everything I take', summaryText(s, name, today), 'my-stack.txt')} testID="stack-share" />
            </View>
          </Card>

          <SectionTitle>Your day</SectionTitle>
          {groups.map((g) => (
            <Card key={g.key} padded={false} style={{ paddingHorizontal: 14, marginBottom: 10 }} testID={`stack-group-${g.key}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 }}>
                <T variant="label" color={color}>
                  {g.label}
                </T>
                <T variant="caption">{g.items.length}</T>
              </View>
              {g.items.map((i, n) => (
                <View key={i.id}>
                  {n ? <Divider /> : null}
                  <Pressable accessibilityRole="button" accessibilityLabel={`${i.name}. Edit`} onPress={() => setEdit(i)} testID={`stack-item-${i.id}`} style={({ pressed }) => ({ paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.7 : 1 })}>
                    <View style={{ flex: 1 }}>
                      <T variant="bodyStrong">{i.name}</T>
                      <T variant="small" color={c.muted}>
                        {[i.amount, i.why ? `for ${i.why}` : ''].filter(Boolean).join(' · ') || 'Tap to add the amount and what it is for'}
                      </T>
                    </View>
                    <Badge text={KINDS.find((k) => k.key === i.kind)?.label ?? ''} color={color} />
                  </Pressable>
                </View>
              ))}
            </Card>
          ))}

          {qs.length ? (
            <>
              <SectionTitle>Questions to take with you</SectionTitle>
              <Card testID="stack-questions">
                {qs.map((q) => (
                  <View key={q} style={{ flexDirection: 'row', gap: 10, paddingVertical: 6 }}>
                    <Feather name="help-circle" size={17} color={color} style={{ marginTop: 3 }} />
                    <T variant="body" style={{ flex: 1 }}>
                      {q}
                    </T>
                  </View>
                ))}
                <T variant="caption" style={{ marginTop: 8 }}>
                  These come from your own list. They are included when you share it.
                </T>
              </Card>
            </>
          ) : null}

          <SectionTitle>The check itself</SectionTitle>
          <Card>
            <T variant="small" color={c.inkSoft}>
              A pharmacist can check a whole list for interactions in a few minutes, usually at no charge, and it is the most reliable check there is. Show them this list, or share it ahead of a visit.
            </T>
            <Field label="Who reviewed it" value={who} onChangeText={setWho} placeholder="Pharmacist or clinician name (optional)" />
            <Button label={s.reviewedOn === today ? 'Marked as reviewed today' : 'Mark as reviewed today'} icon="check-circle" kind="secondary" compact style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={() => setReviewed(today, who)} testID="stack-reviewed" />
          </Card>

          {paused.length ? (
            <>
              <SectionTitle>Paused or stopped</SectionTitle>
              <Card padded={false} style={{ paddingHorizontal: 14 }}>
                {paused.map((i, n) => (
                  <View key={i.id}>
                    {n ? <Divider /> : null}
                    <Pressable accessibilityRole="button" accessibilityLabel={`${i.name}. Edit`} onPress={() => setEdit(i)} style={{ paddingVertical: 12 }}>
                      <T variant="bodyStrong" color={c.muted}>
                        {i.name}
                      </T>
                    </Pressable>
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}
      <Note tone="warn" text="This is your own record. The app does not check interactions, doses or safety, and it is not medical advice. Do not start, stop or change anything on this list without talking with your clinician or pharmacist." />
    </Screen>
  );
}
