// Share text or a file through the system share sheet; on the web, the browser share sheet or a download.
import { Platform, Share } from 'react-native';

function download(name: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Share plain text. Returns false if the person cancelled or sharing failed. */
export async function shareText(title: string, text: string, fileName = 'coressence-plan.txt'): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> }) : null;
      if (nav?.share) await nav.share({ title, text });
      else download(fileName, text, 'text/plain;charset=utf-8');
      return true;
    }
    const r = await Share.share({ title, message: text });
    return r.action !== Share.dismissedAction;
  } catch {
    return false;
  }
}

/** Write a file and open the share sheet (web: download). */
export async function shareFile(fileName: string, text: string, mimeType: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      download(fileName, text, mimeType);
      return true;
    }
    const { File, Paths } = await import('expo-file-system');
    const Sharing = await import('expo-sharing');
    const f = new File(Paths.cache, fileName);
    if (f.exists) f.delete();
    f.create();
    f.write(text);
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(f.uri, { mimeType, dialogTitle: fileName, UTI: mimeType === 'application/json' ? 'public.json' : undefined });
    return true;
  } catch {
    return false;
  }
}
