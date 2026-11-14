// Web preview: no camera scanner. The food screen offers typed barcodes and search instead.
import React from 'react';
import { Note } from '@core/ui';

export const SCANNER_AVAILABLE = false;

export function BarcodeScanner(_: { onCode: (code: string) => void; paused?: boolean }) {
  return <Note icon="smartphone" text="Barcode scanning works in the Coressence Life phone app. Here you can type the barcode number or search by name." />;
}
