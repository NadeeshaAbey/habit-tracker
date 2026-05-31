# Store Assets Checklist

Work through this before running `eas submit`.

---

## App identity (already in `app.json`)

| Field | Value |
|---|---|
| Display name | Habit Tracker |
| Bundle ID / Package | `com.nadeeshaabey.habittracker` — **change if already taken** |
| Version | 1.0.0 |
| Build / Version code | 1 (auto-increments on each production build via `autoIncrement: true`) |

---

## Icon & splash (your task)

> The app currently ships with the Expo template icon. Replace these before the production build.

| File | Spec |
|---|---|
| `assets/images/icon.png` | 1024 × 1024 px, PNG, no transparency, no rounded corners (stores add them) |
| `assets/images/splash-icon.png` | Your logo centered, any size — Expo resizes it to `imageWidth: 76` on Android |
| `assets/images/android-icon-foreground.png` | 108 × 108 dp safe zone (432 × 432 px @4x), PNG with transparency |
| Adaptive icon background | Already set to `#fafaf7` in `app.json` |
| `assets/images/favicon.png` | 48 × 48 px (for web/PWA) |

---

## Google Play Store

### Account setup (one-time)
- [ ] Create a [Google Play Console](https://play.google.com/console) account — $25 one-time fee
- [ ] Accept the Developer Distribution Agreement
- [ ] Complete the payments profile

### App listing
- [ ] **Short description** (≤ 80 chars)
  > e.g. "Track daily habits, build streaks, stay consistent — 100% offline."
- [ ] **Full description** (≤ 4000 chars) — expand the short description with feature details
- [ ] **App category** → Health & Fitness
- [ ] **Tags** → habit tracker, daily habits, streak, offline, productivity

### Graphics
- [ ] **Icon** — 512 × 512 px PNG (Play generates this from the adaptive icon, but you can supply a separate one)
- [ ] **Feature graphic** — 1024 × 500 px PNG/JPG (shown at top of listing)
- [ ] **Phone screenshots** — 2–8 images, 16:9 or 9:16 (use `screenshots/` folder as source, frame in a device mockup)
  - [ ] Today screen
  - [ ] Calendar / heatmap
  - [ ] Insights
  - [ ] Habit detail
  - [ ] Settings

### Compliance
- [ ] **Privacy policy URL** — host `PRIVACY.md` and paste the URL here:
  `https://github.com/NadeeshaAbey/habit-tracker/blob/main/PRIVACY.md`
  (or set up GitHub Pages for a cleaner URL)
- [ ] **Data Safety form**
  - Does your app collect or share any of the required data types? → **No**
  - Does your app encrypt data in transit? → N/A (no network traffic)
  - Does your app provide a way to delete data? → **Yes** (Settings → Reset all data)
- [ ] **Content rating questionnaire** → select "Utilities / Productivity", answer all questions → expect **Everyone / PEGI 3**
- [ ] **Target audience** → 13+ (no child-directed content)

### Build & submit
```bash
# One-time setup (needs Expo account)
npx eas login
npx eas init

# Preview APK (test on device before submitting)
npx eas build --profile preview --platform android

# Production AAB (upload to Play Console)
npx eas build --profile production --platform android

# Optional: automated submission
npx eas submit --platform android
```

---

## Apple App Store

### Account setup (one-time)
- [ ] Enrol in the [Apple Developer Program](https://developer.apple.com/programs/) — $99/year
- [ ] Create an app record in [App Store Connect](https://appstoreconnect.apple.com)
  - Bundle ID: `com.nadeeshaabey.habittracker`
  - SKU: `habittracker-ios`

### App listing
- [ ] **Name** (≤ 30 chars) → "Habit Tracker"
- [ ] **Subtitle** (≤ 30 chars)
  > e.g. "Build streaks. Stay consistent."
- [ ] **Description** (≤ 4000 chars)
- [ ] **Keywords** (≤ 100 chars) → "habit,streak,tracker,daily,offline,routine"
- [ ] **Category** → Health & Fitness (primary)
- [ ] **Support URL** → your GitHub repo or issues page
- [ ] **Privacy policy URL** → same URL as above

### Screenshots (required sizes)
- [ ] **6.7" iPhone** (iPhone 14 Pro Max / 15 Plus) — 1290 × 2796 px — minimum 3 required
- [ ] **6.5" iPhone** (iPhone 11 Pro Max / 12 Pro Max) — 1242 × 2688 px
- [ ] **5.5" iPhone** (iPhone 8 Plus) — 1242 × 2208 px
- [ ] **12.9" iPad Pro** — 2048 × 2732 px (required if `supportsTablet: true`)

### App Privacy (Data Safety equivalent)
- [ ] **Data Not Collected** — select this in the App Privacy section of App Store Connect
  (confirms no data is linked to the user or used to track them)

### Export compliance
- Already handled in `app.json`: `ITSAppUsesNonExemptEncryption: false`
- This means you select "No" on the export compliance question every time you submit

### Build & submit
```bash
# Production IPA (requires Apple Developer account credentials)
npx eas build --profile production --platform ios

# Optional: automated submission
npx eas submit --platform ios
```

---

## Version bump process (future updates)

1. Edit `app.json` → increment `version` (e.g. `1.0.1`) and `ios.buildNumber`
2. `android.versionCode` auto-increments via `eas.json` `autoIncrement: true`
3. Run `eas build --profile production --platform <android|ios>`
4. Upload build to Play Console / App Store Connect
5. Write release notes

---

## Notes

- The `eas.json` `production` profile uses `autoIncrement: true` — EAS will bump `versionCode` (Android) and `buildNumber` (iOS) automatically each build so you never have to remember.
- The privacy policy URL in the in-app Settings screen is hardcoded in `app/(tabs)/settings.tsx`. Update it if you host the policy at a custom domain.
- Screenshot framing tools: [Previewed](https://previewed.app), [AppMockUp](https://app-mockup.com), [Rottenwood](https://rottenwood.com).
