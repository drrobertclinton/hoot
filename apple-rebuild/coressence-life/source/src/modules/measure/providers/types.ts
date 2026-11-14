// Health data provider interface. Each source (Apple Health, Health Connect, an aggregator, the demo) implements
// this, so the Measure module never depends on a particular platform library.
import type { DayMetrics } from '../model';
import type { Batch } from '../../devices/schema';

export interface HealthProvider {
  id: 'healthkit' | 'healthconnect' | 'terra' | 'junction' | 'rook' | 'demo';
  label: string;
  /** Whether this source exists on this device. */
  isAvailable(): Promise<boolean>;
  /** Ask for read permission. Resolves true when at least some data can be read. */
  connect(): Promise<boolean>;
  /** Everything for the last `days` days, one batch per brand that wrote it, ready for devices/merge.ts. */
  fetchBatches(days: number): Promise<Batch[]>;
  /** Daily totals and averages per local day key (older callers; the merged view of fetchBatches). */
  fetchDaily(days: number): Promise<Record<string, DayMetrics>>;
}
