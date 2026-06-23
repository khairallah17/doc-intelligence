# Lexicon — Document Intelligence

A production-grade UI for a Document Intelligence Assistant: upload PDFs, hold an AI-powered conversation with them, and verify every answer with inline source citations.

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **lucide-react**.

## Getting started

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

## Scripts

| Command         | Purpose                          |
| --------------- | -------------------------------- |
| `npm run dev`   | Start the dev server             |
| `npm run build` | Production build                 |
| `npm start`     | Run the production build         |
| `npm run lint`  | Lint with `eslint-config-next`   |

## Routes

| Path                  | What it is                                                     |
| --------------------- | -------------------------------------------------------------- |
| `/`                   | **Library** — upload zone, search, filter, document grid       |
| `/chat?doc=<id>`      | **Chat** — sidebar, streaming reply, citation drawer           |

`doc` is a query param so the chat view is shareable and bookmark-friendly.

## Project structure

```
app/
  layout.tsx           # fonts, metadata, root shell
  globals.css          # design tokens, grain, hairlines, animations
  page.tsx             # Library page
  chat/page.tsx        # Chat page (Suspense + useSearchParams)
components/
  top-bar.tsx
  library/
    upload-zone.tsx
    upload-row.tsx
    doc-card.tsx
    status-badge.tsx
    empty-state.tsx
  chat/
    chat-sidebar.tsx
    doc-header.tsx
    thread-intro.tsx
    message.tsx
    streaming-message.tsx
    citation-pill.tsx
    citation-drawer.tsx
    composer.tsx
    assistant-avatar.tsx
lib/
  mock-data.ts         # documents, passages, seed thread, streaming reply
  types.ts             # shared TS types
  utils.ts             # highlight splitter, time formatter
```

## Design system

- **Typography**: Instrument Serif (display) · IBM Plex Sans (body) · JetBrains Mono (citations & metadata) — loaded via `next/font/google`.
- **Palette**: near-black `#0a0a0c` surfaces, ink/fog ramps for text, iris `#7c89ff` reserved for active states and the citation experience.
- **Borders**: hairline `0.5px` at low opacity (`.hairline`), depth from contrast rather than weight.
- **Texture**: a fixed grain overlay (`body::before`) and a soft top-of-page glow (`body::after`).

## Mocked behavior

There are no API calls — everything is simulated in client state so the UI is fully interactive:

- **Upload pipeline**: clicking _Upload PDF_ or dropping on the dropzone runs an `uploading → processing → ready` flow that ultimately inserts a new doc card.
- **Indexing progress**: any doc with `status: "processing"` ticks its progress in a `setInterval` and flips to `ready` at 100%.
- **Streaming reply**: sending a chat message kicks a `setInterval` that appends 1–3 tokens at a time, then commits the final message with citations.
- **Citation drawer**: clicking any citation pill slides the drawer in from the right with the exact passage highlighted via a `<mark>` styled with `.passage-mark`.

To wire this up to a real backend, replace the mock data and the simulation effects with calls to your API and stream tokens from the server (e.g. via the Vercel AI SDK or a server-sent event endpoint).

## Notes

- All interactive logic lives in client components (`"use client"`). The top-level `layout.tsx` is a server component so font loading and metadata work the standard Next.js way.
- The chat page uses `useSearchParams`, so it is wrapped in `<Suspense>` per Next.js 14 requirements.
- Icons are tree-shaken from `lucide-react`.
