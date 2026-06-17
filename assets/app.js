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
  { cls: 'lom', forms: ['ЛОМ', 'ЛОМА', 'ЛОМУ', 'ЛОМОМ', 'ЛОМЕ', 'Лом', 'Лома', 'Лому', 'Ломом', 'Ломе'] },
  { cls: 'schegol', forms: ['ЩЕГОЛ', 'ЩЕГЛА', 'ЩЕГЛУ', 'ЩЕГЛОМ', 'ЩЕГЛЕ', 'Щегол', 'Щегла', 'Щеглу', 'Щеглом', 'Щегле'] },
  { cls: 'kurator', forms: ['КУРАТОР', 'КУРАТОРА', 'КУРАТОРУ', 'КУРАТОРОМ', 'КУРАТОРЕ', 'Куратор', 'Куратора', 'Куратору', 'Куратором', 'Кураторе'] },
];

const FORM_TO_CLASS = {};
for (const c of CHARACTERS) for (const f of c.forms) FORM_TO_CLASS[f] = c.cls;

// Граница слова — не буква/цифра/подчёркивание. Хвостовую границу проверяет сам регэксп
// (lookahead), ведущую — код в colorizeCharacters. Lookbehind тут НЕ используем: он не
// поддерживается старыми Safari (<16.4) и уронил бы весь скрипт в белый экран ещё до init().
// try/catch — страховка на случай иной несовместимости регэкспа.
const BOUNDARY_RE = /[\p{L}\p{Nd}_]/u;
let NAME_RE = null;
try {
  NAME_RE = new RegExp(
    '(' +
    Object.keys(FORM_TO_CLASS).sort((a, b) => b.length - a.length).join('|') +
    ')(?![\\p{L}\\p{Nd}_])',
    'gu'
  );
} catch (e) {
  NAME_RE = null; // подсветка имён отключится, но страница отрендерится
}

function colorizeCharacters(root) {
  if (!NAME_RE) return; // регэксп не построился — рендерим без подсветки, не падаем
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
      // Ведущая граница слова (замена lookbehind): символ перед именем — не часть слова.
      if (m.index > 0 && BOUNDARY_RE.test(text[m.index - 1])) continue;
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

async function render(pages) {
  const entry = resolveRoute(pages);
  buildNav(pages, entry.slug);
  document.title = entry === pages[0] ? 'Волчья яма' : entry.title + ' — Волчья яма';
  try {
    const text = await fetchText(entry.file);
    contentEl.innerHTML = md.render(text);
    // Анти-кеш и для локальных картинок (постеры): чтобы обновлённый файл
    // подтягивался сразу, как и .md. Внешние и data: URL не трогаем.
    for (const img of contentEl.querySelectorAll('img')) {
      const src = img.getAttribute('src');
      if (src && !/^(https?:|data:|\/\/)/i.test(src)) img.setAttribute('src', bust(src));
    }
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
