/* =======================================================
   Feature 6 — Wrong Item / Wrong Size (SKU Mismatch)

   Same append-only transcript as Features 1–5. Marcus has
   said the size that turned up is not the size he ordered.
   The assistant does not open a returns form — it asks for
   one photo of the sewn-in size tag, the single thing it
   needs. "Submit for review" hands that photo to Vision AI,
   which reads the tag against The Shops at Chase catalogue
   and lays what was ordered next to what was received. With
   the record and the photo in agreement, the fix is offered
   on the spot: the right size out today, or a full refund —
   nothing goes back before the replacement goes out.

   Figma: Rymax-Customer-Support-AI-POC
     · v2 · 09 · Photo shot list   (reused shell)
     · v2 · 10 · Guided capture    (reused shell)
     · v2 · 11 · Vision AI reading  (reused shell)
     · v2 · 13 · SKU mismatch      (frame 115:849)
   ======================================================= */

export const wrongSize = (function () {

  /* ── The order, and what the tag actually says ─────────── */

  const ORDER = {
    id:       '#4821',
    ordered:  { sku: '41827-NVY-M', size: 'M', color: 'Navy' },
    received: { sku: '41827-NVY-L', size: 'L', color: 'Navy' },
    price:    '$135.90',
    points:   '13,590 points',
    card:     'Chase card ···· 4821',
    replacement: '#4902',
  };

  /* ── The one photo the check needs ────────────────────── */
  /* Nothing is pre-done here — the tag shot is always taken
     in the flow. Thumbnail falls back to the grey placeholder
     until /photos/tag-stub.jpg exists. See public/photos.     */

  const STUB = `${import.meta.env.BASE_URL}/photos/tag-stub.jpg`;

  const SHOTS = [
    {
      tag:  'PHOTO',
      name: 'The size tag',
      desc: 'SKU and size line in focus',
      img:  STUB,
      done: false,
      capture: {
        title: 'Size tag',
        hint:  'Fit the sewn-in tag inside the frame. Keep the SKU and size line sharp.',
      },
    },
  ];

  /* ── What Vision AI reports back, line by line ─────────── */

  const FINDINGS = [
    { text: 'Tag SKU reads 41827-NVY-L',        done: true  },
    { text: 'Size printed on the tag: L',       done: true  },
    { text: 'Order #4821 was placed for size M', done: true  },
    { text: 'Checking size M availability',      done: false,
      doneText: 'Size M in stock — Ohio warehouse' },
  ];

  /* ── Module state ─────────────────────────────────────── */

  let root   = null;
  let thread = null;
  let live   = null;   /* shot-list card → action row → closing chip */
  let cam    = null;   /* the capture overlay, while mounted         */
  let timer  = null;
  let guard  = null;
  let busy   = false;

  let taken  = SHOTS.map(function (s) { return s.done; });
  let refs   = {};     /* rebuilt each time the shot list mounts     */

  /* ── DOM helpers ──────────────────────────────────────── */

  function el(tag, cls, html) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  const BACK  = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="10 3 5 8 10 13"/></svg>';
  const SEND  = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="14.5" x2="9" y2="3.5"/><polyline points="4.6 7.9 9 3.5 13.4 7.9"/></svg>';
  const CHECK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 8.5 6.5 12 13 4.5"/></svg>';
  const CIRC  = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="8" cy="8" r="5.5"/></svg>';
  const CLOSE = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><line x1="3.5" y1="3.5" x2="12.5" y2="12.5"/><line x1="12.5" y1="3.5" x2="3.5" y2="12.5"/></svg>';
  const CAM   = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5.5h3l1.3-2h5.4L15 5.5h1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z"/><circle cx="9" cy="9.5" r="3"/></svg>';

  function firstPending() {
    for (let i = 0; i < SHOTS.length; i++) if (!taken[i]) return i;
    return -1;
  }

  function doneCount() {
    return taken.reduce(function (n, t) { return n + (t ? 1 : 0); }, 0);
  }

  /* ══════════════════════════════════════════════════════
     Chrome
     ══════════════════════════════════════════════════════ */

  function header() {
    const bar = el('div', 'app-header');

    const back = el('button', 'app-header__back', BACK);
    back.type = 'button';
    back.title = 'Start over';
    back.setAttribute('aria-label', 'Start the conversation over');
    back.addEventListener('click', function () { build(); });
    bar.appendChild(back);

    bar.appendChild(el('p', 'app-header__title', 'Support'));
    bar.appendChild(el('div', 'app-header__spacer'));
    return bar;
  }

  /* Present, never active — see Features 1–5. */
  function composer() {
    const bar = el('div', 'composer');
    bar.setAttribute('aria-hidden', 'true');
    bar.appendChild(el('div', 'composer__input', 'Type your message'));
    bar.appendChild(el('div', 'composer__send', SEND));
    return bar;
  }

  /* ══════════════════════════════════════════════════════
     Message parts
     ══════════════════════════════════════════════════════ */

  function userMsg(text) {
    const row = el('div', 'msg msg--user');
    row.appendChild(el('div', 'msg__user-bubble', text));
    return row;
  }

  function botRow(body) {
    const row = el('div', 'msg msg--bot');
    row.appendChild(el('p', 'msg__bot-label', 'Support assistant'));
    row.appendChild(body);
    return row;
  }

  function typingRow() {
    return botRow(el('div', 'typing', '<span></span><span></span><span></span>'));
  }

  /* Fill a thumb with the captured photo, or leave the
     placeholder colour showing if the file is not there yet. */
  function paintThumb(node, src) {
    node.classList.add('is-filled');
    if (src) node.style.backgroundImage = 'url("' + src + '")';
  }

  /* ══════════════════════════════════════════════════════
     Opening message — the conversation already in progress
     ══════════════════════════════════════════════════════ */

  function intro() {
    const block = el('div', 'chat-intro');
    block.appendChild(userMsg('You sent the wrong size — I ordered a medium and a large turned up.'));
    block.appendChild(botRow(el('div', 'prompt-card',
      'Let’s settle it from the label. One photo of the sewn-in size tag and I can send the right one out — nothing to return first.')));
    live = shotList();
    block.appendChild(live);
    return block;
  }

  /* ── Shot list — built once; capture only mutates cells ── */

  function shotRow(shot, i) {
    const row = el('div', 'shot');

    const thumb = el('span', 'shot__thumb');
    if (taken[i]) paintThumb(thumb, shot.img);
    row.appendChild(thumb);

    const body = el('div', 'shot__body');
    body.appendChild(el('span', 'shot__tag', shot.tag));
    body.appendChild(el('span', 'shot__name', shot.name));
    body.appendChild(el('span', 'shot__desc', shot.desc));
    row.appendChild(body);

    const state = el('div', 'shot__state');
    row.appendChild(state);

    refs.rows[i]   = row;
    refs.thumbs[i] = thumb;
    refs.states[i] = state;
    paintState(i);
    return row;
  }

  /* The right-hand cell: check / "Take photo" / "Waiting". */
  function paintState(i) {
    const state = refs.states[i];
    const row   = refs.rows[i];
    state.innerHTML = '';
    row.classList.remove('is-active');

    if (taken[i]) {
      state.appendChild(el('span', 'shot__check', CHECK));
      return;
    }
    if (i === firstPending()) {
      row.classList.add('is-active');
      const btn = el('button', 'shot__take', CAM + '<span>Take photo</span>');
      btn.type = 'button';
      btn.addEventListener('click', function () { openCam(i); });
      state.appendChild(btn);
      return;
    }
    state.appendChild(el('span', 'shot__wait', 'Waiting'));
  }

  function shotList() {
    refs = { rows: {}, thumbs: {}, states: {}, count: null, submit: null };

    const card = el('div', 'shotlist');

    const head = el('div', 'shotlist__head');
    head.appendChild(el('span', 'shotlist__label',
      SHOTS.length === 1 ? 'PHOTO NEEDED' : 'PHOTOS NEEDED'));
    head.appendChild(el('span', 'shotlist__rule'));
    refs.count = el('span', 'shotlist__count',
      doneCount() + ' of ' + SHOTS.length + ' done');
    head.appendChild(refs.count);
    card.appendChild(head);

    const rows = el('div', 'shotlist__rows');
    SHOTS.forEach(function (s, i) { rows.appendChild(shotRow(s, i)); });
    card.appendChild(rows);

    const submit = el('button', 'shotlist__submit', 'Submit for review');
    submit.type = 'button';
    submit.disabled = doneCount() < SHOTS.length;
    submit.addEventListener('click', submitForReview);
    refs.submit = submit;
    card.appendChild(submit);

    card.appendChild(el('p', 'shotlist__note',
      SHOTS.length === 1
        ? 'Available once the tag photo is taken.'
        : 'Available once all ' + SHOTS.length + ' photos are taken.'));

    return card;
  }

  /* ══════════════════════════════════════════════════════
     Guided capture — a full-screen overlay on the app
     ══════════════════════════════════════════════════════ */

  function openCam(i) {
    if (cam || busy) return;
    const shot = SHOTS[i];
    const cap  = shot.capture || {};

    const panel = el('div', 'cam');

    const top = el('div', 'cam__top');
    const x = el('button', 'cam__close', CLOSE);
    x.type = 'button';
    x.setAttribute('aria-label', 'Close camera');
    x.addEventListener('click', function () { closeCam(); });
    top.appendChild(x);
    top.appendChild(el('p', 'cam__title',
      (cap.title || shot.name) + ' · ' + (i + 1) + ' of ' + SHOTS.length));
    top.appendChild(el('span', 'cam__close', ''));
    panel.appendChild(top);

    const stage = el('div', 'cam__stage');
    stage.appendChild(el('span', 'cam__guide'));
    panel.appendChild(stage);

    const bottom = el('div', 'cam__bottom');
    bottom.appendChild(el('p', 'cam__hint',
      cap.hint || 'Hold steady and fill the frame.'));
    const shutter = el('button', 'cam__shutter', '<span></span>');
    shutter.type = 'button';
    shutter.setAttribute('aria-label', 'Take photo');
    shutter.addEventListener('click', function () { shoot(i); });
    bottom.appendChild(shutter);
    bottom.appendChild(el('p', 'cam__fine',
      'Blurry or dark shots are rejected on the spot'));
    panel.appendChild(bottom);

    root.appendChild(panel);
    cam = panel;
    requestAnimationFrame(function () { panel.classList.add('is-open'); });
  }

  function closeCam() {
    if (!cam) return;
    const p = cam;
    cam = null;
    p.classList.remove('is-open');
    setTimeout(function () { p.remove(); }, 240);
  }

  function shoot(i) {
    if (!cam || busy) return;
    const p = cam;
    p.classList.add('is-shot');
    setTimeout(function () {
      closeCam();
      fillShot(i);
    }, 160);
  }

  function fillShot(i) {
    if (taken[i]) return;
    taken[i] = true;

    paintThumb(refs.thumbs[i], SHOTS[i].img);
    refs.count.textContent = doneCount() + ' of ' + SHOTS.length + ' done';

    /* This shot → check; the next pending one → active. */
    paintState(i);
    const next = firstPending();
    if (next !== -1) paintState(next);

    if (doneCount() >= SHOTS.length && refs.submit) {
      refs.submit.disabled = false;
      refs.submit.classList.add('is-ready');
    }
  }

  function retireLive() {
    if (live) { live.classList.add('is-spent'); live = null; }
  }

  /* ══════════════════════════════════════════════════════
     Submit → Vision AI reads the tag → decision
     ══════════════════════════════════════════════════════ */

  function scanCard() {
    const card = el('div', 'scan');

    const stage = el('div', 'scan__stage');
    stage.appendChild(el('span', 'scan__line'));
    stage.appendChild(el('span', 'scan__badge', 'ANALYZING'));
    card.appendChild(stage);

    const thumbs = el('div', 'scan__thumbs');
    SHOTS.forEach(function (s) {
      const t = el('span', 'scan__thumb');
      paintThumb(t, s.img);
      thumbs.appendChild(t);
    });
    card.appendChild(thumbs);

    card.appendChild(el('p', 'scan__found', 'WHAT VISION AI FOUND'));

    const list = el('div', 'scan__list');
    FINDINGS.forEach(function (f) {
      const item = el('div', 'scan__item' + (f.done ? '' : ' is-pending'));
      item.appendChild(el('span', 'scan__item-icon', f.done ? CHECK : CIRC));
      item.appendChild(el('span', 'scan__item-text', f.text));
      list.appendChild(item);
    });
    card.appendChild(list);

    card.appendChild(el('p', 'scan__note',
      'Typically 2–4 seconds. If the tag will not read, your photo and order ' +
      ORDER.id + ' go straight to a specialist — you do nothing again.'));

    refs.scan = { card: card, stage: stage, list: list };
    return card;
  }

  function finishScan() {
    const s = refs.scan;
    if (!s) return;
    s.card.classList.add('is-complete');
    s.stage.querySelector('.scan__badge').textContent = 'ANALYSED';
    const last = s.list.lastChild;
    last.classList.remove('is-pending');
    last.firstChild.innerHTML = CHECK;
    const done = FINDINGS[FINDINGS.length - 1].doneText;
    if (done) last.lastChild.textContent = done;
  }

  /* ── The SKU-mismatch decision — ordered vs received ───── */

  function compareRow(key, val, pill) {
    const row = el('div', 'compare__row');
    row.appendChild(el('span', 'compare__key', key));
    row.appendChild(el('span',
      'compare__val' + (pill ? ' compare__val--pill' : ''), val));
    return row;
  }

  function compareCard(label, data, opt) {
    opt = opt || {};
    const card = el('div', 'compare' + (opt.flag ? ' compare--flag' : ''));

    const head = el('div', 'compare__head');
    head.appendChild(el('span', 'compare__label', label));
    head.appendChild(el('span', 'compare__rule'));
    if (opt.hint) head.appendChild(el('span', 'compare__hint', opt.hint));
    card.appendChild(head);

    const body = el('div', 'compare__body');
    body.appendChild(el('span', 'compare__thumb'));
    const rows = el('div', 'compare__rows');
    rows.appendChild(compareRow('SKU',   data.sku,   opt.pill));
    rows.appendChild(compareRow('Size',  data.size,  opt.pill));
    rows.appendChild(compareRow('Color', data.color, false));
    body.appendChild(rows);
    card.appendChild(body);
    return card;
  }

  function decisionCard() {
    const wrap = el('div', 'decision');
    wrap.appendChild(el('div', 'prompt-card',
      'I read the tag in your photo. Here is what came back.'));
    wrap.appendChild(compareCard('YOU ORDERED', ORDER.ordered, {}));
    wrap.appendChild(compareCard('YOU RECEIVED', ORDER.received,
      { flag: true, hint: 'From your photo', pill: true }));
    wrap.appendChild(el('div', 'prompt-card',
      'Size mismatch confirmed — this one is on us.'));
    return wrap;
  }

  function actionRow() {
    const stack = el('div', 'action-stack');

    const send = el('button', 'action-btn');
    send.type = 'button';
    send.appendChild(el('span', 'action-btn__label', 'Send the right size'));
    send.appendChild(el('span', 'action-btn__sub', 'Size M in stock · arrives Sep 12'));
    send.addEventListener('click', function () { resolve('replace'); });
    stack.appendChild(send);

    const refund = el('button', 'action-btn action-btn--ghost',
      'Refund ' + ORDER.price + ' instead');
    refund.type = 'button';
    refund.addEventListener('click', function () { resolve('refund'); });
    stack.appendChild(refund);

    return stack;
  }

  /* ── Confirmation card — the thread ends here ──────────── */

  function doneCard(kind) {
    const card = el('div', 'cancel-done');

    const head = el('div', 'cancel-done__head');
    head.appendChild(el('span', 'cancel-done__check', CHECK));
    head.appendChild(el('p', 'cancel-done__title',
      kind === 'replace' ? 'Size M is on the way' : 'Refund is on its way'));
    card.appendChild(head);

    const rows = kind === 'replace'
      ? [
          ['Replacement', 'Merino Crew Sweater · Navy · M'],
          ['Order',       ORDER.replacement + ' · ships today'],
          ['Arrives',     'Sep 12 · tracking within 2 hours'],
          ['The large',   'Prepaid label emailed · 14 days'],
        ]
      : [
          ['Refund',    ORDER.price + ' · or ' + ORDER.points],
          ['Back to',   ORDER.card],
          ['Lands in',  '3–5 business days'],
          ['The large', 'Prepaid label emailed · 14 days'],
        ];

    const list = el('div', 'cancel-done__list');
    rows.forEach(function (pair) {
      const r = el('div', 'cancel-done__row');
      r.appendChild(el('span', 'cancel-done__row-key', pair[0]));
      r.appendChild(el('span', 'cancel-done__row-val', pair[1]));
      list.appendChild(r);
    });
    card.appendChild(list);

    card.appendChild(el('p', 'cancel-done__note',
      kind === 'replace'
        ? 'A confirmation email is on its way. Drop the large at any UPS point when it suits you — nothing else is needed.'
        : 'A confirmation email is on its way. Send the large back with the prepaid label within 14 days — that is the only thing left.'));
    return card;
  }

  function submitForReview() {
    if (busy || doneCount() < SHOTS.length) return;
    busy = true;
    retireLive();

    thread.appendChild(userMsg('Submit for review'));
    scrollDown();

    const pending = typingRow();
    thread.appendChild(pending);
    scrollDown();

    clearTimeout(timer);
    timer = setTimeout(function () {
      thread.replaceChild(botRow(el('div', 'prompt-card',
        'Got it. Reading the tag now.')), pending);
      thread.appendChild(botRow(scanCard()));
      scrollDown();

      clearTimeout(timer);
      timer = setTimeout(function () {
        finishScan();
        scrollDown();

        clearTimeout(timer);
        timer = setTimeout(function () {
          thread.appendChild(botRow(decisionCard()));
          live = actionRow();
          thread.appendChild(live);

          busy = false;
          scrollDown();
        }, 900);
      }, 1600);
    }, 900);
  }

  function resolve(kind) {
    if (busy) return;
    busy = true;
    retireLive();

    thread.appendChild(userMsg(
      kind === 'replace' ? 'Send the right size' : 'Refund ' + ORDER.price + ' instead'));
    scrollDown();

    const pending = typingRow();
    thread.appendChild(pending);
    scrollDown();

    clearTimeout(timer);
    timer = setTimeout(function () {
      thread.replaceChild(botRow(doneCard(kind)), pending);

      live = el('div', 'thread__suggestions');
      const over = el('button', 'chip chip--sm', 'Start over');
      over.type = 'button';
      over.addEventListener('click', function () { build(); });
      live.appendChild(over);
      thread.appendChild(live);

      busy = false;
      scrollDown();
    }, 900);
  }

  /* Smooth scroll with a snap fallback — see Feature 1. */
  function scrollDown() {
    const before = thread.scrollTop;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    thread.scrollTo({ top: thread.scrollHeight, behavior: motion ? 'auto' : 'smooth' });

    clearTimeout(guard);
    guard = setTimeout(function () {
      if (thread.scrollTop === before) thread.scrollTop = thread.scrollHeight;
    }, 400);
  }

  /* ══════════════════════════════════════════════════════
     Build / reset
     ══════════════════════════════════════════════════════ */

  function build() {
    clearTimeout(timer);
    clearTimeout(guard);
    busy = false;
    live = null;
    taken = SHOTS.map(function (s) { return s.done; });

    if (cam) { cam.remove(); cam = null; }

    root.innerHTML = '';

    const app = el('div', 'app');
    app.appendChild(header());

    thread = el('div', 'thread');
    thread.id = 'thread';
    thread.appendChild(intro());
    app.appendChild(thread);

    app.appendChild(composer());
    root.appendChild(app);
  }

  /* ── Public API ───────────────────────────────────────── */

  return {
    render: function () {
      root = el('div', 'app-root');
      build();
      return root;
    },
    reset: function () {
      clearTimeout(timer);
      clearTimeout(guard);
      busy = false;
      live = null;
      if (cam) { cam.remove(); cam = null; }
    },
  };

})();
