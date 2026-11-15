# Releasing Exportium on Google Play

Android and desktop share one version number (`version` in `package.json`) but release separately:
desktop on `v*` tags, Android on `android-v*` tags.

## One-time setup

### 1. Create the upload key (once, keep it forever)

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore exportium-upload.jks -alias exportium-upload -keyalg RSA -keysize 2048 -validity 10000
```

- Choose strong passwords and **write them down in a password manager**.
- Back up `exportium-upload.jks` somewhere safe and private (not the repo, not a public drive). If you lose it you can ask Google to reset the upload key, but that takes days.
- Google Play App Signing keeps the real app-signing key; this is only the *upload* key.

### 2. Local release builds (optional)

Copy `android/keystore.properties.example` to `android/keystore.properties` (git-ignored) and fill it in. Then:

```bash
npm run android:bundle
```

The signed bundle appears at `android/app/build/outputs/bundle/release/app-release.aab`.

### 3. GitHub Actions secrets (for tagged releases)

In the repository: Settings → Secrets and variables → Actions → New repository secret.

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | the keystore as base64: `base64 -w0 exportium-upload.jks` (Git Bash) or `[Convert]::ToBase64String([IO.File]::ReadAllBytes("exportium-upload.jks"))` (PowerShell) |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_ALIAS` | `exportium-upload` |
| `ANDROID_KEY_PASSWORD` | the key password |

### 4. Privacy policy URL

Google needs a public web page. Easiest: with the repository public, use
`https://github.com/AgastyaSaiN/Project-Exportium/blob/main/android/play-store/PRIVACY_POLICY.md`
(after the branch is merged), or enable GitHub Pages. Fill in **[your contact email]** in the policy first.

### 5. Play Console (one-time)

1. Create the developer account (one-time fee). New personal accounts must run a **closed test with at least 12 testers for 14 days** before production access is granted.
2. Create the app: name **Exportium**, language, "App", "Free".
3. Fill in the store listing from `LISTING.md`; upload `icon-512.png`, `feature-graphic.png` and the screenshots.
4. Complete the App content forms (Data safety, Content rating, Target audience, Ads) using the answers in `LISTING.md`.
5. Let Google manage the app signing key (the default).

## Every release

1. Bump `version` in `package.json` and commit.
2. Tag and push:
   ```bash
   git tag android-v0.0.7
   git push origin android-v0.0.7
   ```
   The workflow checks the tag matches `package.json`, runs lint, typecheck and tests, builds the signed `.aab` and attaches it to the run.
3. Download the `.aab` from the run's **Artifacts** and upload it in Play Console → Testing → Closed testing (or Production once allowed) → Create new release. Add release notes and roll it out.

Google Play rejects a bundle whose `versionCode` it has already seen, so always bump the version before tagging. The code is derived as `major*10000 + minor*100 + patch` (0.0.7 → 7, 1.2.3 → 10203).

## Before the first submission, double-check

- Run the closed test with real people and real exports, including your biggest ones.
- Screenshots show only demo data, never real chats.
- The store text does not claim affiliation with WhatsApp, Meta, Instagram, Telegram or Snap. The listing and policy include a disclaimer. Third-party logos are not used in the icon, feature graphic or title.
