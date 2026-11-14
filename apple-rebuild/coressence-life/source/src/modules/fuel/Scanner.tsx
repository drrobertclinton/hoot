// Barcode scanner (iPhone and Android) using expo-camera. The camera runs only while this view is on screen.
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useRef } from 'react';
import { View } from 'react-native';
import { useTheme } from '@core/theme';
import { Button, T } from '@core/ui';

export const SCANNER_AVAILABLE = true;

export function BarcodeScanner({ onCode, paused }: { onCode: (code: string) => void; paused?: boolean }) {
  const c = useTheme();
  const [perm, request] = useCameraPermissions();
  const last = useRef<{ code: string; at: number } | null>(null);
  if (!perm) return null;
  if (!perm.granted)
    return (
      <View style={{ padding: 16, borderRadius: 16, backgroundColor: c.surface2 }}>
        <T variant="small">The camera is used only to read a product barcode. Nothing is recorded or saved.</T>
        {perm.canAskAgain ? (
          <Button label="Allow camera" icon="camera" compact style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={request} testID="scan-allow" />
        ) : (
          <T variant="small" color={c.warn} style={{ marginTop: 8 }}>
            Camera access is off for Coressence Life. You can turn it on in your phone's settings, or type the barcode below.
          </T>
        )}
      </View>
    );
  return (
    <View style={{ height: 260, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={
          paused
            ? undefined
            : (r) => {
                const now = Date.now();
                if (last.current && last.current.code === r.data && now - last.current.at < 3000) return;
                last.current = { code: r.data, at: now };
                onCode(r.data);
              }
        }
      />
      <View pointerEvents="none" style={{ position: 'absolute', left: '12%', right: '12%', top: '38%', height: '24%', borderWidth: 2, borderColor: '#FFFFFFCC', borderRadius: 12 }} />
    </View>
  );
}
