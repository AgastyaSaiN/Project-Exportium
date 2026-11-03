<div align="center">
  <h1>Exportium</h1>
  <p><strong>Your Digital Life, Reimagined Offline.</strong></p>
  
  <a href="https://github.com/AgastyaSaiN/Project-Exportium/releases/latest">
    <img src="https://img.shields.io/github/v/release/AgastyaSaiN/Project-Exportium?style=for-the-badge&color=2563eb" alt="Latest Release" />
  </a>
  <a href="https://github.com/AgastyaSaiN/Project-Exportium/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/AgastyaSaiN/Project-Exportium?style=for-the-badge&color=slate" alt="License" />
  </a>
</div>

<br />

**Exportium** is a privacy-first desktop application that allows you to visualize your social media archives (Instagram, WhatsApp, Telegram, etc.) locally on your machine. No cloud uploads, no tracking, just your memories safely preserved.

## 🚀 Features

- **Navigate long histories**: timeline scrubber, pinned date, jump buttons, search by person and date, search across all chats, resume where you stopped.
- **Photos at full size** with paging, zoom and save; voice notes, documents and files; "without media" placeholders.
- **Library**: starred messages, "on this day", links, files, insights, and export to text / CSV / printable page.
- **Remembers** your settings, who you are and your place per export; recent exports reopen in one click; drag and drop to import.

- **100% Offline**: Your data never leaves your device.
- **Universal Import**: Support for Instagram, Telegram, WhatsApp, and more.
- **Beautiful Visualization**: Turn raw JSON exports into readable, searchable chat interfaces.
- **Data Sovereignty**: You own your data. Use Exportium to browse it without platform algorithms.

## 📥 Download

Get the latest version for Windows:

> **[Download Exportium for Windows (latest release)](https://github.com/AgastyaSaiN/Project-Exportium/releases/latest)**

The installer is not code-signed yet, so Windows may show "Windows protected your PC": choose **More info → Run anyway**. See the [code signing policy](CODE_SIGNING_POLICY.md).

## 💻 Developers

If you want to contribute or build from source:

### Prerequisites
- Node.js (v18+)
- npm

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/AgastyaSaiN/Project-Exportium.git
   cd Project-Exportium
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in Development Mode**
   ```bash
   npm run electron:dev
   ```

4. **Build for Production**
   ```bash
   npm run electron:build
   ```
   *The installer will be generated in the `release/` folder.*

### Quality checks

| Command | What it does |
| --- | --- |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Unit and component tests (Vitest): parsers, media loader, viewers |
| `npm run test:e2e:desktop` | Desktop-only checks against the packaged app: reopening recents, remembered settings, the network block, the update bridge |
| `npm run test:e2e` | Builds an unpacked app, launches the real Electron executable and imports generated exports: 200k-message WhatsApp and 100k-message Telegram chats, a 40k-message Instagram archive with 1,500 photos (checks memory stays bounded while scrolling), offline and logging checks (Windows). Add `-- --no-build` to reuse the last build, `-- --big` to also open a 2.3 GB ZIP |

CI runs lint, typecheck, unit/component tests and build on every push and pull request, plus the end-to-end suite against the packaged app.

### How big exports stay fast

- **Streaming ZIPs** – archives are read lazily (only the table of contents, then one file at a time), so size is limited by disk, not memory.
- **Parsing in a Web Worker** – reading a huge chat never freezes the window.
- **Virtualized lists** – chats and photo galleries only keep what is on screen in the DOM, so 200,000 messages cost the same as 50.
- **Bounded media memory** – photos are decoded as screen-sized thumbnails, concurrent extractions are capped, and anything scrolled away is freed (originals open on demand).

### Troubleshooting

The app writes a log to `%APPDATA%/Exportium/logs/main.log` (crashes, renderer errors, auto-update). Include it when reporting a bug.

See [RELEASING.md](RELEASING.md) for how to publish a release, and [RELEASE_NOTES_0.0.6.md](RELEASE_NOTES_0.0.6.md) for what is new.

### Code signing

The installer is not signed yet, so Windows SmartScreen shows a warning on first install. Free signing through SignPath is being set up; see [CODE_SIGNING_POLICY.md](CODE_SIGNING_POLICY.md) and the signing section of [RELEASING.md](RELEASING.md).

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
