/* =======================================================
   Feature 3 — Automatic Data & Context Collection

   Same append-only transcript as Features 1 & 2. Marcus has
   already described a damaged arrival; the one live action is
   "Talk to a specialist". Tapping it does not open a blank
   ticket — the assistant assembles one. A bottom sheet slides
   up listing everything already gathered (order, contact,
   carrier scan, the stated issue) and the single thing still
   missing (the third photo), each line labelled with where it
   came from. "Continue" hands the specialist a complete file.

   Figma: Rymax-Customer-Support-AI-POC · v2 · 04 · Case file
   (frame 109:16 — the "What we have gathered" sheet)
   ======================================================= */

export const contextCollection = (function () {

  /* ── The conversation so far ──────────────────────────── */

  const ISSUE = 'The box arrived crushed and the sweater is torn.';

  const ANSWER = {
    code: 'DMG-11',
    lead: 'A damaged arrival is covered for a full replacement or a full refund, and you never pay return shipping.',
    list: [
      'Report within <b>30 days</b> of delivery — this one landed Sep 6.',
      'Add 2–3 photos: the item, and the outer packaging.',
      'A replacement ships in <b>2 business days</b>, or a refund posts in 3–5.',
    ],
    note: 'Hold on to the packaging until the claim closes — the carrier may ask to inspect it.',
  };

  /* ── What the assistant can pull without asking ────────── */

  const GATHERED = [
    { name: 'Order #4821',                            source: 'From your account' },
    { name: 'Marcus R. · contact details',            source: 'From your account' },
    { name: 'Delivered Sep 6, 11:04 · carrier scan',  source: 'From the carrier'  },
    { name: 'Issue: damaged packaging &amp; torn item', source: 'You told us'      },
  ];

  const PHOTO_PENDING = { name: 'Photos — 2 of 3', sub: 'One more needed: the shipping label' };
  const PHOTO_DONE    = { name: 'Photos — 3 of 3', sub: 'Item, packaging and shipping label attached' };

  /* ── Module state ─────────────────────────────────────── */

  let root   = null;
  let thread = null;
  let live   = null;    /* the current live chip row           */
  let sheet  = null;    /* the bottom sheet, while mounted      */
  let timer  = null;
  let guard  = null;
  let busy   = false;
  let photoAdded = false;
  let escalated  = false;

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
  const CIRC  = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="8" r="5.5"/></svg>';
  const CLOSE = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><line x1="3.5" y1="3.5" x2="12.5" y2="12.5"/><line x1="12.5" y1="3.5" x2="3.5" y2="12.5"/></svg>';
  const LOCK  = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="11" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>';

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

  /* Present, never active — see Features 1 & 2. */
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

  function answerCard(a) {
    const card = el('div', 'answer-card');
    card.appendChild(el('p', 'answer-card__lead', a.lead));

    const list = el('ul', 'answer-card__list');
    a.list.forEach(function (item) { list.appendChild(el('li', null, item)); });
    card.appendChild(list);

    card.appendChild(el('p', 'answer-card__note', a.note));
    card.appendChild(el('div', 'answer-card__source',
      LOCK + '<span>Approved script · ' + a.code + ' · v4.2</span>'));
    return card;
  }

  function noteCard(text) {
    return el('div', 'answer-card', '<p class="answer-card__lead">' + text + '</p>');
  }

  function handoffCard() {
    const card = el('div', 'handoff');
    const head = el('div', 'handoff__row');
    head.appendChild(el('span', 'handoff__dot'));
    head.appendChild(el('p', 'handoff__title', 'Specialist joining · about 2 min'));
    card.appendChild(head);
    card.appendChild(el('p', 'handoff__body',
      'Your claim goes across complete — order #4821, your contact details, the carrier scan, the stated issue and all three photos. Nothing on that list gets asked again.'));
    return card;
  }

  /* ══════════════════════════════════════════════════════
     Opening message — the conversation already in progress
     ══════════════════════════════════════════════════════ */

  function intro() {
    const block = el('div', 'chat-intro');
    block.appendChild(userMsg(ISSUE));
    block.appendChild(botRow(answerCard(ANSWER)));
    block.appendChild(chips());
    return block;
  }

  function chips() {
    live = el('div', 'thread__suggestions');
    const spec = el('button', 'chip chip--sm chip--escalate', 'Talk to a specialist');
    spec.type = 'button';
    spec.addEventListener('click', escalate);
    live.appendChild(spec);
    return live;
  }

  function retireLive() {
    if (live) { live.classList.add('is-spent'); live = null; }
  }

  /* ══════════════════════════════════════════════════════
     Escalation — assemble the file, then show it
     ══════════════════════════════════════════════════════ */

  function escalate() {
    if (busy) return;
    busy = true;
    retireLive();

    thread.appendChild(userMsg('Talk to a specialist'));
    scrollDown();

    const pending = typingRow();
    thread.appendChild(pending);
    scrollDown();

    clearTimeout(timer);
    timer = setTimeout(function () {
      thread.replaceChild(
        botRow(noteCard('I have most of what a claim needs already. Here is what goes across with you — check it before I bring someone in.')),
        pending);
      escalated = true;
      busy = false;
      scrollDown();
      openSheet();
    }, 900);
  }

  /* Silent re-open, once the sheet has been seen once. */
  function reopenChip() {
    live = el('div', 'thread__suggestions');
    const again = el('button', 'chip chip--sm', 'Review the handover');
    again.type = 'button';
    again.addEventListener('click', function () { retireLive(); openSheet(); });
    live.appendChild(again);
    thread.appendChild(live);
    scrollDown();
  }

  /* ══════════════════════════════════════════════════════
     Bottom sheet — "What we have gathered"
     ══════════════════════════════════════════════════════ */

  function gatheredRow(item, state) {
    const row = el('div', 'gathered');

    const icon = el('div', 'gathered__icon gathered__icon--' + state,
      state === 'todo' ? CIRC : CHECK);
    row.appendChild(icon);

    const text = el('div', 'gathered__text');
    text.appendChild(el('p', 'gathered__name', item.name));
    text.appendChild(el('p', 'gathered__source', item.source || item.sub));
    row.appendChild(text);

    return row;
  }

  function openSheet() {
    if (sheet) return;

    const scrim = el('div', 'sheet-scrim');
    scrim.addEventListener('click', function () { closeSheet(); });

    const panel = el('div', 'sheet');

    panel.appendChild(el('div', 'sheet__grip-wrap', '<span class="sheet__grip"></span>'));

    const head = el('div', 'sheet__head');
    head.appendChild(el('p', 'sheet__title', 'What we have gathered'));
    head.appendChild(el('div', 'app-header__spacer'));
    const x = el('button', 'sheet__close', CLOSE);
    x.type = 'button';
    x.setAttribute('aria-label', 'Close');
    x.addEventListener('click', function () { closeSheet(); });
    head.appendChild(x);
    panel.appendChild(head);

    const listBox = el('div', 'sheet__list');
    GATHERED.forEach(function (item) { listBox.appendChild(gatheredRow(item, 'done')); });

    /* The one outstanding line — has an Add button until filled. */
    const photoRow = gatheredRow(photoAdded ? PHOTO_DONE : PHOTO_PENDING,
      photoAdded ? 'done' : 'todo');
    if (!photoAdded) {
      const add = el('button', 'gathered__add', 'Add');
      add.type = 'button';
      add.addEventListener('click', addPhoto);
      photoRow.appendChild(add);
    }
    listBox.appendChild(photoRow);
    panel.appendChild(listBox);

    panel.appendChild(el('div', 'sheet__spacer'));

    const foot = el('div', 'sheet__foot');
    foot.appendChild(el('p', 'sheet__note',
      'Nothing here will be asked again — not by me, not by a specialist.'));
    const cont = el('button', 'sheet__continue' + (photoAdded ? '' : ' is-disabled'),
      'Continue');
    cont.type = 'button';
    cont.addEventListener('click', function () { if (photoAdded) continueHandoff(); });
    foot.appendChild(cont);
    panel.appendChild(foot);

    root.appendChild(scrim);
    root.appendChild(panel);
    sheet = { scrim: scrim, panel: panel };

    /* next frame → slide up */
    requestAnimationFrame(function () {
      scrim.classList.add('is-open');
      panel.classList.add('is-open');
    });
  }

  function addPhoto() {
    if (!sheet || photoAdded) return;
    photoAdded = true;

    const rows = sheet.panel.querySelectorAll('.gathered');
    const last = rows[rows.length - 1];
    last.replaceWith(gatheredRow(PHOTO_DONE, 'done'));

    const cont = sheet.panel.querySelector('.sheet__continue');
    cont.classList.remove('is-disabled');
    cont.classList.add('is-ready');
  }

  function closeSheet(continuing) {
    if (!sheet) return;
    const s = sheet;
    sheet = null;

    s.scrim.classList.remove('is-open');
    s.panel.classList.remove('is-open');

    setTimeout(function () {
      s.scrim.remove();
      s.panel.remove();
    }, 260);

    /* Dismissed without continuing — leave a way back in. */
    if (!continuing && escalated && !thread.querySelector('.handoff')) reopenChip();
  }

  function continueHandoff() {
    retireLive();
    closeSheet(true);
    clearTimeout(timer);
    timer = setTimeout(function () {
      thread.appendChild(botRow(handoffCard()));
      scrollDown();

      live = el('div', 'thread__suggestions');
      const over = el('button', 'chip chip--sm', 'Start over');
      over.type = 'button';
      over.addEventListener('click', function () { build(); });
      live.appendChild(over);
      thread.appendChild(live);
      scrollDown();
    }, 320);
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
    photoAdded = false;
    escalated = false;

    if (sheet) { sheet.scrim.remove(); sheet.panel.remove(); sheet = null; }

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
      if (sheet) { sheet.scrim.remove(); sheet.panel.remove(); sheet = null; }
    },
  };

})();
