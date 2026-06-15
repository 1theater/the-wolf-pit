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
    if (p.hideInNav) continue;
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

// Имена действующих лиц и их падежные формы → цветовой класс (цвета в style.css).
// Берём только формы с заглавной буквы, поэтому строчные слова («бес», «серый») не задеваются.
const CHARACTERS = [
  { cls: 'seryy', forms: ['СЕРЫЙ', 'СЕРОГО', 'СЕРОМУ', 'СЕРЫМ', 'СЕРОМ', 'Серый', 'Серого', 'Серому', 'Серым', 'Сером'] },
  { cls: 'ded', forms: ['ДЕД', 'ДЕДА', 'ДЕДУ', 'ДЕДОМ', 'ДЕДЕ', 'Дед', 'Деда', 'Деду', 'Дедом', 'Деде'] },
  { cls: 'bes', forms: ['БЕС', 'БЕСА', 'БЕСУ', 'БЕСОМ', 'БЕСЕ', 'Бес', 'Беса', 'Бесу', 'Бесом', 'Бесе'] },
  { cls: 'hirurg', forms: ['ХИРУРГ', 'ХИРУРГА', 'ХИРУРГУ', 'ХИРУРГОМ', 'ХИРУРГЕ', 'Хирург', 'Хирурга', 'Хирургу', 'Хирургом', 'Хирурге'] },
  { cls: 'kaban', forms: ['КАБАН', 'КАБАНА', 'КАБАНУ', 'КАБАНОМ', 'КАБАНЕ', 'Кабан', 'Кабана', 'Кабану', 'Кабаном', 'Кабане'] },
  { cls: 'schegol', forms: ['ЩЕГОЛ', 'ЩЕГЛА', 'ЩЕГЛУ', 'ЩЕГЛОМ', 'ЩЕГЛЕ', 'Щегол', 'Щегла', 'Щеглу', 'Щеглом', 'Щегле'] },
  { cls: 'kurator', forms: ['КУРАТОР', 'КУРАТОРА', 'КУРАТОРУ', 'КУРАТОРОМ', 'КУРАТОРЕ', 'Куратор', 'Куратора', 'Куратору', 'Куратором', 'Кураторе'] },
];

const FORM_TO_CLASS = {};
for (const c of CHARACTERS) for (const f of c.forms) FORM_TO_CLASS[f] = c.cls;

// Граница — не буква/цифра/подчёркивание с обеих сторон, чтобы не цеплять части слов.
const NAME_RE = new RegExp(
  '(?<![\\p{L}\\p{Nd}_])(' +
  Object.keys(FORM_TO_CLASS).sort((a, b) => b.length - a.length).join('|') +
  ')(?![\\p{L}\\p{Nd}_])',
  'gu'
);

function colorizeCharacters(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const p = node.parentNode;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (p.classList && p.classList.contains('char')) return NodeFilter.FILTER_REJECT;
      const tag = p.nodeName;
      if (tag === 'CODE' || tag === 'PRE' || tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT;
      NAME_RE.lastIndex = 0;
      return NAME_RE.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const targets = [];
  while (walker.nextNode()) targets.push(walker.currentNode);
  for (const node of targets) {
    const text = node.nodeValue;
    const frag = document.createDocumentFragment();
    let last = 0;
    let m;
    NAME_RE.lastIndex = 0;
    while ((m = NAME_RE.exec(text)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const span = document.createElement('span');
      span.className = 'char char-' + FORM_TO_CLASS[m[0]];
      span.textContent = m[0];
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
  }
}

// --- Ориентировочный хронометраж ------------------------------------------
// Театральные пьесы не размечают тайминг построчно (это не конвенция жанра),
// а точное время даёт только репетиция. Поэтому оцениваем время на уровне сцен
// по модели: речь + проигрывание действия по ремаркам + паузы. Коэффициенты —
// допущения; меняй их под темп своей постановки.
const TIMING = {
  speechWpm: 150,   // темп речи, слов в минуту
  actionWpm: 110,   // темп проигрывания действия из ремарок, слов в минуту
  pauseShort: 3,    // «Пауза.» и звуковая отбивка, секунд
  pauseLong: 6,     // «Долгая пауза», «Молчание», «Тишина», секунд
};

// Слова реплики: убираем имена-метки (жирный) и пояснения в скобках (курсив).
function spokenWords(line) {
  const cleaned = line
    .replace(/\*\*[^*]*\*\*/g, ' ')
    .replace(/\*[^*]*\*/g, ' ')
    .replace(/[#>*_`~]+/g, ' ');
  const w = cleaned.match(/[\p{L}\p{Nd}]+(?:[''’-][\p{L}\p{Nd}]+)*/gu);
  return w ? w.length : 0;
}

function allWords(text) {
  const w = text.replace(/[#>*_`~]+/g, ' ').match(/[\p{L}\p{Nd}]+/gu);
  return w ? w.length : 0;
}

// Делит текст пьесы на крупные сцены и оценивает время каждой в секундах.
// Заголовок пьесы (первый h1) пропускаем; h2-подзаголовок действия
// («Возвращение» сразу за «ДЕЙСТВИЕ ПЕРВОЕ») приклеиваем к этому действию.
function computeTiming(mdText) {
  const lines = mdText.split(/\r?\n/);
  const sections = [];
  let current = null;
  let titleSeen = false;
  let actOpenEmpty = false; // h1-действие открыто, содержимого ещё не было

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^#\s/.test(line)) {                          // h1
      const text = line.replace(/^#\s+/, '');
      if (!titleSeen) { titleSeen = true; current = null; actOpenEmpty = false; continue; }
      current = { level: 1, key: text, sec: 0 };
      sections.push(current);
      actOpenEmpty = true;
      continue;
    }
    if (/^##\s/.test(line)) {                          // h2
      const text = line.replace(/^##\s+/, '');
      if (current && actOpenEmpty) { actOpenEmpty = false; continue; } // подзаголовок действия
      current = { level: 2, key: text, sec: 0 };
      sections.push(current);
      actOpenEmpty = false;
      continue;
    }
    if (/^###\s/.test(line)) continue;                 // явление — не граница сцены
    if (/^-{3,}$/.test(line)) continue;                // разделитель
    if (!current) continue;

    if (/^>/.test(line)) {                             // звук/фонограмма — отбивка
      current.sec += TIMING.pauseShort;
    } else if (/^\*[^*].*\*$/.test(line) && !line.includes('**')) {  // ремарка-действие
      const inner = line.replace(/^\*|\*$/g, '');
      current.sec += (allWords(inner) / TIMING.actionWpm) * 60;
      if (/долг|молчан|тишин/i.test(inner)) current.sec += TIMING.pauseLong;
      else if (/пауз/i.test(inner)) current.sec += TIMING.pauseShort;
    } else {                                           // реплика
      current.sec += (spokenWords(line) / TIMING.speechWpm) * 60;
      const inlinePauses = (line.match(/\*\([^)]*пауз[^)]*\)\*/gi) || []).length;
      current.sec += inlinePauses * TIMING.pauseShort;
    }
    if (current.sec > 0) actOpenEmpty = false;
  }

  const toMin = (s) => Math.max(1, Math.round(s / 60));
  let total = 0;
  const scenes = [];
  for (const s of sections) {
    total += s.sec;
    if (s.sec > 0) scenes.push({ key: s.level + '|' + s.key, minutes: toMin(s.sec) });
  }
  return { totalMinutes: Math.max(1, Math.round(total / 60)), scenes };
}

function applyTiming(root, mdText) {
  const t = computeTiming(mdText);

  const banner = document.createElement('div');
  banner.className = 'runtime-total';
  banner.innerHTML =
    '<strong>≈ ' + t.totalMinutes + ' мин</strong>' +
    '<span>ориентировочно, без антракта — оценка по тексту (речь, действие, паузы). ' +
    'Точное время даёт только репетиция.</span>';
  const firstHr = root.querySelector('hr');
  if (firstHr && firstHr.parentNode === root) root.insertBefore(banner, firstHr.nextSibling);
  else root.insertBefore(banner, root.firstChild);

  const map = new Map(t.scenes.map((s) => [s.key, s.minutes]));
  for (const h of root.querySelectorAll('h1, h2')) {
    const key = (h.nodeName === 'H1' ? 1 : 2) + '|' + h.textContent.trim();
    if (!map.has(key)) continue;
    const badge = document.createElement('span');
    badge.className = 'runtime';
    badge.textContent = '≈ ' + map.get(key) + ' мин';
    h.appendChild(badge);
  }
}

async function render(pages) {
  const entry = resolveRoute(pages);
  buildNav(pages, entry.slug);
  document.title = entry.title === 'Волчья яма' ? 'Волчья яма' : entry.title + ' — Волчья яма';
  try {
    const text = await fetchText(entry.file);
    let html = '';
    if (entry.poster) {
      html += '<img class="poster" src="' + encodeURI(entry.poster) + '" alt="Постер">';
    }
    html += md.render(text);
    contentEl.innerHTML = html;
    if (entry.timing) applyTiming(contentEl, text);
    colorizeCharacters(contentEl);
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
