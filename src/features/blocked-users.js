/* =======================================================
   Feature 2 — Assisting Blocked / Confused Users

   Same conversation engine as Feature 1 — one append-only
   transcript, an inert composer drawn from the Figma frame —
   but the assistant opens already knowing where the customer
   is stuck. It has the page, the step and the error code from
   the session, so there is no "describe your problem" step:
   it states what it sees, asks one narrowing question, then
   walks the fix field by field.

   Figma: Rymax-Customer-Support-AI-POC · v2 · 03 · Blocked user
   ======================================================= */

export const blockedUsers = (function () {

  /* ── Session context the assistant already holds ───────── */
  /* Rendered as the opening message — the customer confirms a
     symptom rather than typing the situation out.            */

  const CONTEXT = {
    label: 'We see where you are',
    text: 'You are on <b>Checkout → Payment</b>, step 3 of 4. The card form returned error <b>CARD_DECL_51</b> twice.',
    steps: [
      { name: 'Cart',     state: 'done'  },
      { name: 'Shipping', state: 'done'  },
      { name: 'Payment',  state: 'error' },
      { name: 'Review',   state: 'todo'  },
    ],
  };

  const PROMPT = 'Which one matches what you are seeing?';

  /* ── Symptoms + the approved fix for each ──────────────── */
  /* `steps` is the "Try this — 3 steps" card, straight from the
     Figma frame for the declined-card case. `walk` drives the
     "Show me on the page" walkthrough, one field per tap.     */

  const SYMPTOMS = [
    {
      id:   'declined',
      text: 'Card was declined',
      code: 'PAY-DECL-51',
      steps: [
        'Re-enter the billing ZIP exactly as it appears on your statement.',
        'Clear the saved card and add it again.',
        'If it declines a third time, your bank has flagged it — use another card.',
      ],
      walk: [
        { field: 'Billing ZIP',   page: 'Checkout → Payment', hint: 'Key the ZIP in exactly as your bank statement shows it, then tap <b>Update</b>.' },
        { field: 'Saved card',    page: 'Checkout → Payment', hint: 'Tap <b>Remove</b>, then <b>Add card</b> and type the number in again.' },
        { field: 'Place order',   page: 'Checkout → Payment', hint: 'Submit once more. A third decline means the block is on the bank’s side.' },
      ],
    },
    {
      id:   'address',
      text: 'Address will not save',
      code: 'ADDR-SAVE-02',
      steps: [
        'Open Shipping and check the address has a street number and a five-digit ZIP.',
        'Remove any accented letters or line breaks — the form rejects them without a message.',
        'Save again. If it still will not hold, add it as a new address rather than editing the old one.',
      ],
      walk: [
        { field: 'Address line 1', page: 'Checkout → Shipping', hint: 'Start with the street number. Tap <b>Save</b> and wait for the green tick.' },
        { field: 'ZIP code',       page: 'Checkout → Shipping', hint: 'Five digits, no spaces. The field clears itself if the format is off.' },
        { field: 'Add new address', page: 'Checkout → Shipping', hint: 'If the edit keeps failing, use <b>Add new address</b> and delete the old one after.' },
      ],
    },
    {
      id:   'page',
      text: 'Page will not load',
      code: 'PAGE-LOAD-03',
      steps: [
        'Reload once — a stuck checkout step usually clears on the second try.',
        'Turn off any ad or script blocker for chase.com, then reload.',
        'Still blank after 30 seconds? Switch browsers and pick up from your cart.',
      ],
      walk: [
        { field: 'Reload',            page: 'Browser',              hint: 'Pull down to refresh, or tap the reload icon in the address bar once.' },
        { field: 'Content blockers',  page: 'Site settings',        hint: 'Set blockers to <b>Off</b> for chase.com, then return to checkout.' },
        { field: 'Resume checkout',   page: 'Cart',                 hint: 'Your cart is saved. Open it and tap <b>Checkout</b> to start the step again.' },
      ],
    },
  ];

  const bySymptom = {};
  SYMPTOMS.forEach(function (s) { bySymptom[s.id] = s; });

  /* ── Module state ─────────────────────────────────────── */

  let root   = null;
  let thread = null;
  let live   = null;    /* the current live chip / action row  */
  let timer  = null;
  let guard  = null;
  let busy   = false;

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
  const CROSS = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>';
  const CIRC  = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="8" r="5.5"/></svg>';
  const LOCK  = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="11" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>';
  const PIN   = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 14s5-4.4 5-8A5 5 0 0 0 3 6c0 3.6 5 8 5 8Z"/><circle cx="8" cy="6" r="1.7"/></svg>';

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

  /* Present, never active — see Feature 1. */
  function composer() {
    const bar = el('div', 'composer');
    bar.setAttribute('aria-hidden', 'true');
    bar.appendChild(el('div', 'composer__input', 'Type your message'));
    bar.appendChild(el('div', 'composer__send', SEND));
    return bar;
  }

  /* ══════════════════════════════════════════════════════
     Opening message — the session context, in the transcript
     ══════════════════════════════════════════════════════ */

  const STEP_ICON = { done: CHECK, error: CROSS, todo: CIRC };

  function stepper(steps) {
    const row = el('div', 'stepper');
    steps.forEach(function (s) {
      const item = el('div', 'stepper__item' + (s.state === 'error' ? ' is-active' : ''));
      item.appendChild(el('div', 'stepper__dot stepper__dot--' + s.state, STEP_ICON[s.state]));
      item.appendChild(el('p', 'stepper__name', s.name));
      row.appendChild(item);
    });
    return row;
  }

  function intro() {
    const block = el('div', 'chat-intro');

    const card = el('div', 'context-card');
    card.appendChild(el('p', 'context-card__label', CONTEXT.label));
    card.appendChild(el('p', 'context-card__text', CONTEXT.text));
    card.appendChild(stepper(CONTEXT.steps));
    block.appendChild(card);

    block.appendChild(el('div', 'prompt-card', PROMPT));

    live = el('div', 'thread__suggestions');
    SYMPTOMS.forEach(function (s) {
      const chip = el('button', 'chip', s.text);
      chip.type = 'button';
      chip.addEventListener('click', function () { pickSymptom(s); });
      live.appendChild(chip);
    });
    block.appendChild(live);

    return block;
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

  function fixCard(sym) {
    const card = el('div', 'answer-card');
    card.appendChild(el('p', 'context-card__label', 'Try this — 3 steps'));

    const list = el('ol', 'step-list');
    sym.steps.forEach(function (text, i) {
      const item = el('li', 'step-list__item');
      item.appendChild(el('span', 'step-list__num', String(i + 1)));
      item.appendChild(el('p', 'step-list__text', text));
      list.appendChild(item);
    });
    card.appendChild(list);

    card.appendChild(el('div', 'answer-card__source',
      LOCK + '<span>Approved guidance · ' + sym.code + '</span>'));
    return card;
  }

  function walkCard(stop, index, total) {
    const card = el('div', 'walk-card');

    const meta = el('div', 'walk-card__meta');
    meta.appendChild(el('span', 'walk-card__pin', PIN));
    meta.appendChild(el('span', null, stop.page + ' · field ' + (index + 1) + ' of ' + total));
    card.appendChild(meta);

    const field = el('div', 'walk-card__field');
    field.appendChild(el('p', 'walk-card__field-label', stop.field));
    field.appendChild(el('div', 'walk-card__field-box'));
    card.appendChild(field);

    card.appendChild(el('p', 'walk-card__hint', stop.hint));
    return card;
  }

  function handoffCard() {
    const card = el('div', 'handoff');
    const head = el('div', 'handoff__row');
    head.appendChild(el('span', 'handoff__dot'));
    head.appendChild(el('p', 'handoff__title', 'Specialist joining · about 2 min'));
    card.appendChild(head);
    card.appendChild(el('p', 'handoff__body',
      'Your page, the step you are on and error CARD_DECL_51 go across with you, plus everything tried so far. Nothing to repeat.'));
    return card;
  }

  /* ══════════════════════════════════════════════════════
     Conversation — append, never repaint
     ══════════════════════════════════════════════════════ */

  function retireLive() {
    if (live) { live.classList.add('is-spent'); live = null; }
  }

  /* Post a question, show the assistant thinking, then run
     `done()` to drop the reply in. */
  function turn(question, done) {
    busy = true;
    retireLive();

    thread.appendChild(userMsg(question));
    scrollDown();

    const pending = typingRow();
    thread.appendChild(pending);
    scrollDown();

    clearTimeout(timer);
    timer = setTimeout(function () {
      done(pending);
      busy = false;
      scrollDown();
    }, 900);
  }

  function pickSymptom(sym) {
    if (busy) return;
    turn(sym.text, function (pending) {
      thread.replaceChild(botRow(fixCard(sym)), pending);
      thread.appendChild(actions(sym));
    });
  }

  function actions(sym) {
    live = el('div', 'action-stack');

    const show = el('button', 'action-btn');
    show.type = 'button';
    show.appendChild(el('span', 'action-btn__label', 'Show me on the page'));
    show.appendChild(el('span', 'action-btn__sub', 'Highlights the field, step 1 of 3'));
    show.addEventListener('click', function () { walk(sym, 0); });
    live.appendChild(show);

    const spec = el('button', 'action-btn action-btn--ghost', 'Talk to a specialist');
    spec.type = 'button';
    spec.disabled = true; /* shown for context, inactive in this deck */
    live.appendChild(spec);

    return live;
  }

  function walk(sym, i) {
    if (busy) return;
    const total = sym.walk.length;
    const label = i === 0 ? 'Show me on the page' : 'Next field';

    turn(label, function (pending) {
      thread.replaceChild(botRow(walkCard(sym.walk[i], i, total)), pending);

      if (i + 1 < total) {
        live = el('div', 'thread__suggestions');
        const next = el('button', 'chip chip--sm', 'Next field · ' + (i + 2) + ' of ' + total);
        next.type = 'button';
        next.addEventListener('click', function () { walk(sym, i + 1); });
        live.appendChild(next);
        thread.appendChild(live);
      } else {
        thread.appendChild(botRow(el('div', 'answer-card',
          '<p class="answer-card__lead">That is every field for this one. If checkout still blocks you after that, a specialist can pick it up with the full history attached.</p>')));

        live = el('div', 'thread__suggestions');
        const over = el('button', 'chip chip--sm', 'Start over');
        over.type = 'button';
        over.addEventListener('click', function () { build(); });
        const spec = el('button', 'chip chip--sm chip--escalate', 'Talk to a specialist');
        spec.type = 'button';
        spec.disabled = true; /* shown for context, inactive in this deck */
        live.appendChild(over);
        live.appendChild(spec);
        thread.appendChild(live);
      }
    });
  }

  function escalate() {
    if (busy) return;
    turn('Talk to a specialist', function (pending) {
      thread.replaceChild(botRow(handoffCard()), pending);
    });
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
    },
  };

})();
