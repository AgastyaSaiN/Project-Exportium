# Releasing Exportium

Installed copies of the app update themselves from GitHub Releases. Pushing commits does **not** update
anyone; only a published release does.

## Before tagging
1. `npm run lint && npm run typecheck && npm test` all pass.
2. `npm run test:e2e` passes on Windows (add `-- --big` once for the 2.3 GB ZIP check).
3. Open your own real exports (WhatsApp, Instagram, Telegram, Snapchat) in `npm run electron:dev` and scroll, search, star, open a photo.
4. `package.json` version is the number you are about to tag (the tag `v0.0.6` must match version `0.0.6`).

## Pre-release first (recommended)
Set `package.json` version to `0.0.6-beta.1` (the installer and update metadata take their version from it), then:
```bash
git tag v0.0.6-beta.1
git push origin v0.0.6-beta.1
```
The workflow publishes it as a **pre-release**. Installed apps ignore pre-releases. Download the installer from the
release page and test it on a spare PC: install, import an export, restart.

## The real release
Set `package.json` version back to `0.0.6`, then:
```bash
git tag v0.0.6
git push origin v0.0.6
```
1. Wait for the **Build/Release** run to finish.
2. Open GitHub → Releases. electron-builder creates the release as a **draft**: edit the notes (paste from `RELEASE_NOTES_0.0.6.md`) and press **Publish release**. Installed apps cannot see a draft.
3. On a machine with the previous version installed, open the app. It downloads in the background and shows "Restart to update"; or check **Home → Check for updates**.
4. The log (`%APPDATA%/Exportium/logs/main.log`, or **Home → Open log folder**) shows "Update available" / "Update downloaded".

## If something is wrong
Delete or un-publish the release (installed apps stop seeing it) and publish a fixed version with a higher number.
Older installers stay on the release page for manual rollback.

## Signing
Unsigned installers show a Windows SmartScreen warning. The plan is free signing through SignPath Foundation
(see `CODE_SIGNING_POLICY.md`). SignPath wants a release that already exists in the form to be signed, so:

1. Publish 0.0.6 unsigned (the notes tell people to choose More info → Run anyway).
2. Apply at <https://signpath.org> (GitHub two-factor login on; link the repository, the policy page and the release).
3. Once approved, SignPath gives an organisation id, a project and signing-policy slug, and an API token. Add the token
   as the repository secret `SIGNPATH_API_TOKEN`.
4. Change `.github/workflows/release.yml` so the build uploads the installer as an artifact, the SignPath action signs it
   (with manual approval), and the update file `latest.yml` is rewritten with the signed installer's `sha512` and `size`
   before the release is published. Signing changes the file, so without that step installed apps reject the update.
5. Update `CODE_SIGNING_POLICY.md` from "applied for" to active, then publish a release and check the installer's
   Properties → Digital Signatures tab.

A purchased certificate would not use plain `CSC_LINK` / `CSC_KEY_PASSWORD` secrets: new certificates are issued on a
hardware token or cloud signing service, so the workflow would differ by seller.
