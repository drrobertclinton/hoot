// Step-by-step hookup for each brand through Apple Health (iPhone) or Health Connect (Android). Pure data.
// Menu names are each brand's own and can shift a little between app versions, so every guide says what to look for.
export type HookupGroup = 'watch' | 'ring' | 'glucose' | 'heart' | 'oxygen' | 'scale' | 'sleep' | 'apps';
export type Hookup = {
  id: string;
  name: string;
  group: HookupGroup;
  devices: string;
  /** Steps inside the brand's own iPhone app. Empty when the brand does not share with Apple Health. */
  ios: string[];
  /** Steps inside the brand's own Android app. */
  android: string[];
  /** What arrives in Coressence. */
  brings: string;
  /** A plain caveat worth knowing before starting. */
  note?: string;
};

export const GROUPS: { key: HookupGroup; label: string; icon: string }[] = [
  { key: 'watch', label: 'Watches and bands', icon: 'watch' },
  { key: 'ring', label: 'Rings', icon: 'circle' },
  { key: 'glucose', label: 'Glucose sensors and meters', icon: 'droplet' },
  { key: 'heart', label: 'Heart: straps, ECG and blood pressure cuffs', icon: 'heart' },
  { key: 'oxygen', label: 'Blood oxygen', icon: 'wind' },
  { key: 'scale', label: 'Scales and body composition', icon: 'bar-chart-2' },
  { key: 'sleep', label: 'Sleep', icon: 'moon' },
  { key: 'apps', label: 'Fitness and food apps', icon: 'smartphone' },
];

const HC = (app: string, where: string) => [`Open ${app} and go to ${where}.`, 'Choose Health Connect and allow the items you want to share.'];

export const HOOKUPS: Hookup[] = [
  { id: 'apple-watch', name: 'Apple Watch', group: 'watch', devices: 'Every Apple Watch, and the iPhone itself', ios: ['Nothing to set up: Apple Watch and iPhone already save to Apple Health.'], android: [], brings: 'Sleep stages, heart rate, HRV, workouts, steps, blood oxygen, wrist temperature, ECG results and rhythm notifications' },
  { id: 'garmin', name: 'Garmin', group: 'watch', devices: 'Forerunner, Fenix, Venu, Vivoactive, Lily, Index scales', ios: ['Open Garmin Connect and tap More.', 'Go to Settings, then Connected Apps, then Apple Health.', 'Turn on the categories you want to share.'], android: HC('Garmin Connect', 'More, Settings, Health Connect'), brings: 'Workouts, steps, sleep, heart rate, weight and more', note: 'Garmin sends less detail to Apple Health than its own app shows. Body Battery and training status stay in Garmin Connect.' },
  { id: 'whoop', name: 'WHOOP', group: 'watch', devices: 'WHOOP 5.0, MG and 4.0', ios: ['Open WHOOP and tap More.', 'Go to App Settings, then Integrations, then Apple Health.', 'Turn it on and allow the items.'], android: HC('WHOOP', 'More, App Settings, Integrations'), brings: 'Sleep, heart rate, HRV, breathing rate, blood oxygen and workouts', note: 'WHOOP’s own recovery and strain scores stay in the WHOOP app; Coressence works out readiness from the same signals.' },
  { id: 'fitbit', name: 'Fitbit and Pixel Watch', group: 'watch', devices: 'Charge, Sense, Versa, Inspire, Pixel Watch', ios: [], android: HC('the Fitbit app', 'the You tab, the settings gear, then Health Connect'), brings: 'Sleep, heart rate, steps, workouts and weight', note: 'On iPhone, Fitbit does not share with Apple Health. Until Coressence’s direct Fitbit sign-in opens, you can enter numbers by hand in Measure.' },
  { id: 'samsung', name: 'Samsung Galaxy Watch', group: 'watch', devices: 'Galaxy Watch and Galaxy Ring (Android phones)', ios: [], android: HC('Samsung Health', 'the three-dot menu, Settings, Health Connect'), brings: 'Sleep, heart rate, steps, workouts, blood oxygen and body composition', note: 'Galaxy Watch and Galaxy Ring pair with Android phones only.' },
  { id: 'polar', name: 'Polar', group: 'watch', devices: 'Vantage, Grit X, Pacer, Ignite, Loop', ios: ['Open Polar Flow and go to Settings, then General.', 'Turn on Apple Health and allow the items.'], android: HC('Polar Flow', 'Settings, General'), brings: 'Workouts, heart rate, sleep and steps' },
  { id: 'coros', name: 'Coros', group: 'watch', devices: 'Pace, Apex, Vertix', ios: ['Open the Coros app and go to Profile, then Settings.', 'Open 3rd Party Apps, choose Apple Health and connect.'], android: HC('the Coros app', 'Profile, Settings, 3rd Party Apps'), brings: 'Workouts, heart rate, sleep and steps' },
  { id: 'suunto', name: 'Suunto', group: 'watch', devices: 'Suunto Race, Vertical, 9 Peak', ios: ['Open the Suunto app and go to Profile, then the settings gear.', 'Choose Apple Health and turn on sharing.'], android: HC('the Suunto app', 'Profile, settings'), brings: 'Workouts, heart rate, sleep and steps' },
  { id: 'amazfit', name: 'Amazfit / Zepp', group: 'watch', devices: 'Amazfit watches, bands and Helio ring', ios: ['Open the Zepp app and go to Profile.', 'Tap Add accounts and choose Apple Health.'], android: HC('the Zepp app', 'Profile, Add accounts'), brings: 'Sleep, heart rate, steps, workouts and weight' },
  { id: 'xiaomi', name: 'Xiaomi', group: 'watch', devices: 'Smart Band and Xiaomi Watch', ios: ['Open Mi Fitness and go to Profile.', 'Open Settings (or Linked apps) and connect Apple Health.'], android: HC('Mi Fitness', 'Profile, Settings'), brings: 'Sleep, heart rate, steps and workouts' },

  { id: 'oura', name: 'Oura Ring', group: 'ring', devices: 'Oura Ring 4 and Gen3', ios: ['Open Oura and tap the menu at the top left.', 'Go to Settings, then Apple Health.', 'Turn on Connect to Health and allow the items.'], android: HC('Oura', 'the menu, Settings, Health Connect'), brings: 'Sleep, heart rate, HRV, breathing rate, temperature, workouts and mindful minutes', note: 'Oura’s readiness score stays in Oura; Coressence works out its own from the same signals.' },
  { id: 'ultrahuman', name: 'Ultrahuman', group: 'ring', devices: 'Ring AIR and M1 glucose', ios: ['Open Ultrahuman and go to Profile, then Settings.', 'Choose Apple Health and turn on sharing.'], android: HC('Ultrahuman', 'Profile, Settings'), brings: 'Sleep, heart rate, HRV, temperature and steps' },

  { id: 'dexcom', name: 'Dexcom G7 and G6', group: 'glucose', devices: 'Dexcom G7 and G6 continuous glucose monitors', ios: ['Open the Dexcom app and go to Connections.', 'Choose Apple Health and tap Enable.', 'Allow Blood Glucose when iPhone asks.'], android: HC('the Dexcom app', 'Connections'), brings: 'Glucose readings, lined up with your meals and workouts', note: 'Dexcom sends readings to Apple Health three hours late. Use the Dexcom app for live numbers and alerts.' },
  { id: 'stelo', name: 'Stelo by Dexcom', group: 'glucose', devices: 'Stelo glucose biosensor (no prescription needed in the US)', ios: ['Open the Stelo app and go to Settings (or Connections).', 'Choose Apple Health and turn it on.', 'Allow Blood Glucose when iPhone asks.'], android: HC('the Stelo app', 'Settings'), brings: 'Glucose readings, lined up with your meals and workouts', note: 'Stelo readings reach Apple Health after a delay of about three hours.' },
  { id: 'libre', name: 'FreeStyle Libre', group: 'glucose', devices: 'FreeStyle Libre 2, 2 Plus, 3 and 3 Plus', ios: ['Open the Libre app and open the menu.', 'Choose Connected Apps, then Apple Health.', 'Allow Blood Glucose when iPhone asks.'], android: HC('the Libre app', 'the menu, Connected Apps'), brings: 'Glucose readings, lined up with your meals and workouts', note: 'Abbott offers Apple Health sharing in some countries and app versions. If you do not see Connected Apps, update the Libre app.' },
  { id: 'lingo', name: 'Lingo by Abbott', group: 'glucose', devices: 'Lingo glucose biosensor (no prescription needed in the US)', ios: ['Open Lingo and go to the profile or settings screen.', 'Choose Apple Health and allow Blood Glucose.'], android: [], brings: 'Glucose readings, lined up with your meals and workouts' },
  { id: 'meter', name: 'Finger-stick meters', group: 'glucose', devices: 'Contour, OneTouch, Accu-Chek and others with a phone app', ios: ['Open your meter’s app (Contour Diabetes, OneTouch Reveal, mySugr and similar).', 'Look in its settings for Apple Health and turn on sharing.'], android: HC('your meter’s app', 'its settings'), brings: 'Each glucose reading you take' },

  { id: 'strap', name: 'Heart rate straps', group: 'heart', devices: 'Polar H10 and Verity Sense, Garmin HRM, Wahoo TICKR, Coospo and most others', ios: ['Put the strap on and wet the contacts.', 'In Coressence open Move, then Live heart rate.', 'Tap Connect and pick your strap from the list.'], android: ['Put the strap on and wet the contacts.', 'In Coressence open Move, then Live heart rate.', 'Tap Connect and pick your strap from the list.'], brings: 'Live heart rate and zones during a workout', note: 'Straps connect straight to Coressence over Bluetooth; nothing else to install.' },
  { id: 'omron', name: 'Omron blood pressure', group: 'heart', devices: 'Omron cuffs that pair with Omron Connect', ios: ['Open Omron Connect and go to Profile.', 'Open App Settings (or Connected Apps) and choose Apple Health.', 'Turn on blood pressure and pulse.'], android: HC('Omron Connect', 'Profile, App Settings'), brings: 'Blood pressure and pulse' },
  { id: 'withings-bp', name: 'Withings blood pressure', group: 'heart', devices: 'BPM Connect, BPM Vision, BPM Core', ios: ['Open the Withings app and go to Profile.', 'Choose Apple Health and turn on the categories.'], android: HC('the Withings app', 'Profile'), brings: 'Blood pressure and pulse' },
  { id: 'qardio', name: 'Qardio', group: 'heart', devices: 'QardioArm cuff and QardioBase scale', ios: ['Open the Qardio app and open the menu.', 'Go to Settings and turn on Apple Health.'], android: HC('the Qardio app', 'the menu, Settings'), brings: 'Blood pressure, pulse and weight' },

  { id: 'apple-ecg', name: 'Apple Watch ECG and rhythm notices', group: 'heart', devices: 'Apple Watch Series 4 and later', ios: ['Record an ECG with the ECG app on your watch; results save to Apple Health on their own.', 'Irregular rhythm and high or low heart rate notifications are turned on in the Watch app, under Heart.'], android: [], brings: 'ECG results as Apple reports them, rhythm notifications, heart rate and HRV', note: 'Coressence shows these records as reported. It does not read or interpret the tracing.' },
  { id: 'kardia', name: 'KardiaMobile', group: 'heart', devices: 'KardiaMobile, KardiaMobile 6L and Kardia Card by AliveCor', ios: ['Open the Kardia app and go to Profile (or Settings).', 'Find Health app integration and turn it on.'], android: HC('the Kardia app', 'Profile'), brings: 'Heart rate from each recording, and blood pressure or weight if you log them there', note: 'The ECG tracing and Kardia’s rhythm result stay in the Kardia app; share those with your clinician from there.' },
  { id: 'withings-ecg', name: 'Withings ScanWatch and BPM Core', group: 'heart', devices: 'ScanWatch, ScanWatch 2, ScanWatch Nova, BPM Core', ios: ['Open the Withings app and go to Profile.', 'Choose Apple Health and turn on the categories.'], android: HC('the Withings app', 'Profile'), brings: 'Heart rate, blood oxygen, sleep, blood pressure and steps', note: 'ECG recordings stay in the Withings app.' },
  { id: 'ihealth-bp', name: 'iHealth blood pressure', group: 'heart', devices: 'iHealth Track, Neo, Clear and other iHealth cuffs', ios: ['Open iHealth MyVitals and go to Settings.', 'Choose Apple Health and turn on blood pressure.'], android: HC('iHealth MyVitals', 'Settings'), brings: 'Blood pressure and pulse' },

  { id: 'oximeter-wellue', name: 'Wellue and Viatom oximeters', group: 'oxygen', devices: 'O2Ring, SleepU, Checkme and fingertip oximeters that use the ViHealth app', ios: ['Open ViHealth and go to Settings.', 'Turn on Apple Health and allow blood oxygen and heart rate.'], android: HC('ViHealth', 'Settings'), brings: 'Blood oxygen and pulse, including overnight recordings' },
  { id: 'oximeter-masimo', name: 'Masimo', group: 'oxygen', devices: 'MightySat fingertip oximeter', ios: ['Open the Masimo Personal Health app and go to Settings.', 'Turn on Apple Health sharing.'], android: HC('the Masimo Personal Health app', 'Settings'), brings: 'Blood oxygen, pulse and breathing rate' },
  { id: 'oximeter-ihealth', name: 'iHealth oximeter', group: 'oxygen', devices: 'iHealth Air fingertip oximeter', ios: ['Open iHealth MyVitals and go to Settings.', 'Choose Apple Health and turn on blood oxygen.'], android: HC('iHealth MyVitals', 'Settings'), brings: 'Blood oxygen and pulse' },
  { id: 'oximeter-watch', name: 'From a watch or ring', group: 'oxygen', devices: 'Apple Watch, Garmin, Oura, WHOOP, Withings and others that measure blood oxygen', ios: ['Connect the watch or ring using its own steps in this guide; blood oxygen comes with it.'], android: ['Connect the watch or ring using its own steps in this guide; blood oxygen comes with it.'], brings: 'Overnight blood oxygen', note: 'Blood oxygen from a watch or ring is a wellness estimate, not a medical reading.' },

  { id: 'withings', name: 'Withings scales', group: 'scale', devices: 'Body Smart, Body Scan, Body Comp, Body+', ios: ['Open the Withings app and go to Profile.', 'Choose Apple Health and turn on the categories.'], android: HC('the Withings app', 'Profile'), brings: 'Weight, body fat and lean mass' },
  { id: 'hume', name: 'Hume Body Pod', group: 'scale', devices: 'Hume Body Pod and Hume Band', ios: ['Open the Hume Health app and go to your profile or settings.', 'Find Apple Health (under integrations or connected apps) and turn on sharing.'], android: HC('the Hume Health app', 'your profile or settings'), brings: 'Weight, body fat and lean mass', note: 'Hume’s segment-by-segment readings stay in the Hume app; Coressence takes the whole-body numbers.' },
  { id: 'renpho', name: 'Renpho and Eufy scales', group: 'scale', devices: 'Renpho, Eufy and most Bluetooth smart scales', ios: ['Open the scale’s app and go to its settings or account screen.', 'Find Apple Health (sometimes under Third-party apps) and turn it on.'], android: HC('the scale’s app', 'its settings'), brings: 'Weight and body fat' },

  { id: 'eight', name: 'Eight Sleep', group: 'sleep', devices: 'Pod covers and mattresses', ios: ['Open Eight Sleep and go to Profile, then Settings.', 'Choose Apple Health and turn on sharing.'], android: HC('Eight Sleep', 'Profile, Settings'), brings: 'Sleep, heart rate, HRV and breathing rate' },
  { id: 'withings-sleep', name: 'Withings Sleep Analyzer', group: 'sleep', devices: 'Under-mattress sleep sensor', ios: ['Open the Withings app and go to Profile.', 'Choose Apple Health and turn on Sleep.'], android: HC('the Withings app', 'Profile'), brings: 'Sleep and overnight heart rate' },

  { id: 'cpap', name: 'CPAP machines', group: 'sleep', devices: 'ResMed AirSense and AirMini, Philips DreamStation and others', ios: [], android: [], brings: 'Nothing from the machine yet', note: 'ResMed myAir and Philips DreamMapper do not share therapy data with Apple Health or Health Connect today. Wear a watch or ring with your CPAP and Coressence shows your sleep, overnight blood oxygen and breathing rate, which is where good therapy shows up.' },

  { id: 'peloton', name: 'Peloton', group: 'apps', devices: 'Bike, Tread, Row and the Peloton app', ios: ['Open Peloton and go to your profile, then Settings.', 'Open Add-ons (or Health app) and connect Apple Health.'], android: HC('Peloton', 'profile, Settings'), brings: 'Workouts with heart rate and energy' },
  { id: 'strava', name: 'Strava', group: 'apps', devices: 'Runs, rides and other recorded activities', ios: ['Open Strava and go to You, then the settings gear.', 'Choose Applications, Services and Devices, then Health, and connect.'], android: HC('Strava', 'You, Settings, Applications'), brings: 'Workouts' },
  { id: 'wahoo', name: 'Wahoo', group: 'apps', devices: 'ELEMNT bike computers, KICKR trainers, TICKR straps', ios: ['Open the Wahoo app and go to Profile.', 'Open Connected Apps and authorize Apple Health.'], android: HC('the Wahoo app', 'Profile, Connected Apps'), brings: 'Workouts with heart rate' },
  { id: 'mfp', name: 'MyFitnessPal and Cronometer', group: 'apps', devices: 'Food logging apps', ios: ['Open the app and go to More (or Settings).', 'Choose Apps and Devices, then Apple Health, and turn on sharing.'], android: HC('the app', 'More, Apps and Devices'), brings: 'Weight and nutrition totals saved to Apple Health' },
];

export type Phone = 'ios' | 'android';
export const phoneOf = (os: string): Phone => (os === 'android' ? 'android' : 'ios');
export const stepsFor = (h: Hookup, phone: Phone) => (phone === 'ios' ? h.ios : h.android);

/** The last step is always the same: let Coressence read what the brand's app now shares. */
export function finalStep(h: Hookup, phone: Phone): string | null {
  if (h.id === 'strap' || h.id === 'oximeter-watch' || !stepsFor(h, phone).length) return null;
  return phone === 'ios' ? 'Back in Coressence, open Connected devices, tap Apple Health and choose Connect. Allow the items when iPhone asks.' : 'Back in Coressence, open Connected devices, tap Health Connect and choose Connect. Allow the items when Android asks.';
}

/** For a device that is not on the list. */
export const NOT_LISTED: Record<Phone, string[]> = {
  ios: ['Open your device’s own app and look in Settings, Profile or Connected Apps for “Apple Health” or “Health”.', 'Turn it on and allow the items.', 'To check, open the iPhone Health app, tap your picture, then Apps: your device’s app should be listed there.', 'Then connect Apple Health in Coressence.'],
  android: ['Open your device’s own app and look in Settings or Profile for “Health Connect”.', 'Turn it on and allow the items.', 'To check, open Android Settings, search for Health Connect and look under App permissions.', 'Then connect Health Connect in Coressence.'],
};

export function searchHookups(q: string): Hookup[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return HOOKUPS;
  return HOOKUPS.filter((h) => words.every((w) => `${h.name} ${h.devices}`.toLowerCase().includes(w)));
}
