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
