/* =======================================================
   Rymax × Chase — App shell / routing

   Hash-based slide navigation. Each feature registers a
   render() that returns the phone screen; the shell owns
   the left panel copy, the device frame and the status bar.
   ======================================================= */

import { features } from '../data/features.js';

/* ── Elements ─────────────────────────────────────────────── */

const metaEl   = document.getElementById('proto-meta');
const descBlk  = document.getElementById('proto-desc-block');
const descEl   = document.getElementById('feature-description');
const screenEl = document.getElementById('feature-container');
const prevBtn  = document.getElementById('btn-prev');
const nextBtn  = document.getElementById('btn-next');

if (metaEl && screenEl && prevBtn && nextBtn) {
  let current = -1;

  /* ── Render ───────────────────────────────────────────────── */

  function renderShell(feature, index) {
    metaEl.innerHTML = '';

    const count = document.createElement('p');
    count.className = 'proto-count';
    count.textContent = 'Feature ' + (index + 1) + ' / ' + features.length;
    metaEl.appendChild(count);

    const title = document.createElement('h1');
    title.className = 'proto-title';
    title.innerHTML = feature.title;
    metaEl.appendChild(title);

    if (feature.subtitle) {
      const sub = document.createElement('p');
      sub.className = 'proto-subtitle';
      sub.textContent = feature.subtitle;
      metaEl.appendChild(sub);
    }

    if (feature.description && feature.description.length) {
      descEl.innerHTML = feature.description
        .map((p) => '<p>' + p + '</p>')
        .join('');
      descBlk.style.display = '';
    } else {
      descBlk.style.display = 'none';
    }

    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === features.length - 1;

    /* Soft, slightly staggered fade-up for the left-panel copy. */
    [metaEl, descBlk].forEach((node, i) => {
      if (!node) return;
      node.classList.remove('deck-fade-in');
      void node.offsetWidth; /* restart the animation */
      node.style.animationDelay = i * 110 + 'ms';
      node.classList.add('deck-fade-in');
    });
  }

  function show(index) {
    if (index < 0 || index >= features.length || index === current) return;

    if (current !== -1 && features[current].onLeave) features[current].onLeave();

    current = index;
    const feature = features[index];

    renderShell(feature, index);

    screenEl.innerHTML = '';
    screenEl.appendChild(feature.render());

    if (window.location.hash.slice(1) !== feature.id) {
      history.replaceState(null, '', '#' + feature.id);
    }
  }

  /* ── Routing ──────────────────────────────────────────────── */

  function indexFromHash() {
    const id = window.location.hash.slice(1);
    const found = features.findIndex((f) => f.id === id);
    return found === -1 ? 0 : found;
  }

  function route() {
    show(indexFromHash());
  }

  window.addEventListener('hashchange', route);

  prevBtn.addEventListener('click', () => {
    if (current > 0) window.location.hash = features[current - 1].id;
  });

  nextBtn.addEventListener('click', () => {
    if (current < features.length - 1) window.location.hash = features[current + 1].id;
  });

  /* Arrow keys — ignored while typing in the phone composer. */
  document.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowLeft'  && !prevBtn.disabled) prevBtn.click();
    if (e.key === 'ArrowRight' && !nextBtn.disabled) nextBtn.click();
  });

  route();
}
