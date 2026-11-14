import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Screen, T } from '@core/ui';
import { MOVE_ROUTINES } from '@modules/move/routines';
import { WARMUPS } from '@modules/rehearse/warmups';
import { RoutinePlayer } from '../../components/RoutinePlayer';

export default function RoutineRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = [...MOVE_ROUTINES, ...WARMUPS].find((x) => x.id === id);
  if (!r)
    return (
      <Screen title="Routine">
        <T>Routine not found.</T>
      </Screen>
    );
  return <RoutinePlayer key={r.id} routine={r} />;
}
