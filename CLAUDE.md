# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

LUNA — menstrual cycle & wellness tracker, built as a Telegram Mini App for one user (the owner's wife). The full product spec (originally "LUNA Master Technical Specification v1.0") targets React + FastAPI + PostgreSQL + Telegram bot; the owner explicitly dropped the **AI assistant** and requires the UI to **visually match the reference mockup** (lavender/plum glassmorphism, 10 phone screens). The AI tab from the mockup was replaced by **Статьи** (articles); insights live under Аналитика.

Current stage: **live** — deployed on the owner's CapRover as one app (site + API + bot @luna_tracker_bot + reminders). Russian only. The app is **local-first**: localStorage is the source of truth, Telegram CloudStorage holds a backup, and the server only receives a copy for reminders/partner hints. Telegram SDK is loaded in `index.html`; `src/app/telegram.ts` does UI setup inside Telegram and is a no-op in a plain browser. Analytics charts are bar charts (`components/LengthBars.tsx`) at the owner's request, not line charts.

The user communicates in Russian; UI text is Russian.

## Commands

```bash
npm run dev                 # Vite dev server on :5173, also exposed on LAN (--host) for phone testing
npm test                    # vitest run (all tests)
npx vitest run src/features/cycle/engine.test.ts   # single file
npx vitest run -t "задержка"                         # single test by name
npm run typecheck           # tsc --noEmit
npm run build               # tsc -b && vite build → dist/

# server (Python 3.12, venv in server/.venv — create: python -m venv server/.venv && server/.venv/Scripts/pip install -r server/requirements-dev.txt)
cd server && .venv/Scripts/python -m pytest -q          # server tests (never touch the real bot)
# local run WITHOUT the real bot (otherwise it polls with the token from .env and competes with production):
LUNA_NO_DOTENV=1 DATA_DIR=/tmp/luna STATIC_DIR=../dist .venv/Scripts/python -m uvicorn app.main:app --port 8077
```

In PowerShell `$env:X=''` *deletes* the variable — use `LUNA_NO_DOTENV=1`, not an empty `BOT_TOKEN`, to keep the bot off locally.

No linter is configured; `tsc` with `strict`, `noUnusedLocals`, `noUnusedParameters` is the check. Path alias `@/` → `src/`.

## Architecture

**Data layer.** `src/store/useLunaStore.ts` (Zustand + `persist` to localStorage, key `luna-store-v1`) is the *only* place data is read/written. Screens call its actions (`setPeriodDay`, `saveLog`, `completeOnboarding`, …), never localStorage directly. Side channels subscribe to the store: `features/backup/autoBackup.ts` (Telegram CloudStorage) and `features/sync/server.ts` (POST `/api/sync`), both debounced and only inside Telegram. `seedDemo()` builds demo history (dev-only button in Profile, gated by `import.meta.env.DEV`).

**Server (`server/app`)** — FastAPI + aiogram 3 in one process, SQLite at `$DATA_DIR/luna.db` (`/data`, a CapRover persistent directory). It serves `dist/` as static files too. Auth = Telegram `initData` HMAC (`auth.py`, header `Authorization: tma <initData>`). Access: `ADMIN_ID` (always allowed), `ALLOWED_USER_IDS` env, plus users the admin approves via inline buttons the bot sends on first contact (from `/start` or the first `/api/me`); a block (`denied`) overrides the env list, decisions can be changed, and the admin's `/users` command lists everyone with toggle buttons. **The whole UI is gated** by `src/app/AccessGate.tsx` in production builds: outside Telegram → «open via bot», pending / denied screens; the last «allowed» is cached on the device so an approved user isn't locked out when the server is unreachable, but an explicit denial always wins. `import.meta.env.DEV` bypasses the gate. **The client computes the reminder plan** (`src/features/sync/plan.ts`, same engine as the calendar) and the server only schedules by those dates in the user's timezone (`reminders.py` is pure and unit-tested; `main.py` ticks every minute, `sent` table dedupes per kind/day). Partner mode: one-time invite link `t.me/<bot>?start=p_<token>`, partner gets only gentle hints (period soon / PMS / period started), `/stop` to leave. Env: `BOT_TOKEN`, `ADMIN_ID`, `ALLOWED_USER_IDS`, `WEBAPP_URL`, `DATA_DIR`, `STATIC_DIR`; locally read from the git-ignored `.env`.

**Intimacy («Близость», wife's request):** `intimacy: Record<DateKey, IntimacyLog>` in the store — one entry per day: `sex`, `protection` (`protected` / `unprotected` / `withdrawal`), `orgasm`, `pain` (painful sex — clinically relevant), `libido` (can be logged without sex). Pure helpers in `features/intimacy/intimacy.ts` (`normalizeIntimacy` strips details when `sex` is false; empty → entry deleted). Edited via `components/IntimacySheet.tsx` from Check-in (draft until «Сохранить») and the calendar day sheet (writes straight to the store); the calendar shows a heart, Analytics has a section, insights add `late-test` / `sex-pain` / `libido-phase`, the doctor report includes it only via an opt-in toggle. **Privacy rule:** intimacy never goes to the server or the partner (`serverSnapshot` excludes it — covered by a test); it lives on the device + the Telegram CloudStorage backup only. Kept separate from `logs` so it doesn't count toward the streak. `prefs.intimacy === false` hides the whole section (data is kept). Never label days «safe» — no contraception advice.

**Period data model:** periods are not stored as ranges. `periodDays: Record<DateKey, Flow>` holds individually marked days; `getPeriods()` in the engine groups them into periods (consecutive days, a 1-day gap allowed). Daily wellbeing is `logs: Record<DateKey, DailyLog>` (one log per local day). All dates are local `YYYY-MM-DD` strings (`DateKey`) handled via `src/utils/date.ts` — use its helpers (`addDaysKey`, `diffDays`, `todayKey`, `fmt*`, `plural`/`daysWord` for Russian plurals) rather than raw `Date` math.

**Cycle engine** (`src/features/cycle/engine.ts`) — pure functions, unit-tested in `engine.test.ts`:
- Conservative statistics per spec: median + min/max of the last 6 plausible cycles (18–50 days); falls back to profile values / 28 days with `confidence: 'low'`. No ML.
- `predict()` → cycle day, phase, next-period date with an uncertainty range, ovulation (next start − 14) and fertile window, late detection. Future-dated period marks are ignored.
- `buildDayMarks()` drives the calendar and keeps **actual vs predicted** separate (predicted marks only on today/future days). On a late period, the prediction starts from today.
- Product rule: ovulation/fertile predictions must always be labelled approximate and never presented as contraception.

**Derived views** are pure functions over store data, memoized in pages: `features/analytics/stats.ts` (range-filtered stats/chart points), `features/insights/rules.ts` (rule-based insights — each states its data basis; wording is observational, not diagnostic). `features/cycle/useCycle.ts` is the shared hook for the current prediction.

**Strings:** all UI text lives in `src/i18n/ru.ts` (accessed as `t` from `@/i18n`); option labels for moods/symptoms/etc. are keyed by the enum values in `src/types`. Structure is ready for `he` (RTL) / `en` but only `ru` exists. Article content is data in `src/content/articles.ts` (`reviewedAt: null` = not medically reviewed — keep that honest).

**Routing:** `HashRouter` (safe for static/Telegram hosting). `app/App.tsx` gates everything except `/welcome` and `/setup` behind `profile.onboarded`. `AppLayout tabs` renders the bottom nav (Главная · Календарь · Аналитика · Статьи · Профиль); check-in and profile subpages use the layout without tabs; `/success` and `/welcome` are full-bleed.

**Theming:** light + dark («лунная ночь»). Palette colors (`ink`, `plum`, `rose`, `sky`, `amber`, `emerald`, `surface`, `edge`, `sheet`) are CSS variables defined in `src/styles/index.css` for `:root` and `:root[data-theme='dark']` — never hardcode `bg-white`/hex for themed surfaces; use `bg-surface`, `border-edge`, etc. `brand-*` is the fixed purple for solid buttons/active chips with white text and for always-dark screens (Welcome, Success). Theme resolution/sync (pref → Telegram `colorScheme` → system) is in `src/app/theme.ts`; check both themes when changing visuals.

**Design system:** tokens in `tailwind.config.js` (`plum`, `rose`, `sky`, `amber`, `ink` scales, `shadow-card`, animations) and component classes in `src/styles/index.css` (`.app-bg`, `.glass`, `.glass-strong`, `.tap`). Shared primitives are in `src/components/ui/index.tsx` (Card, Button, Toggle, Chip, Segmented, ProgressRing, Sheet, ListRow, IconTile, EmptyState, Toast). Match the reference mockup when changing visuals.

**Feedback & motion:** use `haptic.*` / `sound.*` from `src/utils/feedback.ts` (Telegram HapticFeedback → `navigator.vibrate` fallback; sounds are synthesized with Web Audio, no files), gated by `prefs` in the store (toggles in Profile). Base UI primitives already fire haptics — don't double up. Animations must respect `prefers-reduced-motion` (global CSS rule + `utils/motion.ts`). After editing `tailwind.config.js`, restart the dev server — new keyframes aren't picked up by HMR.

**Illustrations:** prompts for every planned image are in `docs/art-prompts.md` (file names there are the contract). Generated art comes on a solid green background (🟩) — cut it with `python scripts/chroma_key.py in.png public/art/name.webp --max 768` (auto key color, edge unmixing, despill, crop, WebP); always preview the result on both dark and light backgrounds. The success lotus comes on black (⬛). Glows/sparkles are added in code, not baked into keyed images. `MoonPhase` (home ring) is computed SVG, not an image. Real images live in `public/art/*.webp` (sources in `art/source/`, never in `public/` — they would ship in the build); `src/components/art` wraps them (`LotusArt`, `FlowerArt`, `Illustration name=moon|seedling|hello`) next to code-drawn art (`MoonPhase`, `StarField`, `SparkleBurst`, `Avatar`). The black-background lotus is converted to alpha (luminance → alpha), not blended — `mix-blend-mode` breaks inside animated/transformed parents. App icons: `public/icon-512.png`, `apple-touch-icon.png`, `favicon-64.png`; BotFather images in `docs/telegram/`. Article covers are optional and not generated yet.

**Profile photo:** `features/profile/avatar.ts` — custom photo (`profile.photo`, 256px JPEG data URL) → Telegram `initDataUnsafe.user.photo_url` (if `profile.useTelegramPhoto !== false`) → initial letter. The Telegram URL is read per session, never stored.

**Home screen shortcut — disabled.** `features/profile/homeScreen.ts` (`HOME_SCREEN_ENABLED = false`, owner's request): Telegram `addToHomeScreen` + fallback help sheet + `public/add/` install page. With the flag off the hook reports `unsupported`, so the Home tip and Profile row don't render. Flip the flag to bring it back.

## Deploy

One CapRover app `luna-mini-app` (created with persistent data) at https://luna-mini-app.2.28.66.82.nip.io: `captain-definition` → `Dockerfile` (node stage: npm ci → `npm test` → build; python stage: pip → `pytest` → uvicorn on :80 serving `dist` + API + bot). Cache headers are set in `main.py` (`index.html` no-cache, `/assets` immutable, `/api` no-store). CapRover pulls `main` via a GitHub webhook, so every push to `main` redeploys — any failing test (JS or Python) blocks the deploy. Only one bot instance may poll at a time: never run the server locally with the real token while production is up. Setup steps (BotFather, CapRover env vars, persistent dir `/data`, Mini App linking) are in `docs/telegram/README.md`.

## Git workflow

Repo: https://github.com/pulsestepdev-cpu/mini_app_luna (branch `main`). The owner has given standing permission: **commit and push to `main` yourself, without asking**, after each finished piece of work — a push to `main` is also the production deploy, and that is fine. Publishing other things to GitHub (branches, tags, releases, issues via `gh`) is allowed too. Before committing, run `npm run typecheck` and `npm test` (and `npm run build` for larger changes); don't push a broken build. Write commit messages in English, short imperative subject + a body listing the notable changes. Never commit secrets (`.env*` is ignored) or build output.

## Tools & autonomy

The owner has given **full access to this PC and the internet**: use anything that helps — web search/fetch, installing npm/pip packages, CLI tools and programs on this PC, headless Chrome (playwright-core from the scratchpad) for visual checks, generating assets. Prefer doing things yourself over asking. **Subagents are allowed** whenever they help — e.g. to run tests, do visual/regression checks, review a diff or research something in parallel. If something is genuinely missing (an account, API key/bot token, paid service, a program that needs a GUI install or registration), tell the owner exactly what to install/register and why — they will do it.
