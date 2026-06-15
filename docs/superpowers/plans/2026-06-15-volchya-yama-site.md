# Сайт-читалка «Волчья яма» на GitHub Pages — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Статический клиентский сайт на GitHub Pages, рендерящий markdown-файлы пьесы в тёмную адаптивную читалку с меню и постером.

**Architecture:** Один `index.html` грузит CSS и JS; `app.js` читает `pages.json` (список страниц), по `#slug` загружает нужный `.md` из того же репозитория и рендерит его вшитой `markdown-it`. Без сборки — GitHub Pages отдаёт файлы как есть (публикация из корня ветки `main`, `.nojekyll`).

**Tech Stack:** Ванильный HTML/CSS/JS, вендоренная библиотека `markdown-it`, GitHub Pages (deploy from branch).

**Спека:** `docs/superpowers/specs/2026-06-15-volchya-yama-site-design.md`

**О тестировании:** Для статического сайта из 4 файлов автоматический JS-тест-харнесс избыточен (YAGNI). Проверка — конкретными ручными шагами в браузере и `curl`-проверками с явным ожидаемым результатом. Каждая задача завершается коммитом.

---

## Файловая структура (итог)

```
index.html              — оболочка (шапка с меню + контейнер контента)
.nojekyll               — отключает Jekyll
assets/style.css        — тёмная тема, адаптив, типографика
assets/app.js           — роутер, загрузка, рендер
assets/markdown-it.min.js — вендоренная библиотека рендера
pages.json              — список страниц меню
Волчья яма.md           — пьеса (уже в корне)
Книга ролей.md          — переносится из docs/ в корень (Задача 1)
poster.png              — постер (уже в корне)
```

Каждый путь — относительный (сайт живёт в подпапке `/the-wolf-pit/`).

---

### Task 1: Перенос книги ролей и каркас репозитория

**Files:**
- Move: `docs/superpowers/specs/2026-06-14-volchya-yama-roli.md` → `Книга ролей.md`
- Create: `.nojekyll`

- [ ] **Step 1: Перенести книгу ролей в корень (с сохранением истории)**

```bash
cd "C:/projects/theater/dogs"
git mv "docs/superpowers/specs/2026-06-14-volchya-yama-roli.md" "Книга ролей.md"
```

- [ ] **Step 2: Создать пустой `.nojekyll`**

Создать файл `.nojekyll` в корне репозитория с пустым содержимым (0 байт).

- [ ] **Step 3: Проверить раскладку**

Run: `ls -1 "Книга ролей.md" "Волчья яма.md" poster.png .nojekyll`
Expected: все четыре имени выводятся без ошибки «No such file».

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Книга ролей перенесена в корень; добавлен .nojekyll"
```

---

### Task 2: Вендоринг markdown-it

**Files:**
- Create: `assets/markdown-it.min.js`

- [ ] **Step 1: Создать папку assets и скачать библиотеку (пин версии)**

```bash
cd "C:/projects/theater/dogs"
mkdir -p assets
curl -fSL "https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.min.js" -o "assets/markdown-it.min.js"
```

- [ ] **Step 2: Проверить, что скачался валидный JS, а не страница ошибки**

Run: `wc -c < assets/markdown-it.min.js && grep -c "markdownit" assets/markdown-it.min.js`
Expected: размер > 80000 байт; счётчик `markdownit` ≥ 1. Если размер < 1000 или grep = 0 — скачалась ошибка, повторить Step 1.

- [ ] **Step 3: Commit**

```bash
git add assets/markdown-it.min.js
git commit -m "Вендоринг markdown-it 14.1.0"
```

---

### Task 3: Список страниц `pages.json`

**Files:**
- Create: `pages.json`

- [ ] **Step 1: Создать `pages.json`**

```json
[
  { "slug": "play",  "title": "Пьеса",       "file": "Волчья яма.md", "poster": "poster.png" },
  { "slug": "roles", "title": "Книга ролей", "file": "Книга ролей.md" }
]
```

- [ ] **Step 2: Проверить валидность JSON**

Run: `python -c "import json; print(len(json.load(open('pages.json', encoding='utf-8'))))"`
Expected: `2`

- [ ] **Step 3: Commit**

```bash
git add pages.json
git commit -m "Список страниц сайта (pages.json)"
```

---

### Task 4: Оболочка `index.html`

**Files:**
- Create: `index.html`

- [ ] **Step 1: Создать `index.html`**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Волчья яма</title>
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>
  <header class="site-header">
    <a class="site-title" href="#">Волчья яма</a>
    <nav id="nav" class="site-nav"></nav>
  </header>
  <main id="content" class="content"></main>
  <script src="assets/markdown-it.min.js"></script>
  <script src="assets/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Проверить, что файл содержит контейнеры и подключения**

Run: `grep -E 'id="nav"|id="content"|markdown-it.min.js|assets/app.js|charset="utf-8"' index.html | wc -l`
Expected: `5` (все ключевые строки на месте).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Оболочка index.html"
```

---

### Task 5: Стили `assets/style.css` (тёмная тема, адаптив)

**Files:**
- Create: `assets/style.css`

- [ ] **Step 1: Создать `assets/style.css`**

```css
:root {
  --bg: #15171b;
  --bg-elev: #1d2026;
  --text: #e6e3dc;
  --muted: #9a958c;
  --accent: #a23b3b;
  --rule: #2c2f36;
  --maxw: 42rem;
}

* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 18px;
  line-height: 1.7;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 1.25rem;
  padding: 0.75rem 1.25rem;
  background: var(--bg-elev);
  border-bottom: 1px solid var(--rule);
}

.site-title {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text);
  text-decoration: none;
}

.site-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 0.95rem;
}

.site-nav a {
  color: var(--muted);
  text-decoration: none;
  padding: 0.15rem 0;
  border-bottom: 2px solid transparent;
}
.site-nav a:hover { color: var(--text); }
.site-nav a.active { color: var(--text); border-bottom-color: var(--accent); }

.content {
  max-width: var(--maxw);
  margin: 0 auto;
  padding: 1.5rem 1.25rem 4rem;
}

.poster {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 0 auto 2rem;
}

.content h1, .content h2, .content h3 {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.25;
}
.content h1 { font-size: 1.9rem; margin: 2rem 0 1rem; text-align: center; letter-spacing: 0.02em; }
.content h2 { font-size: 1.4rem; margin: 2rem 0 0.75rem; color: var(--accent); }
.content h3 { font-size: 1.1rem; margin: 1.5rem 0 0.5rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }

.content p { margin: 0 0 1rem; }
.content em { color: var(--muted); }
.content strong { color: var(--text); }

.content blockquote {
  margin: 1rem 0;
  padding: 0.25rem 0 0.25rem 1rem;
  border-left: 3px solid var(--accent);
  color: var(--muted);
  font-style: italic;
}

.content hr { border: 0; height: 1px; background: var(--rule); margin: 2rem 0; }
.content a { color: #c98a8a; }
.error { color: var(--accent); }

@media (max-width: 480px) {
  body { font-size: 17px; }
  .content { padding: 1rem 1rem 3rem; }
  .content h1 { font-size: 1.6rem; }
}
```

- [ ] **Step 2: Проверить наличие ключевых правил**

Run: `grep -E '\.poster|\.site-nav a\.active|@media|--accent' assets/style.css | wc -l`
Expected: ≥ `4`.

- [ ] **Step 3: Commit**

```bash
git add assets/style.css
git commit -m "Тёмная адаптивная тема (style.css)"
```

---

### Task 6: Логика `assets/app.js`

**Files:**
- Create: `assets/app.js`

- [ ] **Step 1: Создать `assets/app.js`**

```js
'use strict';

const md = window.markdownit({ html: false, linkify: true, typographer: true });
const navEl = document.getElementById('nav');
const contentEl = document.getElementById('content');

// Анти-кеш: правки .md и pages.json должны подтягиваться сразу (см. спека §6).
const bust = (url) => url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();

async function fetchText(file) {
  const res = await fetch(bust(encodeURIComponent(file)));
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
}

async function loadManifest() {
  const res = await fetch(bust('pages.json'));
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function buildNav(pages, activeSlug) {
  navEl.innerHTML = '';
  for (const p of pages) {
    const a = document.createElement('a');
    a.href = '#' + p.slug;
    a.textContent = p.title;
    if (p.slug === activeSlug) a.classList.add('active');
    navEl.appendChild(a);
  }
}

function resolveRoute(pages) {
  const slug = location.hash.replace(/^#/, '');
  return pages.find((p) => p.slug === slug) || pages[0];
}

function showError(message) {
  contentEl.innerHTML = '<p class="error">' + message + '</p>';
}

async function render(pages) {
  const entry = resolveRoute(pages);
  buildNav(pages, entry.slug);
  document.title = entry.title + ' — Волчья яма';
  try {
    const text = await fetchText(entry.file);
    let html = '';
    if (entry.poster) {
      html += '<img class="poster" src="' + encodeURI(entry.poster) + '" alt="Постер">';
    }
    html += md.render(text);
    contentEl.innerHTML = html;
    window.scrollTo(0, 0);
  } catch (e) {
    showError('Не удалось загрузить страницу. ' + e.message);
  }
}

async function init() {
  let pages;
  try {
    pages = await loadManifest();
  } catch (e) {
    showError('Не удалось загрузить список страниц. ' + e.message);
    return;
  }
  await render(pages);
  window.addEventListener('hashchange', () => render(pages));
}

init();
```

- [ ] **Step 2: Проверить наличие всех функций**

Run: `grep -E 'function (loadManifest|buildNav|resolveRoute|showError|render|init)|const bust' assets/app.js | wc -l`
Expected: `7`.

- [ ] **Step 3: Commit**

```bash
git add assets/app.js
git commit -m "Роутер, загрузка и рендер markdown (app.js)"
```

---

### Task 7: Локальная проверка в браузере

**Files:** нет изменений (только проверка).

- [ ] **Step 1: Поднять локальный сервер**

```bash
cd "C:/projects/theater/dogs"
python -m http.server 8000
```
(Открывать через `http://localhost:8000/`, НЕ через `file://` — `fetch` локальных файлов в браузере блокируется.)

- [ ] **Step 2: Проверить страницу пьесы**

Открыть `http://localhost:8000/` в браузере.
Expected: вверху — постер; ниже заголовок «ВОЛЧЬЯ ЯМА» по центру; в шапке меню «Пьеса» (активна) и «Книга ролей». Ремарки (курсив) — приглушённые; реплики (жирный) — яркие; радиоперехваты в прологе — с левой линией; разделители `---` — тонкие линии.

- [ ] **Step 3: Проверить переключение на книгу ролей**

Кликнуть «Книга ролей» (адрес станет `…/#roles`).
Expected: контент сменился на книгу ролей без перезагрузки; постера нет; активный пункт меню — «Книга ролей»; прокрутка вверху.

- [ ] **Step 4: Проверить адаптив (мобильный)**

В devtools включить узкий экран (≈375px).
Expected: колонка читается без горизонтальной прокрутки; меню переносится; кегль комфортный; постер вписан по ширине.

- [ ] **Step 5: Проверить обработку ошибки**

Открыть несуществующий маршрут: `http://localhost:8000/#nope`.
Expected: открывается первая страница (пьеса), а не пустота. (Неизвестный slug → первая страница.)

- [ ] **Step 6: Остановить сервер**

Остановить `http.server` (Ctrl+C). Коммита нет — изменений в файлах не было.

---

### Task 8: Включение GitHub Pages и проверка деплоя

**Files:** нет изменений в репозитории (настройка через API/UI).

- [ ] **Step 1: Запушить все коммиты**

```bash
cd "C:/projects/theater/dogs"
git push origin main
```

- [ ] **Step 2: Включить Pages через gh CLI (публикация из корня main)**

```bash
gh api -X POST "repos/1theater/the-wolf-pit/pages" \
  -f "source[branch]=main" -f "source[path]=/" 2>&1 || \
gh api -X PUT "repos/1theater/the-wolf-pit/pages" \
  -f "source[branch]=main" -f "source[path]=/"
```
Expected: ответ с полем `"status"` или HTTP 201/204. Если команда вернёт ошибку прав/аутентификации — выполнить вручную: **Settings → Pages → Source: Deploy from a branch → Branch `main` → Folder `/ (root)` → Save**.

- [ ] **Step 3: Дождаться первой сборки и проверить, что оболочка отдаётся**

Подождать 1–2 минуты, затем:
```bash
curl -fsS "https://1theater.github.io/the-wolf-pit/" | grep -c "site-title"
```
Expected: `1` (HTML-оболочка опубликована).

- [ ] **Step 4: Проверить, что «сырые» .md и pages.json доступны для fetch**

```bash
curl -fsS -o /dev/null -w "%{http_code}\n" "https://1theater.github.io/the-wolf-pit/pages.json"
curl -fsS -o /dev/null -w "%{http_code}\n" "https://1theater.github.io/the-wolf-pit/%D0%92%D0%BE%D0%BB%D1%87%D1%8C%D1%8F%20%D1%8F%D0%BC%D0%B0.md"
```
Expected: оба — `200`. (Второй URL — это `Волчья яма.md` в percent-encoding; подтверждает, что `.nojekyll` отдаёт кириллический `.md` как есть.)

- [ ] **Step 5: Проверить сайт в браузере**

Открыть `https://1theater.github.io/the-wolf-pit/`.
Expected: то же, что в Task 7 (постер + пьеса, меню переключает на книгу ролей).

- [ ] **Step 6: Проверить авто-обновление**

Внести мелкую правку в `Волчья яма.md` (например, добавить пробел), закоммитить и запушить; через ~1–2 минуты обновить страницу.
Expected: правка видна (анти-кеш метка обходит CDN-кеш).

---

## Self-Review (выполнено при написании плана)

**Покрытие спеки:**
- §2 архитектура (клиентский рендер) → Tasks 4, 6.
- §3 раскладка файлов (Вариант 1) → Tasks 1, 2, 4, 5, 6.
- §4 `pages.json` → Task 3.
- §5 поведение (loadManifest/buildNav/resolveRoute/loadPage/render/showError) → Task 6.
- §6 авто-обновление (анти-кеш на `.md` и `pages.json`) → Task 6 (`bust`), Task 8 Step 6.
- §7 `.nojekyll` → Task 1; проверка отдачи `.md` → Task 8 Step 4.
- §8 перенос книги ролей → Task 1.
- §9 стиль (тёмная тема, серифное чтение, семантика em/strong/blockquote/hr, постер, адаптив) → Task 5.
- §10 ошибки (md/manifest/неизвестный slug) → Task 6; проверка → Task 7 Step 5.
- §11 включение Pages (+ предусловие публичной репы — выполнено) → Task 8.
- §12 проверка (локально + после деплоя) → Tasks 7, 8.

**Заглушки:** не найдено — весь код приведён полностью.

**Согласованность имён:** `bust`, `fetchText`, `loadManifest`, `buildNav`, `resolveRoute`, `showError`, `render`, `init`; контейнеры `#nav`/`#content`; классы `.poster`/`.site-nav a.active`/`.error` — совпадают между `index.html`, `style.css`, `app.js`.
