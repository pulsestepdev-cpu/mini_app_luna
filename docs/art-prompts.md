# LUNA — промты для картинок

Готовые картинки присылай в чат с Claude, как есть (PNG). Claude сам переименует их при необходимости, сожмёт в WebP и подключит в приложение.

## Как генерировать, чтобы всё было в одном стиле

1. **Делай всё в одном чате ChatGPT.** Тогда стиль держится лучше.
2. **Первым сообщением прикрепи `public/art/welcome-bg.png`** (это уже готовый фон приветствия) и напиши:
   > This is the style reference for my app LUNA. Keep this exact style, palette and mood for every image I ask for in this chat.
3. Перед каждым промтом вставляй **общий стиль** (блок ниже) и сам промт.
4. **Прозрачный фон** нужен там, где написано *«прозрачный фон»*. Если ChatGPT нарисовал фон, попроси: `Same image, but with a transparent background, PNG`.
5. Если результат не нравится, проси точечно: «сделай мягче», «меньше деталей», «цвет лепестков розовее». Это работает лучше, чем генерировать заново.
6. Скачивай в максимальном качестве. Размер указан у каждой картинки, ChatGPT умеет делать 1024×1024, 1536×1024 и 1024×1536.

### Общий стиль (вставлять перед каждым промтом)

```
Style: dreamy soft digital painting, gentle glow, airy and calm, feminine and cozy.
Palette: lavender and plum (#F6F0FC, #E0CFF3, #C9AEE8, #A884D6, #7448B1, #2F1D4E),
blush pink accents (#F8D2E0, #EE8AAA) and a little warm gold (#F5C98A).
Smooth gradients, soft light, minimal composition with lots of breathing room.
No text, no letters, no numbers, no watermark, no logos, no frames.
```

---

## 1. Главные иллюстрации (самое важное, делать первыми)

### 1.1 `success-lotus.png`: светящийся лотос
**Где:** экран «Ты молодец!» после сохранения самочувствия. Фон экрана тёмно-фиолетовый.
**Размер:** 1024×1024, **прозрачный фон.**
```
A single luminous lotus flower seen from the front at a slight angle, petals glowing
from within in pearl white and soft pink, delicate golden light at the center,
tiny sparkles floating around it, soft halo glow. Centered, the flower fills about 70%
of the frame. Transparent background, PNG.
```

### 1.2 `flower.png`: розовый цветок-декор
**Где:** карточка «Для твоей фазы» на главной и в статьях (на фиолетовом фоне), карточка напоминаний (на светлом фоне).
**Размер:** 1024×1024, **прозрачный фон.**
```
One delicate pink flower with six soft petals and a warm golden center, on a slender
curved lavender stem with one small leaf. Gentle glow around the petals, soft painterly
shading, slightly dreamy. The flower is in the upper part of the frame, the stem goes
down to the bottom edge. Transparent background, PNG.
```

### 1.3 `app-icon.png`: иконка бота и приложения
**Где:** аватарка бота в Telegram, иконка мини-приложения, favicon.
**Размер:** 1024×1024, **без прозрачности**, фон заполнен целиком.
```
App icon: a glowing crescent moon cradling a small lotus flower, centered,
on a smooth deep plum-to-lavender radial gradient background (#2F1D4E to #7448B1).
Simple, iconic, readable at very small sizes, soft glow, no text.
Square, full-bleed background, no rounded corners.
```

### 1.4 `bot-preview.png`: превью мини-приложения в BotFather
**Где:** картинка-превью, которую Telegram показывает при открытии и шеринге приложения.
**Размер:** 1536×1024 (потом обрежем до 640×360), **без прозрачности.**
```
Wide banner: night lavender sky with a glowing crescent moon on the right,
soft pink clouds and rolling violet hills at the bottom, a few twinkling stars.
Leave the left half calm and empty for a title. Wide 16:9 composition.
```

---

## 2. Пустые состояния (когда данных ещё нет)

### 2.1 `empty-moon.png`: спящая луна
**Где:** главная до первой отметки месячных, аналитика «Недостаточно данных».
**Размер:** 1024×1024, **прозрачный фон.**
```
A cute sleepy crescent moon with closed eyes resting on a small fluffy pink cloud,
three tiny stars around, soft glow. Simple, sweet, minimal, centered.
Transparent background, PNG.
```

### 2.2 `empty-seedling.png`: росток в лунном свете
**Где:** «Твои инсайты», пока закономерностей ещё нет («появятся через пару циклов»).
**Размер:** 1024×1024, **прозрачный фон.**
```
A tiny glowing seedling with two leaves sprouting from a small pot, a soft crescent
moon glow above it, a few floating sparkles. Hopeful, gentle, minimal, centered.
Transparent background, PNG.
```

### 2.3 `setup-hello.png`: знакомство
**Где:** верх экрана «Давай познакомимся» (первая настройка).
**Размер:** 1536×1024, **прозрачный фон.**
```
A small glowing crescent moon gently waving hello with a tiny hand made of light,
surrounded by a few stars and a little pink cloud. Friendly, welcoming, minimal,
lots of empty space around. Transparent background, PNG.
```

---

## 3. Обложки статей

**Где:** список статей (миниатюры) и шапка каждой статьи.
**Размер:** 1536×1024, **без прозрачности.** Без людей с детально прорисованными лицами, только силуэты или предметы. Это смотрится спокойнее.

Перед каждым промтом добавляй ещё одну строку:
```
Article cover illustration, landscape 3:2, soft background filling the whole frame,
main subject slightly off-center.
```

| Файл | Статья | Промт |
|---|---|---|
| `cover-cycle-phases.png` | 4 фазы цикла | `Four moon phases (new, crescent, full, waning) in a gentle arc across a lavender twilight sky, under each moon a flower at a different stage: bud, opening, full bloom, petals falling.` |
| `cover-normal-cycle.png` | Какой цикл нормальный | `A soft circle made of 28 small glowing pearls and petals lying on silky lavender fabric, one pearl slightly brighter, calm and orderly.` |
| `cover-what-is-pms.png` | Что такое ПМС | `Cozy scene: a woman's silhouette wrapped in a soft blanket sitting on a windowsill, gentle rain on the window, a warm mug in her hands, lavender evening light.` |
| `cover-pms-help.png` | Что помогает при ПМС | `Calming still life: a cup of herbal tea, a lit candle, a rolled yoga mat, an open notebook and a sprig of lavender on a soft pastel table.` |
| `cover-period-pain.png` | Боль во время месячных | `A hot water bottle in a knitted lavender cover lying on a fluffy blanket, a cup of chamomile tea beside it, warm comforting light.` |
| `cover-bloating.png` | Отёки и вздутие | `A tall glass of water with cucumber slices and mint, fresh fruits and greens around it, light airy morning mood.` |
| `cover-sleep-and-cycle.png` | Цикл и сон | `A peaceful bedroom at night, a crescent moon visible through the window, soft bedding with a sleeping cat curled up, dim violet light.` |
| `cover-energy-phases.png` | Энергия по фазам | `A woman's silhouette walking through a blooming lavender meadow at sunrise, light breeze, feeling of lightness and energy.` |
| `cover-ovulation.png` | Овуляция | `A glowing full moon over a calm lake, a single lotus blooming on the water, reflection of moonlight, serene night.` |
| `cover-when-to-see-doctor.png` | Когда к врачу | `A soft non-clinical still life: a stethoscope lying next to a sprig of lavender and a closed notebook on a pastel surface, reassuring and calm.` |
| `cover-doctor-visit.png` | Подготовка к гинекологу | `An open notebook with a blurred handwritten list (no readable text), a pen, a phone and a cup of tea on a pastel desk, organized and calm.` |
| `cover-late-period.png` | Задержка месячных | `An elegant hourglass with lavender sand, a crescent moon reflected in its glass, a few petals around, calm and patient mood.` |
| `cover-discharge.png` | Выделения | `Macro of clear dew drops on a translucent pale pink flower petal, soft bokeh background, delicate and clean.` |

---

## Чек-лист

- [ ] success-lotus.png
- [ ] flower.png
- [ ] app-icon.png
- [ ] bot-preview.png
- [ ] empty-moon.png
- [ ] empty-seedling.png
- [ ] setup-hello.png
- [ ] 13 обложек статей

Луну с фазами в кольце на главной рисует код: она растёт и убывает вместе с циклом, поэтому картинка для неё не нужна.
