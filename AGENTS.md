# AGENTS.md

Guidance for Codex and other AI coding agents working in this repository.

**[CLAUDE.md](CLAUDE.md) is the single, up-to-date source of truth** — read it in full before changing anything (architecture, data model, privacy rules, deploy, git workflow). This file only repeats the rules that are expensive to get wrong, so it can't drift out of date again.

- **LUNA is live.** Telegram Mini App (React, local-first) + FastAPI server + bot @luna_tracker_bot, one CapRover app. Every push to `main` redeploys production; a failing JS or Python test blocks the deploy.
- **Before committing:** `npm run typecheck`, `npm test`, and for server changes `cd server && .venv/Scripts/python -m pytest -q`. Larger changes: also `npm run build` and `npm run check:ui` (see CLAUDE.md).
- **Never run the server locally with the real bot token** while production is up — only one bot instance may poll. Use `LUNA_NO_DOTENV=1`.
- **Data:** `src/store/useLunaStore.ts` is the only place data is read/written. Changing the persisted format → follow the `STORE_VERSION` / `migrateData` notes there.
- **Privacy:** intimacy records never leave the device and the Telegram cloud backup — never add them to the server snapshot or partner hints.
- **Medical honesty:** ovulation/fertile predictions are approximate and never contraception advice; insights are observations, not diagnoses.
- **UI:** Russian text only in `src/i18n/ru.ts`; themed colors via CSS variables; check light and dark themes.
- **Product principle:** keep the app lean — no speculative features; nothing new should add routine work for the user.
