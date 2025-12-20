# Implementation Plan - Phase 2: "Premium Experience"

## Goal Description
Transform Exportium from a "Functional MVP" (v0.0.5) to a "Premium Product" (v0.1.0). This involves building a marketing website and upgrading the Desktop App's UI to a high-end, glassmorphic aesthetic.

## Phase 2A: The Marketing Website
**Objective**: A high-conversion landing page to drive downloads.
- [ ] **Tech Stack**: React + Vite + Tailwind CSS + Framer Motion.
- [ ] **Hero Section**: 3D/Tilted App Screenshot + "Download" CTA.
- [ ] **Features Grid**: Privacy, Offline, Universal Support.
- [ ] **Deployment**: Public URL (Vercel/Netlify).

## Phase 2B: Desktop App UI Polish
**Objective**: Make the app feel "expensive" and fluid.
- [ ] **Custom Title Bar v2**: Re-attempt the glass/overlay title bar (correctly this time).
- [ ] **Transitions**: Page transition animations between Dashboard and App View.
- [ ] **Typography**: Switch to `Geist Sans` or `Inter` for a crisper look.
- [ ] **Dark Mode**: Deepen the blacks (OLED friendly) and add glowing accents.

## Phase 2C: Core Functionality (Data Parsing)
**Objective**: Actually parse the uploaded files.
- [ ] **Instagram Parser**: Read `messages.json` and render chat view.
- [ ] **WhatsApp Parser**: Read `_chat.txt` exports.
- [ ] **Local Database**: Use `SQLite` or `PouchDB` to store parsed index (locally).

## Verification Plan
1.  **Website**: Public link works, Download button starts `.exe` download.
2.  **App UI**: Window dragging works smoothly with new custom bar.
3.  **Functionality**: Dragging a sample JSON file renders a chat list.
