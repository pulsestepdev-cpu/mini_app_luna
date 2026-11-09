# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

LUNA — menstrual cycle & wellness tracker, built as a Telegram Mini App for one user (the owner's wife). The full product spec (originally "LUNA Master Technical Specification v1.0") targets React + FastAPI + PostgreSQL + Telegram bot; the owner explicitly dropped the **AI assistant** and requires the UI to **visually match the reference mockup** (lavender/plum glassmorphism, 10 phone screens). The AI tab from the mockup was replaced by **Статьи** (articles); insights live under Аналитика.

Current stage: **frontend-only "constructor"** — Russian only, no backend, no bot. Telegram SDK is loaded in `index.html` and `src/app/telegram.ts` only does UI setup inside Telegram (expand, header/background colors, `disableVerticalSwipes`); it is a no-op in a plain browser and there is no initData auth yet. Analytics charts are bar charts (`components/LengthBars.tsx`) at the owner's request, not line charts. Planned next: real illustrations, FastAPI backend + Telegram initData auth, aiogram bot for reminders, deploy.

The user communicates in Russian; UI text is Russian.

## Commands

```bash
npm run dev                 # Vite dev server on :5173, also exposed on LAN (--host) for phone testing
npm test                    # vitest run (all tests)
npx vitest run src/features/cycle/engine.test.ts   # single file
npx vitest run -t "задержка"                         # single test by name
npm run typecheck           # tsc --noEmit
npm run build               # tsc -b && vite build → dist/
```

No linter is configured; `tsc` with `strict`, `noUnusedLocals`, `noUnusedParameters` is the check. Path alias `@/` → `src/`.

## Architecture

**Data layer is a deliberate temporary seam.** `src/store/useLunaStore.ts` (Zustand + `persist` to localStorage, key `luna-store-v1`) is the *only* place data is read/written. Screens call its actions (`setPeriodDay`, `saveLog`, `completeOnboarding`, …), never localStorage directly — so swapping to the backend later touches only this file. `seedDemo()` builds demo history (dev-only button in Profile, gated by `import.meta.env.DEV`).

**Period data model:** periods are not stored as ranges. `periodDays: Record<DateKey, Flow>` holds individually marked days; `getPeriods()` in the engine groups them into periods (consecutive days, a 1-day gap allowed). Daily wellbeing is `logs: Record<DateKey, DailyLog>` (one log per local day). All dates are local `YYYY-MM-DD` strings (`DateKey`) handled via `src/utils/date.ts` — use its helpers (`addDaysKey`, `diffDays`, `todayKey`, `fmt*`, `plural`/`daysWord` for Russian plurals) rather than raw `Date` math.

**Cycle engine** (`src/features/cycle/engine.ts`) — pure functions, unit-tested in `engine.test.ts`:
- Conservative statistics per spec: median + min/max of the last 6 plausible cycles (18–50 days); falls back to profile values / 28 days with `confidence: 'low'`. No ML.
- `predict()` → cycle day, phase, next-period date with an uncertainty range, ovulation (next start − 14) and fertile window, late detection. Future-dated period marks are ignored.
- `buildDayMarks()` drives the calendar and keeps **actual vs predicted** separate (predicted marks only on today/future days). On a late period, the prediction starts from today.
- Product rule: ovulation/fertile predictions must always be labelled approximate and never presented as contraception.

**Derived views** are pure functions over store data, memoized in pages: `features/analytics/stats.ts` (range-filtered stats/chart points), `features/insights/rules.ts` (rule-based insights — each states its data basis; wording is observational, not diagnostic). `features/cycle/useCycle.ts` is the shared hook for the current prediction.

**Strings:** all UI text lives in `src/i18n/ru.ts` (accessed as `t` from `@/i18n`); option labels for moods/symptoms/etc. are keyed by the enum values in `src/types`. Structure is ready for `he` (RTL) / `en` but only `ru` exists. Article content is data in `src/content/articles.ts` (`reviewedAt: null` = not medically reviewed — keep that honest).

**Routing:** `HashRouter` (safe for static/Telegram hosting). `app/App.tsx` gates everything except `/welcome` and `/setup` behind `profile.onboarded`. `AppLayout tabs` renders the bottom nav (Главная · Календарь · Аналитика · Статьи · Профиль); check-in and profile subpages use the layout without tabs; `/success` and `/welcome` are full-bleed.

**Design system:** tokens in `tailwind.config.js` (`plum`, `rose`, `sky`, `amber`, `ink` scales, `shadow-card`, animations) and component classes in `src/styles/index.css` (`.app-bg`, `.glass`, `.glass-strong`, `.tap`). Shared primitives are in `src/components/ui/index.tsx` (Card, Button, Toggle, Chip, Segmented, ProgressRing, Sheet, ListRow, IconTile, EmptyState, Toast). Match the reference mockup when changing visuals.

**Feedback & motion:** use `haptic.*` / `sound.*` from `src/utils/feedback.ts` (Telegram HapticFeedback → `navigator.vibrate` fallback; sounds are synthesized with Web Audio, no files), gated by `prefs` in the store (toggles in Profile). Base UI primitives already fire haptics — don't double up. Animations must respect `prefers-reduced-motion` (global CSS rule + `utils/motion.ts`). After editing `tailwind.config.js`, restart the dev server — new keyframes aren't picked up by HMR.

**Illustrations:** prompts for every planned image are in `docs/art-prompts.md` (file names there are the contract). Generated art comes on a solid green background (🟩) — cut it with `python scripts/chroma_key.py in.png public/art/name.webp --max 768` (auto key color, edge unmixing, despill, crop, WebP); always preview the result on both dark and light backgrounds. The success lotus comes on black (⬛) and is shown with `mix-blend-mode: screen` instead of keying. Glows/sparkles are added in code, not baked into keyed images. `MoonPhase` (home ring) is computed SVG, not an image. `src/components/art` holds SVG **placeholders** (lotus, flower, star field, letter avatar) to be replaced by generated images in `public/art/`. `public/art/welcome-bg.png` is already the real (ChatGPT-generated) Welcome background.

## Git workflow

Repo: https://github.com/pulsestepdev-cpu/mini_app_luna (branch `main`). The owner has given standing permission: **commit and push to `main` yourself, without asking**, after each finished piece of work. Before committing, run `npm run typecheck` and `npm test` (and `npm run build` for larger changes); don't push a broken build. Write commit messages in English, short imperative subject + a body listing the notable changes. Never commit secrets (`.env*` is ignored) or build output.

## Tools & autonomy

The owner has given broad standing permission: use anything that helps — web search/fetch, installing npm/pip packages, CLI tools and programs on this PC, headless Chrome (playwright-core from the scratchpad) for visual checks, generating assets. Prefer doing things yourself over asking. If something is genuinely missing (an account, API key/bot token, paid service, a program that needs a GUI install or registration), tell the owner exactly what to install/register and why — they will do it.
