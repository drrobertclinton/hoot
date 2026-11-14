// Two Android adjustments that keep the manifest honest about what Coressence Life does:
//
// 1. Health Connect opens the app with ACTION_SHOW_PERMISSIONS_RATIONALE (Android 13 and lower) or
//    VIEW_PERMISSION_USAGE (Android 14+) when someone taps the privacy policy link on its permission screen.
//    expo-health-connect adds those intent filters; this makes such a launch open the in-app Privacy screen
//    (coressence://privacy), which explains how health data is used, as Google requires.
// 2. Bluetooth heart rate straps never need location: BLUETOOTH_SCAN is marked neverForLocation, and the
//    Android 11-and-older location entries that react-native-ble-plx adds are removed (live straps need Android 12+).
const { withAndroidManifest, withMainActivity } = require('@expo/config-plugins');

const MARK = '// coressence: health connect rationale';
const KOTLIN = `
    ${MARK}
    if (intent?.action == "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" || intent?.action == "android.intent.action.VIEW_PERMISSION_USAGE") {
      intent.data = android.net.Uri.parse("coressence://privacy")
    }`;

module.exports = function withCoressenceAndroid(config) {
  config = withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (cfg.modResults.language === 'kt' && !src.includes(MARK)) src = src.replace(/override fun onCreate\(savedInstanceState: Bundle\?\) \{/, (m) => m + KOTLIN);
    cfg.modResults.contents = src;
    return cfg;
  });
  return withAndroidManifest(config, (cfg) => {
    const m = cfg.modResults.manifest;
    m.$ = { ...m.$, 'xmlns:tools': m.$['xmlns:tools'] || 'http://schemas.android.com/tools' };
    const isLoc = (p) => /ACCESS_(FINE|COARSE)_LOCATION/.test(p?.$?.['android:name'] || '');
    if (m['uses-permission-sdk-23']) m['uses-permission-sdk-23'] = m['uses-permission-sdk-23'].filter((p) => !isLoc(p));
    for (const p of m['uses-permission'] || []) if (p.$['android:name'] === 'android.permission.BLUETOOTH_SCAN') p.$['android:usesPermissionFlags'] = 'neverForLocation';
    return cfg;
  });
};
