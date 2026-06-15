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
