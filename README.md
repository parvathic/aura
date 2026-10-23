# Aura

A private cycle tracker for iPhone. Everything is stored on the phone itself: there is no account, no server, and the app makes no network requests.

Built with Expo SDK 58 / React Native 0.88, compiled as a native iOS app.

## Features

- **Cycle tracking:** current cycle day, phase (menstrual, follicular, ovulatory, luteal), fertility window and next-period prediction. Predictions learn from your past cycles and fall back to the cycle length you set.
- **Daily log:** mood, flow, symptoms and notes for any day up to today. Tap a day on the Home calendar to open it; logged days get a ring.
- **Routines:** daily, weekly, monthly or phase-specific rituals with their own reminder time.
- **Insights:** phase guidance with food and movement suggestions.
- **Reminders:** local notifications for routines and an upcoming period.

## Privacy and security

| | |
|---|---|
| **Storage** | SQLite database inside the app's sandbox. Nothing leaves the phone unless you export it. |
| **File encryption** | The database folder uses iOS Data Protection *Complete*: unreadable while the phone is locked. |
| **App Lock** | Optional Face ID / Touch ID lock (passcode fallback). Locks whenever you leave the app; the app-switcher preview is hidden. |
| **Lock-screen notifications** | With App Lock on, notifications say only "Aura / You have a reminder". |
| **iPhone backups** | A Settings switch chooses whether Aura's data is included in iCloud and computer backups. |
| **Export / restore** | Password-encrypted backup file (AES-256-GCM, key derived with PBKDF2-SHA256 at 600,000 iterations). Restored files are strictly validated before anything is replaced, and the restore runs in one transaction: all or nothing. |
| **Permissions** | Notifications and Face ID only. No push-notification entitlement, network requests, analytics or tracking. |

If you forget a backup password, that backup cannot be opened by anyone.

## Requirements

- macOS with **Xcode 27+** and the iOS simulator runtime installed
- **Node.js 24** (via [nvm](https://github.com/nvm-sh/nvm): `nvm install 24`)
- **CocoaPods 1.15+**
- An iPhone on **iOS 16.4+** to install on a device

> This Mac uses CocoaPods installed as a user gem. Before native builds, run:
> ```bash
> export LANG=en_US.UTF-8 PATH="$HOME/.gem/ruby/2.6.0/bin:$PATH"
> ```

## Getting started

```bash
nvm use 24
npm install
npx expo prebuild --platform ios   # generates ios/ (git-ignored)
```

## Run in the simulator

1. Start the dev server and leave it running:
   ```bash
   npx expo start
   ```
2. Open the Xcode workspace (the `.xcworkspace`, not the `.xcodeproj`):
   ```bash
   open ios/Aura.xcworkspace
   ```
3. Choose the **Aura** scheme and an iPhone simulator, then press **⌘R**.

Saved code changes reload instantly. Press **⌘D** in the simulator for the developer menu.

To test Face ID in the simulator: **Features → Face ID → Enrolled**, then **Matching Face** when the prompt appears.

> `npm run ios` does not work with Xcode 27, which no longer ships the separate Simulator app that Expo's launcher looks for. Use Xcode as above.

## Install on an iPhone (free Apple ID)

1. **Xcode → Settings → Accounts →** add your Apple ID.
2. **Aura target → Signing & Capabilities:** turn on *Automatically manage signing* and pick your Personal Team.
3. **Product → Scheme → Edit Scheme → Run → Build Configuration → Release** (bundles the app so it runs without the dev server).
4. On the iPhone: **Settings → Privacy & Security → Developer Mode** → on.
5. Connect the phone, select it in Xcode, press **⌘R**.
6. First launch: **Settings → General → VPN & Device Management →** trust your Apple ID.

With a free Apple ID the app must be reinstalled from Xcode every **7 days**. Your data stays, but export a backup regularly anyway.

## Tests

```bash
npm test          # Jest; runs in America/Los_Angeles to catch time-zone bugs
npx tsc --noEmit  # type-check
npx expo-doctor   # Expo project health
```

Tests cover date handling (including DST), cycle/phase/fertility predictions, and backup encryption and validation (wrong passwords, tampered files, malformed or malicious restore data).

## Project layout

```
App.tsx                     App shell: database start-up, onboarding, App Lock
src/
  screens/                  Home, Daily Log, Routines, Insights, Profile, Settings, Onboarding
  navigation/               Bottom tabs and Profile stack
  components/               UI pieces, lock screen, ritual timer
  engine/                   Cycle, phase and fertility logic; notification scheduling
  db/                       SQLite schema, settings and repositories
  backup/                   Encrypted export/restore: crypto, validation, file handling, UI flows
  security/                 App Lock and file protection helpers
  hooks/                    Data hooks used by screens
  utils/date.ts             Local-calendar date helpers (never parse dates as UTC)
  constants/                Theme, phases, mood/symptom options
modules/aura-security/      Local native module (Swift): Data Protection, backup exclusion, PBKDF2
plugins/                    Expo config plugin (CocoaPods deployment target)
```

`ios/` is generated by `npx expo prebuild` and is not committed. Change native settings in `app.json` or a config plugin, not in `ios/` directly, because regenerating with `--clean` replaces the folder (including Xcode signing settings).

## Notes

- Dates are stored as local `YYYY-MM-DD` strings. Use the helpers in `src/utils/date.ts`, never `new Date('YYYY-MM-DD')` or `toISOString()`, which shift the day in US time zones.
- `npm audit` reports advisories in build-time tooling (Metro, Jest, Expo CLI). None of the flagged packages are included in the app bundle.
- Aura shows estimates based on logged data and is not medical advice.
