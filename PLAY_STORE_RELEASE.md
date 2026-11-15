# Kingdom Chess — Google Play Store Release & Update Guide

## 1. Permanent App Identity

| Field | Value | Rule |
| --- | --- | --- |
| **App Name** | `Kingdom Chess` | Set in `capacitor.config.ts` and `android/app/src/main/res/values/strings.xml` |
| **Application ID** | `com.kingdomchess.game` | **NEVER CHANGE.** Must stay identical for every future Play Store update. |
| **Initial Release** | `versionName = "1.0.0"`, `versionCode = 1` | Configured in `android/gradle.properties` |
| **Android SDK** | `minSdkVersion = 24`, `compileSdk = 36`, `targetSdkVersion = 36` | Configured in `android/variables.gradle` |

---

## 2. Single-Source Version Management System

`android/gradle.properties` is the single source of truth for versioning:

```properties
VERSION_CODE=1
VERSION_NAME=1.0.0
```

How versioning propagates automatically:
1. **Android Gradle (`android/app/build.gradle`)** reads `VERSION_CODE` and `VERSION_NAME` from `android/gradle.properties` (or `ANDROID_VERSION_CODE` / `ANDROID_VERSION_NAME` overrides in CI).
2. **Vite Production Build (`vite.config.ts`)** reads the exact same `VERSION_NAME` and `VERSION_CODE` from `android/gradle.properties` (or CI env overrides) and injects them at build time.
3. **In-Game About Section (`SettingsModal.tsx` & `src/utils/appVersion.ts`)** reads the live Android installed package info via `@capacitor/app` (`App.getInfo()`) on native Android devices, with the Vite build value as immediate fallback. When the release is bumped to `1.0.1` (`versionCode = 2`), **Settings → About** automatically displays `Version 1.0.1 (Build 2)` without maintaining a second hardcoded UI version.

### Version Progression Reference

| Release Type | `VERSION_NAME` | `VERSION_CODE` |
| --- | --- | --- |
| Initial Play Store Release | `1.0.0` | `1` |
| Bugfix / Patch Update | `1.0.1` | `2` |
| Second Patch Update | `1.0.2` | `3` |
| Feature Update | `1.1.0` | `4` |
| Major Release | `2.0.0` | `5` |

**Play Store Versioning Rules:**
- `VERSION_CODE` must be an integer that strictly increases on every Play Console upload.
- Never reuse or decrease an old `VERSION_CODE`.
- Never change `applicationId` (`com.kingdomchess.game`).

---

## 3. Permanent Production Signing Key & Google Play App Signing

Play Store production builds require **one permanent private Upload Keystore** — **never** the Android debug key, and **never** a newly generated keystore per update.

### How Google Play App Signing Works Here
1. You generate **one** permanent upload keystore (`kingdom-chess-upload.jks`) locally in a secure private location outside the git repository.
2. Every release AAB (`app-release.aab`) is signed with that **same permanent upload keystore**.
3. You upload `app-release.aab` to Google Play Console.
4. Google Play App Signing verifies your upload signature against that permanent upload key and signs the distributed APKs delivered to players.

### Generate Your Permanent Upload Keystore (Once Only)

Run locally on a secure machine (with Java `keytool` installed), storing the `.jks` file **outside** the repository (e.g., `~/secure-keys/kingdom-chess-upload.jks`):

```bash
keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keystore ~/secure-keys/kingdom-chess-upload.jks \
  -alias kingdomchess \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

> **CRITICAL KEY BACKUP WARNING**
> - **Back up your upload keystore (`.jks`) and passwords immediately** in multiple encrypted, offline/secure locations (e.g., encrypted hardware vault / password manager).
> - **NEVER commit** `.jks`, `.keystore`, `.p12`, `.pfx`, `.pem`, `.key`, `keystore.properties`, or passwords to GitHub or any public storage.
> - **NEVER lose the keystore**: losing your permanent upload key prevents signing future updates under the same upload identity and requires a Play Console Upload Key Reset.
> - Both `.gitignore` and `android/.gitignore` explicitly ignore all keystore, certificate, and `keystore.properties` files.

---

## 4. GitHub Actions Secure Release Build

The automated workflow at `.github/workflows/android-play-release.yml` builds and signs the production `.aab` on push of `v*` tags or manual `workflow_dispatch`.

### Required GitHub Repository / Environment Secrets

Add these four secrets in **GitHub → Settings → Secrets and variables → Actions** (never put real values in source files or logs):

| Secret Name | Value |
| --- | --- |
| `KEYSTORE_BASE64` | Base64-encoded contents of your permanent `.jks` file |
| `KEYSTORE_PASSWORD` | Password for the `.jks` keystore |
| `KEY_ALIAS` | Key alias inside the keystore (e.g., `kingdomchess`) |
| `KEY_PASSWORD` | Password for the key alias |

*(Note: The workflow also accepts legacy `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` names if already configured.)*

To encode your `.jks` to base64 cleanly on macOS/Linux without line breaks:

```bash
base64 -w 0 ~/secure-keys/kingdom-chess-upload.jks > keystore.b64
# Copy contents of keystore.b64 into the KEYSTORE_BASE64 secret, then delete keystore.b64
rm -f keystore.b64
```

### What the Workflow Does
1. Checks out the repository and sets up Node.js 22 & Java 21 + Android SDK.
2. Builds the React/Three.js production bundle (`npx tsc --noEmit && npm run build`).
3. Runs `npx cap sync android`.
4. Decodes `KEYSTORE_BASE64` into `$RUNNER_TEMP/kingdom-chess-release.jks` (`chmod 600`, path masked in logs).
5. Runs `./gradlew bundleRelease --no-daemon` using `signingConfigs.release`.
6. Verifies the `.aab` is validly signed and rejects any accidental Android Debug certificate.
7. Uploads `android/app/build/outputs/bundle/release/app-release.aab` as the `kingdom-chess-play-release-aab` workflow artifact.
8. Deletes the temporary keystore file in `always()`.

---

## 5. Local Signed Release AAB Build (Optional)

If building locally with Java 21 + Android SDK installed:

1. Copy `android/keystore.properties.example` to `android/keystore.properties` (git-ignored) and fill in your local path, alias, and passwords, **or** export `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD`.
2. Build web assets, sync Capacitor, and generate the signed AAB:

```bash
npm install
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
```

Output AAB path:
`android/app/build/outputs/bundle/release/app-release.aab`

*(Note: `android/app/build.gradle` intentionally fails `bundleRelease` if no valid release signing config is supplied so unsigned or debug-signed release bundles cannot be produced silently.)*

---

## 6. Uploading to Google Play Console & Future Update Procedure

### First Release (`1.0.0` / `versionCode 1`)
1. Download `app-release.aab` from the GitHub Actions artifact (`kingdom-chess-play-release-aab`) or local `android/app/build/outputs/bundle/release/app-release.aab`.
2. In Google Play Console, create the app (**Kingdom Chess**), opt into **Google Play App Signing** (recommended default), and upload `app-release.aab` to **Internal Testing → Closed Testing → Production**.
3. Complete Store Listing, App Icon, Screenshots, Feature Graphic, Privacy Policy URL, Data Safety, Content Rating, and Ads declarations using `docs/play-store/STORE_LISTING.md` and `docs/play-store/PRIVACY_AND_COMPLIANCE.md`.

### Future Update Workflow (`1.0.1` / `versionCode 2`, etc.)
1. Keep `applicationId` unchanged (`com.kingdomchess.game`).
2. Increment `VERSION_CODE` by `+1` and update `VERSION_NAME` in `android/gradle.properties` (e.g., `VERSION_CODE=2`, `VERSION_NAME=1.0.1`).
3. Commit and push your update (or push tag `v1.0.1`).
4. GitHub Actions builds and signs the new `app-release.aab` using the **same permanent upload keystore**.
5. Upload the new `app-release.aab` to Google Play Console.
6. Players updating via Play Store retain their saved settings (`localStorage` + `android:allowBackup="true"`).
