#!/usr/bin/env node
/**
 * Проверка интерфейса в настоящем браузере: все экраны открываются без ошибок
 * в режимах «Android», «iPhone» и «ПК», плюс замеры скорости и плавности.
 *
 *   npm run build && npm run check:ui            # локальная сборка dist/
 *   npm run check:ui -- --url https://…          # боевой сайт: статику берёт с сервера,
 *                                                # API подменяется — на сервер ничего не уходит
 *   npm run check:ui -- --profiles android,desktop --no-perf --out ./shots
 *
 * Профили:
 *   android  — Chrome, телефон 393×851, процессор замедлен в 4 раза и сеть «медленный 4G»
 *              (стандарт Lighthouse для средних телефонов; в Telegram на Android — Chromium WebView)
 *   iphone   — WebKit (движок Safari / WKWebView в Telegram на iOS), iPhone 13; без замедления
 *   desktop  — Chrome, окно мини-приложения Telegram Desktop (Windows: WebView2 = Chromium) + широкое окно
 *
 * Telegram SDK и API сервера подменяются, данные — демо в localStorage.
 * Нужен Google Chrome (или Edge). Для «iPhone»: npx playwright-core install webkit
 * Код выхода 1 — если на каком-то экране были ошибки (скорость только печатается).
 */
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const flag = (name) => args.includes(`--${name}`);
const OUT = path.resolve(opt('out', path.join(os.tmpdir(), 'luna-ui-check')));
const PROFILES = opt('profiles', 'android,iphone,desktop').split(',');
const PERF = !flag('no-perf');
/** Для экспериментов: дополнительный CSS поверх приложения, например --css ".glass{box-shadow:none}" */
const EXTRA_CSS = opt('css', '');

/** Экраны: адрес и текст, по которому понятно, что экран отрисовался */
const ROUTES = [
  ['home', '#/', 'Текущий цикл'],
  ['calendar', '#/calendar', 'Фертильность'],
  ['analytics', '#/analytics', 'Статистика'],
  ['insights', '#/insights', 'Твои инсайты'],
  ['articles', '#/articles', 'Коротко и понятно'],
  ['article', '#/articles/late-period', 'Шаг 1'],
  ['checkin', '#/checkin', 'Как ты себя чувствуешь?'],
  ['profile', '#/profile', 'Мои данные'],
  ['my-data', '#/profile/data', 'Как тебя зовут?'],
  ['notifications', '#/profile/notifications', 'Время напоминаний'],
  ['privacy', '#/profile/privacy', 'Резервная копия'],
  ['about', '#/profile/about', 'LUNA помогает'],
  ['report', '#/report', 'Сохранить PDF'],
  ['success', '#/success', 'Продолжить', true],
];
const TABS = [
  ['Календарь', 'Фертильность'],
  ['Аналитика', 'Статистика'],
  ['Статьи', 'Коротко и понятно'],
  ['Профиль', 'Мои данные'],
  ['Главная', 'Текущий цикл'],
];

// ---------- локальный сервер dist/ (gzip и кэш как на боевом) ----------
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json',
};
async function serveDist(dir) {
  const server = http.createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(dir, p);
      if (!file.startsWith(dir)) throw new Error('outside');
      let body = await readFile(file);
      const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
      const headers = {
        'Content-Type': type,
        'Cache-Control': p.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
      };
      if (/text|javascript|json|svg|manifest/.test(type) && /gzip/.test(req.headers['accept-encoding'] ?? '')) {
        body = zlib.gzipSync(body);
        headers['Content-Encoding'] = 'gzip';
      }
      res.writeHead(200, headers).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() };
}

// ---------- подмена Telegram, API и демо-данные ----------
const telegramMock = (platform, scheme) => `(() => {
  const store = {}; const later = (fn) => setTimeout(fn, 0); const noop = () => {};
  window.Telegram = { WebApp: {
    initData: 'query_id=check&user=%7B%22id%22%3A1%7D&auth_date=1&hash=check',
    initDataUnsafe: { user: { id: 1, first_name: 'Анна' } },
    version: '8.0', platform: ${JSON.stringify(platform)}, colorScheme: ${JSON.stringify(scheme)}, themeParams: {},
    isExpanded: true, viewportHeight: innerHeight, viewportStableHeight: innerHeight,
    isVersionAtLeast: () => true, ready: noop, expand: noop, close: noop,
    setHeaderColor: noop, setBackgroundColor: noop, setBottomBarColor: noop, disableVerticalSwipes: noop,
    onEvent: noop, offEvent: noop, openLink: noop, openTelegramLink: noop,
    showConfirm: (m, cb) => later(() => cb(true)), showAlert: (m, cb) => later(() => cb && cb()),
    requestWriteAccess: (cb) => later(() => cb && cb(true)),
    checkHomeScreenStatus: (cb) => later(() => cb('unsupported')), addToHomeScreen: noop,
    HapticFeedback: { impactOccurred: noop, notificationOccurred: noop, selectionChanged: noop },
    BackButton: { show: noop, hide: noop, onClick: noop, offClick: noop },
    CloudStorage: {
      setItem: (k, v, cb) => { store[k] = String(v); later(() => cb && cb(null, true)); },
      getItem: (k, cb) => later(() => cb(null, store[k] ?? '')),
      getItems: (ks, cb) => later(() => cb(null, Object.fromEntries(ks.map((k) => [k, store[k] ?? ''])))),
      removeItems: (ks, cb) => { ks.forEach((k) => delete store[k]); later(() => cb && cb(null, true)); },
    },
  } };
})();`;

const API_ME = { allowed: true, denied: false, pending: false, started: true, bot: 'luna_tracker_bot', partner: { linked: false, name: null, invite: null } };

/** Демо-история за ~8 циклов: месячные, самочувствие, близость (формат хранилища версии 1) */
function seedDemo() {
  if (localStorage.getItem('luna-store-v1')) return;
  const pad = (n) => String(n).padStart(2, '0');
  const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const add = (k, n) => { const [y, m, d] = k.split('-').map(Number); return key(new Date(y, m - 1, d + n)); };
  const today = key(new Date());
  const lengths = [29, 27, 28, 30, 28, 27, 29, 28];
  const starts = [add(today, -11)];
  for (let i = lengths.length - 1; i >= 0; i--) starts.unshift(add(starts[0], -lengths[i]));
  const periodDays = {}, logs = {}, intimacy = {};
  const log = (date, p) => ({ date, symptoms: [], customSymptoms: [], timezone: 'Europe/Moscow', createdAt: date, updatedAt: date, ...p });
  starts.forEach((s, ci) => {
    ['medium', 'heavy', 'medium', 'light', 'spotting'].forEach((f, i) => { const d = add(s, i); if (d <= today) periodDays[d] = f; });
    logs[s] = log(s, { pain: 'moderate', energy: 'low', mood: 'sensitive', symptoms: ['cramps', 'fatigue'], sleepHours: 7, sleepQuality: 'ok' });
    const next = starts[ci + 1];
    [[9, 'protected'], [13, ci % 2 ? 'unprotected' : 'protected']].forEach(([o, protection]) => {
      const d = add(s, o);
      if (d <= today && (!next || d < next)) intimacy[d] = { date: d, sex: true, protection, libido: 'high', updatedAt: d };
    });
    if (!next) return;
    for (let k = 1; k <= 3; k++) {
      const d = add(next, -k);
      logs[d] = log(d, { mood: 'irritable', energy: 'low', symptoms: ['fatigue', 'swelling'], sleepHours: 6, sleepQuality: 'bad', ...(k === 1 ? { notes: 'Тяжёлый день' } : {}) });
    }
    const f = add(s, 8);
    if (f <= today) logs[f] = log(f, { mood: 'good', energy: 'high', pain: 'none', sleepHours: 8, sleepQuality: 'good' });
  });
  const profile = { name: 'Анна', cycleLength: 28, periodLength: 5, regularity: 'regular', onboarded: true, createdAt: '2026-01-01T00:00:00.000Z' };
  localStorage.setItem('luna-store-v1', JSON.stringify({ version: 1, state: {
    profile, periodDays, logs, intimacy,
    notifications: { periodReminder: true, symptomReminder: true, tips: false, weeklyReport: true, time: '09:00' },
    prefs: { haptics: true, sounds: false, theme: 'auto' },
  } }));
  localStorage.setItem('luna-access', 'allowed');
}

/** Счётчики в странице: время появления текста, длинные задачи, кадры */
function probes() {
  window.__luna = { longTasks: [], frames: null, readyAt: null };
  // Момент, когда главный экран реально нарисован (кадр после появления текста), от начала загрузки страницы
  const watch = () => {
    if (document.body && document.body.innerText.includes('Текущий цикл')) {
      requestAnimationFrame(() => { window.__luna.readyAt = performance.now(); });
    } else requestAnimationFrame(watch);
  };
  requestAnimationFrame(watch);
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__luna.longTasks.push(e.duration))).observe({ type: 'longtask', buffered: true });
  } catch { /* WebKit не умеет longtask */ }
  // Ждёт, пока вместо текущего экрана появится новый (<main> пересоздаётся при смене адреса) с нужным текстом
  window.__luna.waitText = (text, fresh = true) => new Promise((resolve, reject) => {
    const t0 = performance.now();
    const prev = fresh ? document.querySelector('main') : null;
    const check = () =>
      ((m) => m && m !== prev && m.innerText.includes(text))(document.querySelector('main'))
        ? requestAnimationFrame(() => resolve(performance.now() - t0)) // следующий кадр — уже нарисовано
        : performance.now() - t0 > 20000
          ? reject(new Error(`нет текста «${text}»`))
          : requestAnimationFrame(check);
    check();
  });
  // Для экранов без общего каркаса (<main>): просто ждём текст на странице
  window.__luna.waitBody = (text) => new Promise((resolve, reject) => {
    const t0 = performance.now();
    const check = () =>
      document.body.innerText.includes(text)
        ? requestAnimationFrame(() => resolve(performance.now() - t0))
        : performance.now() - t0 > 20000 ? reject(new Error(`нет текста «${text}»`)) : requestAnimationFrame(check);
    check();
  });
  window.__luna.startFrames = () => {
    const ts = []; window.__luna.frames = ts;
    const loop = (t) => { if (window.__luna.frames !== ts) return; ts.push(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  };
  window.__luna.stopFrames = () => {
    const ts = window.__luna.frames || []; window.__luna.frames = null;
    const d = []; for (let i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1]);
    return d;
  };
}

const frameStats = (d) => {
  if (!d.length) return null;
  const avg = d.reduce((a, b) => a + b, 0) / d.length;
  return { fps: Math.round(1000 / avg), worst: Math.round(Math.max(...d)), janky: d.filter((x) => x > 50).length, frames: d.length };
};

// ---------- профили ----------
const PROFILE_DEFS = {
  android: {
    engine: chromium, platform: 'android',
    context: { viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' },
    throttle: { cpu: 4, latency: 150, down: (1.6 * 1024 * 1024) / 8, up: (750 * 1024) / 8 },
  },
  iphone: {
    engine: webkit, platform: 'ios',
    context: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148' },
  },
  desktop: {
    engine: chromium, platform: 'tdesktop',
    context: { viewport: { width: 420, height: 740 }, deviceScaleFactor: 1.25 },
    wide: { width: 1280, height: 800 },
  },
};

async function launch(engine) {
  if (engine === webkit) return webkit.launch();
  for (const channel of ['chrome', 'msedge']) {
    try {
      return await chromium.launch({ channel });
    } catch { /* следующий */ }
  }
  throw new Error('Не найден Chrome или Edge');
}

async function runProfile(name, baseUrl, scheme) {
  const def = PROFILE_DEFS[name];
  let browser;
  try {
    browser = await launch(def.engine);
  } catch (e) {
    return { name, skipped: def.engine === webkit ? 'нет WebKit — npx playwright-core install webkit' : String(e.message) };
  }
  const dir = path.join(OUT, `${name}-${scheme}`);
  await mkdir(dir, { recursive: true });
  const errors = [];
  const origin = new URL(baseUrl).origin;
  let where = 'load';
  /** Контекст браузера с подменённым Telegram и API; withData — демо-история, иначе «первый запуск» */
  const openPage = async (withData) => {
    const c = await browser.newContext({ ...def.context, colorScheme: scheme, locale: 'ru-RU', timezoneId: 'Europe/Moscow' });
    await c.route(/telegram\.org\/js\/telegram-web-app\.js/, (r) => r.fulfill({ contentType: 'text/javascript', body: telegramMock(def.platform, scheme) }));
    await c.route('**/api/**', (r) => {
      const p = new URL(r.request().url()).pathname.replace(/^.*\/api\//, '');
      r.fulfill({ contentType: 'application/json', body: JSON.stringify(p === 'me' ? API_ME : { ok: true }) });
    });
    if (withData) await c.addInitScript(seedDemo);
    await c.addInitScript(probes);
    if (EXTRA_CSS) {
      await c.addInitScript((css) => document.addEventListener('DOMContentLoaded', () => {
        const s = document.createElement('style');
        s.textContent = css;
        document.head.append(s);
      }), EXTRA_CSS);
    }
    const pg = await c.newPage();
    pg.on('pageerror', (e) => errors.push(`${where}: ${e.message}`));
    pg.on('console', (m) => m.type() === 'error' && errors.push(`${where}: console: ${m.text()}`));
    pg.on('response', (r) => r.status() >= 400 && r.url().startsWith(origin) && errors.push(`${where}: HTTP ${r.status()} ${r.url()}`));
    return { ctx: c, page: pg };
  };
  const { ctx, page } = await openPage(true);

  const isChromium = def.engine === chromium;
  let cdp;
  if (isChromium && def.throttle && PERF) {
    cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: def.throttle.latency, downloadThroughput: def.throttle.down, uploadThroughput: def.throttle.up });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: def.throttle.cpu });
  }

  const result = { name, scheme, screens: [], errors };
  // 1. Холодный запуск (пустой кэш): до появления главного экрана
  await page.goto(baseUrl + '#/', { waitUntil: 'commit' });
  result.coldLoad = Math.round(await page.waitForFunction(() => window.__luna?.readyAt, null, { timeout: 60000 }).then((h) => h.jsonValue()));
  await page.waitForTimeout(600);
  const perf = await page.evaluate(() => {
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null;
    const res = performance.getEntriesByType('resource');
    const nav = performance.getEntriesByType('navigation')[0];
    const bytes = res.reduce((a, r) => a + (r.transferSize || 0), 0) + (nav?.transferSize || 0);
    const tbt = window.__luna.longTasks.reduce((a, d) => a + Math.max(0, d - 50), 0);
    return { fcp: fcp && Math.round(fcp), bytes, tbt: Math.round(tbt), longTasks: window.__luna.longTasks.length };
  });
  Object.assign(result, perf);

  // 2. Повторный запуск (файлы уже в кэше — так открывается каждый раз после первого)
  await page.reload({ waitUntil: 'commit' });
  result.warmLoad = Math.round(await page.waitForFunction(() => window.__luna?.readyAt, null, { timeout: 60000 }).then((h) => h.jsonValue()));
  await page.waitForTimeout(400);

  // 3. Все экраны: переход внутри приложения, время до отрисовки, снимок
  for (const [i, [id, hash, text, bodyOnly]] of ROUTES.entries()) {
    where = id;
    const ms = await page.evaluate(([h, txt, body]) => {
      const same = (location.hash || '#/') === h;
      const ready = body ? window.__luna.waitBody(txt) : window.__luna.waitText(txt, !same);
      location.hash = h;
      return ready;
    }, [hash, text, !!bodyOnly]).catch((e) => (errors.push(`${id}: не отрисовался (${e.message})`), null));
    await page.waitForTimeout(450); // дождаться анимации появления
    await page.screenshot({ path: path.join(dir, `${String(i + 1).padStart(2, '0')}-${id}.png`) });
    result.screens.push({ id, ms: ms == null ? null : Math.round(ms) });
  }

  if (PERF) {
    // 4. Переключение вкладок нижнего меню
    where = 'tabs';
    await page.evaluate(() => (location.hash = '#/'));
    await page.waitForTimeout(500);
    result.tabs = [];
    for (const [tab, text] of TABS) {
      await page.evaluate(() => window.__luna.startFrames());
      const wait = page.evaluate((txt) => window.__luna.waitText(txt), text);
      await page.locator('nav a', { hasText: tab }).click();
      const ms = Math.round(await wait);
      await page.waitForTimeout(400);
      result.tabs.push({ tab, ms, ...frameStats(await page.evaluate(() => window.__luna.stopFrames())) });
    }

    // 5. Прокрутка длинного экрана (Аналитика)
    where = 'scroll';
    await page.evaluate(() => (location.hash = '#/analytics'));
    await page.waitForTimeout(700);
    await page.evaluate(() => window.__luna.startFrames());
    if (def.context.hasTouch && isChromium) {
      for (let k = 0; k < 4; k++) await page.mouse.wheel(0, 500), await page.waitForTimeout(250);
    } else {
      await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
      await page.waitForTimeout(1200);
    }
    await page.waitForTimeout(300);
    result.scroll = frameStats(await page.evaluate(() => window.__luna.stopFrames()));

    // 6. Открытие шторки дня в календаре
    where = 'sheet';
    await page.evaluate(() => (location.hash = '#/calendar'));
    await page.waitForTimeout(700);
    await page.evaluate(() => window.__luna.startFrames());
    const today = String(new Date().getDate());
    await page.locator('button', { hasText: new RegExp(`^${today}$`) }).first().click();
    await page.waitForFunction(() => document.body.innerText.includes('Самочувствие'));
    await page.waitForTimeout(500);
    result.sheet = frameStats(await page.evaluate(() => window.__luna.stopFrames()));
    await page.screenshot({ path: path.join(dir, '90-day-sheet.png') });
    await page.keyboard.press('Escape');
  }

  // 7. Первый запуск (пустое устройство): приветствие → знакомство
  where = 'first-run';
  const first = await openPage(false);
  try {
    await first.page.goto(baseUrl + '#/');
    await first.page.waitForFunction(() => document.body?.innerText.includes('Начать'), null, { timeout: 30000 });
    await first.page.waitForTimeout(500);
    await first.page.screenshot({ path: path.join(dir, '80-welcome.png') });
    await first.page.getByRole('button', { name: 'Начать' }).click();
    await first.page.waitForFunction(() => document.body.innerText.includes('Давай познакомимся'), null, { timeout: 20000 });
    await first.page.waitForTimeout(450);
    await first.page.screenshot({ path: path.join(dir, '81-setup.png') });
  } catch (e) {
    errors.push(`first-run: ${e.message.split('\n')[0]}`);
  }
  await first.ctx.close();

  // Широкое окно на ПК — вёрстка не должна разъезжаться
  if (def.wide) {
    where = 'wide';
    await page.setViewportSize(def.wide);
    await page.evaluate(() => (location.hash = '#/'));
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(dir, '95-wide.png') });
  }

  if (cdp) await cdp.detach().catch(() => undefined);
  await browser.close();
  return result;
}

// ---------- запуск ----------
const remote = opt('url');
const local = remote ? null : await serveDist(path.join(ROOT, 'dist'));
const baseUrl = remote ? (remote.endsWith('/') ? remote : remote + '/') : local.url;
console.log(`Проверяю ${remote ? baseUrl : 'dist/ (локально)'} → снимки в ${OUT}\n`);

const results = [];
for (const name of PROFILES) {
  for (const scheme of name === 'android' ? ['light', 'dark'] : ['light']) {
    process.stdout.write(`… ${name} (${scheme})\n`);
    try {
      results.push(await runProfile(name, baseUrl, scheme));
    } catch (e) {
      results.push({ name, scheme, errors: [`сбой проверки: ${e.message}`], screens: [] });
    }
  }
}
local?.close();
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));

// ---------- отчёт ----------
const ms = (v) => (v == null ? '—' : `${v} мс`);
const fr = (f) => (f ? `${f.fps} fps, худший кадр ${f.worst} мс, рывков ${f.janky}/${f.frames}` : '—');
let failed = false;
for (const r of results) {
  console.log(`\n■ ${r.name}${r.scheme ? ` (${r.scheme})` : ''}`);
  if (r.skipped) {
    console.log(`  пропущен: ${r.skipped}`);
    continue;
  }
  if (r.coldLoad != null) {
    console.log(`  запуск: первый ${ms(r.coldLoad)}, повторный ${ms(r.warmLoad)} · FCP ${ms(r.fcp)} · скачано ${Math.round((r.bytes || 0) / 1024)} КБ · блокировки ${ms(r.tbt)} (${r.longTasks} длинных задач)`);
  }
  const sc = r.screens.filter((s) => s.ms != null).map((s) => s.ms);
  if (sc.length) console.log(`  экраны: ${r.screens.length} шт., отрисовка ср. ${ms(Math.round(sc.reduce((a, b) => a + b, 0) / sc.length))}, макс. ${ms(Math.max(...sc))} (${r.screens.reduce((m, s) => (s.ms > m.ms ? s : m), { ms: -1 }).id})`);
  if (r.tabs) console.log(`  вкладки: ${r.tabs.map((t) => `${t.tab} ${t.ms} мс`).join(', ')}`);
  if (r.tabs) console.log(`  анимация вкладок: ${fr(r.tabs.reduce((a, t) => (t.fps && (!a || t.fps < a.fps) ? t : a), null))} (худшая)`);
  if (r.scroll !== undefined) console.log(`  прокрутка: ${fr(r.scroll)}`);
  if (r.sheet !== undefined) console.log(`  шторка: ${fr(r.sheet)}`);
  if (r.errors.length) {
    failed = true;
    console.log(`  ОШИБКИ (${r.errors.length}):`);
    for (const e of [...new Set(r.errors)].slice(0, 20)) console.log(`   - ${e}`);
  } else console.log('  ошибок нет ✓');
}
process.exit(failed ? 1 : 0);
