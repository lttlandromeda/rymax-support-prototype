/* =======================================================
   Feature 5 — Empty Box or Damaged Merchandise (Vision AI)

   Same append-only transcript as Features 1–4. Marcus has
   said the box arrived crushed; the assistant does not open
   a claim form — it asks for three specific photos and takes
   them one guided shot at a time. "Submit for review" hands
   the set to Vision AI, which reads the images on-screen and
   returns a decision: damage confirmed, replacement approved.
   The decision screen is terminal — nothing on it is live.

   Figma: Rymax-Customer-Support-AI-POC
     · v2 · 09 · Photo shot list     (frame 112:222)
     · v2 · 10 · Guided capture      (frame 112:271)
     · v2 · 11 · Vision AI reading    (frame 112:286)
     · v2 · 12 · Decision            (frame 112:330)
   ======================================================= */

export const damagedMerchandise = (function () {

  /* ── Photo evidence the claim needs ───────────────────── */
  /* PHOTO 1 is already on file. The rest are captured in the
     flow. `img` is the thumbnail once taken — every shot points
     at the one placeholder photo for now; swap per-shot later. */

  const STUB = '/photos/damage-stub.jpg';

  const SHOTS = [
    {
      tag:  'PHOTO 1',
      name: 'The box from outside',
      desc: 'All four corners in frame',
      img:  STUB,
      done: true,
    },
    {
      tag:  'PHOTO 2',
      name: 'The shipping label',
      desc: 'So I can match it to your order',
      img:  STUB,
      done: true,
    },
    {
      tag:  'PHOTO 3',
      name: 'What was inside',
      desc: 'Item and any packing material',
      img:  STUB,
      done: false,
      capture: {
        title: 'What was inside',
        hint:  'Get the item and the packing material in one shot, lit evenly.',
      },
    },
  ];

  /* ── What Vision AI reports back, line by line ─────────── */

  const FINDINGS = [
    { text: 'Outer packaging seal broken',        done: true  },
    { text: 'Crushed corner — impact damage',     done: true  },
    { text: 'Label matches order #4821',          done: true  },
    { text: 'Comparing item to the catalog image', done: false,
      doneText: 'Item matches the catalog image' },
  ];

  const VERDICT = {
    confidence: 'CONFIDENCE 94%',
    title: 'Damage confirmed — replacement approved',
    next: [
      'A replacement ships today from the Ohio warehouse.',
      'Tracking reaches your email within two hours.',
      'Keep or recycle the damaged box — nothing to send back.',
    ],
    product: {
      name: 'Merino Crew Sweater · Navy · M',
      meta: 'Replacement #4902 · arrives Sep 12',
    },
    note: 'Decided by Vision AI against the Chase damage policy. Anything below the confidence threshold is routed to a person automatically.',
  };

  /* ── Module state ─────────────────────────────────────── */

  let root   = null;
  let thread = null;
  let live   = null;   /* the shot-list card, then the closing chip */
  let cam    = null;   /* the capture overlay, while mounted        */
  let timer  = null;
  let guard  = null;
  let busy   = false;

  let taken  = SHOTS.map(function (s) { return s.done; });
  let refs   = {};     /* rebuilt each time the shot list mounts    */

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

  /* Present, never active — see Features 1–4. */
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
    block.appendChild(userMsg('The box arrived crushed.'));
    block.appendChild(botRow(el('div', 'prompt-card',
      'Sorry about that. Three photos and I can approve a replacement right away — no waiting for an agent.')));
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
    head.appendChild(el('span', 'shotlist__label', 'PHOTOS NEEDED'));
    head.appendChild(el('span', 'shotlist__rule'));
    refs.count = el('span', 'shotlist__count', doneCount() + ' of 3 done');
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
      'Available once all three photos are taken.'));

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
      (cap.title || shot.name) + ' · ' + (i + 1) + ' of 3'));
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
    refs.count.textContent = doneCount() + ' of 3 done';

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
     Submit → Vision AI reads the set → decision
     ══════════════════════════════════════════════════════ */

  function scanCard() {
    const card = el('div', 'scan');

    const stage = el('div', 'scan__stage');
    stage.appendChild(el('span', 'scan__line'));
    stage.appendChild(el('span', 'scan__badge', 'ANALYZING 2 OF 3'));
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
      'Typically 2–4 seconds. If confidence is low, the case and these photos go straight to a specialist — you do nothing again.'));

    refs.scan = { card: card, stage: stage, list: list };
    return card;
  }

  function finishScan() {
    const s = refs.scan;
    if (!s) return;
    s.card.classList.add('is-complete');
    s.stage.querySelector('.scan__badge').textContent = 'ANALYSED 3 OF 3';
    const last = s.list.lastChild;
    last.classList.remove('is-pending');
    last.firstChild.innerHTML = CHECK;
    const done = FINDINGS[FINDINGS.length - 1].doneText;
    if (done) last.lastChild.textContent = done;
  }

  function verdictCard() {
    const card = el('div', 'verdict');

    const head = el('div', 'verdict__head');
    head.appendChild(el('span', 'verdict__label', 'DECISION'));
    head.appendChild(el('span', 'verdict__rule'));
    head.appendChild(el('span', 'verdict__conf', VERDICT.confidence));
    card.appendChild(head);

    card.appendChild(el('p', 'verdict__title', VERDICT.title));
    card.appendChild(el('span', 'verdict__hr'));

    card.appendChild(el('p', 'verdict__next', 'WHAT HAPPENS NEXT'));
    const steps = el('ol', 'step-list');
    VERDICT.next.forEach(function (text, i) {
      const item = el('li', 'step-list__item');
      item.appendChild(el('span', 'step-list__num', String(i + 1)));
      item.appendChild(el('p', 'step-list__text', text));
      steps.appendChild(item);
    });
    card.appendChild(steps);

    const prod = el('div', 'verdict__product');
    prod.appendChild(el('span', 'verdict__product-thumb'));
    const ptext = el('div', 'verdict__product-text');
    ptext.appendChild(el('span', 'verdict__product-name', VERDICT.product.name));
    ptext.appendChild(el('span', 'verdict__product-meta', VERDICT.product.meta));
    prod.appendChild(ptext);
    card.appendChild(prod);

    /* Terminal screen — the two controls are shown, not wired. */
    const actions = el('div', 'verdict__actions');
    actions.appendChild(el('span', 'verdict__btn verdict__btn--primary',
      'Track the replacement'));
    actions.appendChild(el('span', 'verdict__btn verdict__btn--ghost',
      'This is not right — get a specialist'));
    card.appendChild(actions);

    card.appendChild(el('p', 'verdict__note', VERDICT.note));
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
        'Got all three. Reading them now.')), pending);
      thread.appendChild(botRow(scanCard()));
      scrollDown();

      clearTimeout(timer);
      timer = setTimeout(function () {
        finishScan();
        scrollDown();

        clearTimeout(timer);
        timer = setTimeout(function () {
          thread.appendChild(botRow(verdictCard()));
          scrollDown();

          live = el('div', 'thread__suggestions');
          const over = el('button', 'chip chip--sm', 'Start over');
          over.type = 'button';
          over.addEventListener('click', function () { build(); });
          live.appendChild(over);
          thread.appendChild(live);

          busy = false;
          scrollDown();
        }, 900);
      }, 1600);
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
