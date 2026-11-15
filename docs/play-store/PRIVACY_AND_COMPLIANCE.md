# Kingdom Chess — Privacy Policy, Data Safety, Content Rating & Monetization Audit

All disclosures below are derived strictly from inspecting the current **Kingdom Chess** (`com.kingdomchess.game`) source code and Android manifest.

---

## 1. Codebase Privacy & SDK Audit Summary

| Check | Status in Current Codebase | Details |
| --- | --- | --- |
| **User Accounts / Login** | None | No sign-in, registration, or user profile endpoints exist |
| **Analytics / Tracking SDKs** | None | No Firebase Analytics, Google Analytics, Mixpanel, or telemetry SDKs |
| **Crash Reporting SDKs** | None | No Sentry, Crashlytics, or Bugsnag |
| **Advertising SDKs** | None | No AdMob, Unity Ads, AppLovin, or Ad ID permissions (`AD_ID`) |
| **In-App Purchases / Billing** | None | No Google Play Billing library or paid unlock logic |
| **Local Storage** | Yes (device-only) | `window.localStorage` (`kingdom-chess-settings-v2`) stores user preferences (mode, AI difficulty, kingdom set, timer choice, sound/music toggles, quality) locally on device |
| **Network Permission** | `android.permission.INTERNET` | Used in `index.html` to load Google Fonts (`Cinzel`, `JetBrains Mono`, `Plus Jakarta Sans`). Gameplay, chess engine, AI web worker, 3D rendering, and procedural audio run completely locally on the device. |

---

## 2. Privacy Policy Preparation (Google Play Console)

Google Play Console requires a **publicly accessible Privacy Policy URL** (HTTPS web page) before publishing to production. **Do not invent or enter a fake URL.**

### Steps for the Developer
1. Host a simple static Privacy Policy page on your real domain, GitHub Pages, or official support site (e.g., `https://yourdomain.com/kingdom-chess-privacy`).
2. Ensure the hosted page accurately matches the current build:
   - **App Name / Package**: Kingdom Chess (`com.kingdomchess.game`)
   - **Personal Data Collection**: Kingdom Chess does not collect, sell, or share personal information, user accounts, location data, contacts, or device advertising identifiers.
   - **Local Preferences**: Game settings (selected Kingdom set, sound/music preferences, graphics quality, and match preferences) are stored locally on your device via browser/WebView local storage and Android app backup (`android:allowBackup="true"`). Uninstalling the app removes local storage.
   - **Network Requests**: The app requests typography stylesheets from Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`) when online and otherwise runs chess gameplay, AI, and audio offline on your device.
   - **Contact**: Provide a valid support email address (for Play Console Store Listing + Privacy Policy contact).
3. Paste your live hosted URL into **Play Console → Policy → App content → Privacy policy**.

---

## 3. Data Safety Form Preparation (Google Play Console)

Based on the audited codebase (`src/` and `android/app/src/main/AndroidManifest.xml`):

- **Does your app collect or share any of the required user data types?** → **No**
  - No account creation, no analytics, no crash-collection SDK, no ad network, no location/camera/microphone/contacts access, no cloud server upload.
- **Note on Google Fonts**: Google Fonts serves static font CSS/WOFF2 assets over HTTPS with no app user-tracking SDK; if you want zero external requests at all in a future update, self-hosting the three font families locally inside `public/fonts/` removes the external stylesheet link completely.

---

## 4. Content Rating Questionnaire Guidance (IARC)

Answer the Play Console Content Rating questionnaire honestly based on actual in-game content:

- **Category**: Game (Strategy / Board Game)
- **Violence**:
  - Contains **fantasy combat animations** during chess piece captures (sword, axe, hammer, spear, bow, and magic duels between fantasy chess characters).
  - Contains **subtle blood effects** on lethal capture (small dark-crimson ground blood droplets and a short-lived board stain beneath the fallen piece) and short dark-fantasy **death vocalizations** (groans/gasps).
  - Contains **no gore, dismemberment, or realistic modern/human violence**, and defeated pieces fade cleanly from the board.
- **Sexuality / Nudity**: None
- **Language / Profanity**: None
- **Controlled Substances**: None
- **Gambling / Simulated Gambling**: None
- **User-Generated Content / Online Chat**: None (offline local 1v1 and AI only)
- **Shares User Location / Purchases Digital Goods**: No

---

## 5. Ads & In-App Purchases Declaration

- **Contains Ads**: **No** (no advertising SDKs or ad placements exist in the project).
- **In-App Purchases**: **No** (no Play Billing or paid transactions exist in the project).
- Do not declare ads or IAPs unless you intentionally integrate them in a future version.
