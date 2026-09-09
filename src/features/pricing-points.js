/* =======================================================
   Feature 7 — Pricing, Sales & Points Acceleration

   Same append-only transcript as Features 1–6, opened
   mid-conversation. Marcus has noticed the Merino Crew rang
   up cheaper than it did yesterday and asked why. The
   assistant does not send him to a terms page — it queries
   the live record and shows the arithmetic: list price, the
   two discounts stacked on top, when each one lapses, and
   the rewards points the order earns back.

   Every follow-up (when the discount expires, redeeming
   points, a later price drop) is answered from Chase's
   approved script library and cites the record it came from.
   Ask something the library does not cover — "Price-match
   another store?" — and it says so plainly rather than guessing.

   The composer is drawn exactly as the Figma frame has it,
   but it is inert: the only ways forward are the follow-up
   chips under each answer.

   Figma: Rymax-Customer-Support-AI-POC
     · slide  117:937 · Pricing, Sales & Points Acceleration
     · screen 117:942 · v2 · 08 · Pricing & points
   ======================================================= */

export const pricingPoints = (function () {

  /* ── The item, and how the price is built ─────────────── */

  const ITEM = {
    name: 'Merino Crew Sweater · Navy · M',
    sku:  'SKU 41827-NVY-M',
    list: '$189.00',
    lines: [
      { key: 'List price', amount: '$189.00' },
      { key: 'Member sale', badge: 'FALL SALE', was: '$189.00', amount: '−$38.00' },
      { key: 'Promo CHASE10', badge: 'EXPIRES SEP 11', amount: '−$15.10' },
    ],
    pay:    '$135.90',
    points: 'or 13,590 points',
    timer:  { left: 'Fall Sale ends in 2d 14h', at: 'Sep 11, 23:59 ET', pct: 61 },
  };

  /* ── Rewards maths, done in place ─────────────────────── */

  const REWARDS = {
    earned: '1,359 points',
    calc:   '$135.90 × 10 pts · ×2 apparel accelerator · posts 3 days after delivery',
    nudge:  'Add $14.10 to reach $150 and earn 500 bonus points.',
  };

  /* ── Approved answers to the follow-ups ───────────────── */
  /* `code` is the record each answer cites — the assistant
     quotes the library word for word, it does not paraphrase. */

  const ANSWERS = {
    expire: {
      code: 'PRC-08',
      lead: 'Both cuts on this price come off at the same time — end of day Thursday.',
      list: [
        '<b>Fall Sale −$38.00</b> runs until <b>Sep 11, 23:59 ET</b> — about 2 days 14 hours from now.',
        '<b>Promo CHASE10 −$15.10</b> is tied to the same sale and lapses with it.',
        'After the cutoff the Merino Crew returns to its <b>$189.00</b> list price.',
      ],
      note: 'Check out before the cutoff and $135.90 is locked in, even if the price goes back up the next day.',
      suggestions: [
        { text: 'How do I redeem points?',      key: 'redeem' },
        { text: 'What if the price drops again?', key: 'drop'   },
      ],
    },

    redeem: {
      code: 'PTS-03',
      lead: 'Points are worth one cent each, so 13,590 points covers the full $135.90.',
      list: [
        'At checkout you can pay <b>all points</b>, <b>all card</b>, or split the two.',
        'This order earns <b>1,359 points</b> back — $135.90 × 10, doubled by the apparel accelerator.',
        'Earned points post <b>3 business days after delivery</b>; refunded points return within <b>1 business day</b>.',
      ],
      note: 'Your balance today is <b>48,200 points</b> — about $482.00 of purchasing power.',
      suggestions: [
        { text: 'When does my discount expire?', key: 'expire'    },
        { text: 'Price-match another store?',    key: 'offScript' },
      ],
    },

    drop: {
      code: 'PRC-11',
      lead: 'You are covered by the price-drop guarantee for 14 days after purchase.',
      list: [
        'If the Merino Crew is listed lower within <b>14 days</b>, the difference is refunded automatically.',
        'Card payments go back to the <b>Chase card ending 4821</b>; point payments are topped back up.',
        'No form and no chat needed — the adjustment just posts.',
      ],
      note: 'Final-sale items are the one exception, and this sweater is not marked final sale.',
      suggestions: [
        { text: 'When does my discount expire?', key: 'expire' },
      ],
    },
  };

  /* Nothing approved covers a competitor price-match — the
     assistant says so rather than improvising. */
  const OFF_SCRIPT = {
    code: null,
    lead: 'I answer from Chase’s approved script library, and there is no approved wording on matching another store’s price. I will not guess at it.',
    list: null,
    note: null,
    suggestions: [],
  };

  /* ── Module state ─────────────────────────────────────── */

  let root    = null;
  let thread  = null;
  let replies = null;   /* the live quick-reply row, if any */
  let timer   = null;
  let guard   = null;
  let busy    = false;

  /* ── Tiny DOM helpers ─────────────────────────────────── */

  function el(tag, cls, html) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  const BACK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="10 3 5 8 10 13"/></svg>';
  const SEND = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="14.5" x2="9" y2="3.5"/><polyline points="4.6 7.9 9 3.5 13.4 7.9"/></svg>';
  const LOCK = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="11" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>';

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

  /* The composer from the Figma frame — present, never active. */
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

  function chip(item, cls) {
    const node = el('button', cls, item.text);
    node.type = 'button';
    node.addEventListener('click', function () { ask(item); });
    return node;
  }

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

  /* ── The price breakdown — the heart of the answer ─────── */

  function priceCard() {
    const card = el('div', 'price-card');

    const product = el('div', 'price-card__product');
    product.appendChild(el('span', 'price-card__thumb'));
    const ptext = el('div', 'price-card__ptext');
    ptext.appendChild(el('p', 'price-card__pname', ITEM.name));
    ptext.appendChild(el('p', 'price-card__psku', ITEM.sku));
    product.appendChild(ptext);
    card.appendChild(product);

    const lines = el('div', 'price-card__lines');
    ITEM.lines.forEach(function (ln) {
      const row = el('div', 'price-line');
      row.appendChild(el('span', 'price-line__key', ln.key));
      if (ln.badge) row.appendChild(el('span', 'price-line__badge', ln.badge));
      row.appendChild(el('span', 'price-line__spacer'));
      if (ln.was) row.appendChild(el('span', 'price-line__was', ln.was));
      row.appendChild(el('span', 'price-line__amt', ln.amount));
      lines.appendChild(row);
    });
    card.appendChild(lines);

    const total = el('div', 'price-total');
    total.appendChild(el('span', 'price-total__key', 'You pay'));
    total.appendChild(el('span', 'price-line__spacer'));
    const val = el('div', 'price-total__val');
    val.appendChild(el('span', 'price-total__main', ITEM.pay));
    val.appendChild(el('span', 'price-total__sub', ITEM.points));
    total.appendChild(val);
    card.appendChild(total);

    const timerBox = el('div', 'price-timer');
    const trow = el('div', 'price-timer__row');
    trow.appendChild(el('span', null, ITEM.timer.left));
    trow.appendChild(el('span', null, ITEM.timer.at));
    timerBox.appendChild(trow);
    const track = el('div', 'price-timer__track');
    const fill = el('span', 'price-timer__fill');
    fill.style.width = ITEM.timer.pct + '%';
    track.appendChild(fill);
    timerBox.appendChild(track);
    card.appendChild(timerBox);

    return card;
  }

  function rewardsCard() {
    const card = el('div', 'rewards-card');
    card.appendChild(el('p', 'rewards-card__label', 'REWARDS'));
    card.appendChild(el('p', 'rewards-card__pts', REWARDS.earned));
    card.appendChild(el('p', 'rewards-card__calc', REWARDS.calc));
    card.appendChild(el('div', 'rewards-card__hr'));

    const nudge = el('div', 'rewards-card__nudge');
    nudge.appendChild(el('p', 'rewards-card__nudge-text', REWARDS.nudge));
    nudge.appendChild(el('span', 'price-line__spacer'));
    nudge.appendChild(el('span', 'rewards-card__see', 'See items'));
    card.appendChild(nudge);

    return card;
  }

  /* The opening answer: one assistant turn, three stacked parts. */
  function breakdown() {
    const wrap = el('div', 'pp-answer');
    wrap.appendChild(el('div', 'prompt-card',
      'It didn’t drop on its own — two active discounts stack on this sweater. Here is the full price, line by line.'));
    wrap.appendChild(priceCard());
    wrap.appendChild(rewardsCard());
    return wrap;
  }

  function answerCard(answer) {
    const card = el('div', 'answer-card');
    card.appendChild(el('p', 'answer-card__lead', answer.lead));

    if (answer.list && answer.list.length) {
      const list = el('ul', 'answer-card__list');
      answer.list.forEach(function (item) { list.appendChild(el('li', null, item)); });
      card.appendChild(list);
    }

    if (answer.note) card.appendChild(el('p', 'answer-card__note', answer.note));

    if (answer.code) {
      card.appendChild(el('div', 'answer-card__source',
        LOCK + '<span>Approved script · ' + answer.code + ' · v4.2</span>'));
    }

    return card;
  }

  function quickReplies(suggestions) {
    const row = el('div', 'thread__suggestions');
    suggestions.forEach(function (item) { row.appendChild(chip(item, 'chip chip--sm')); });
    return row;
  }

  function restartReplies() {
    const row = el('div', 'thread__suggestions');
    const over = el('button', 'chip chip--sm', 'Start over');
    over.type = 'button';
    over.addEventListener('click', function () { build(); });
    row.appendChild(over);
    return row;
  }

  /* ══════════════════════════════════════════════════════
     Opening message — the conversation already in progress
     ══════════════════════════════════════════════════════ */

  function intro() {
    const block = el('div', 'chat-intro');
    block.appendChild(userMsg('Why is this sweater cheaper than it was yesterday?'));
    block.appendChild(botRow(breakdown()));
    return block;
  }

  const OPENING_SUGGESTIONS = [
    { text: 'When does my discount expire?', key: 'expire' },
    { text: 'How do I redeem points?',       key: 'redeem' },
  ];

  /* ══════════════════════════════════════════════════════
     Conversation — append, never repaint
     ══════════════════════════════════════════════════════ */

  function ask(item) {
    if (busy) return;

    const answer = item.key === 'offScript'
      ? OFF_SCRIPT
      : ANSWERS[item.key] || OFF_SCRIPT;

    send(item.text, answer);
  }

  /* One turn: retire the live quick replies, post the question,
     show the assistant thinking, then swap in the answer. */
  function send(question, answer) {
    busy = true;

    if (replies) {
      replies.classList.add('is-spent');
      replies = null;
    }

    thread.appendChild(userMsg(question));
    scrollDown();

    const pending = typingRow();
    thread.appendChild(pending);
    scrollDown();

    clearTimeout(timer);
    timer = setTimeout(function () {
      thread.replaceChild(botRow(answerCard(answer)), pending);

      replies = answer.suggestions && answer.suggestions.length
        ? quickReplies(answer.suggestions)
        : restartReplies();
      thread.appendChild(replies);

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

    root.innerHTML = '';

    const app = el('div', 'app');
    app.appendChild(header());

    thread = el('div', 'thread');
    thread.id = 'thread';
    thread.appendChild(intro());

    replies = quickReplies(OPENING_SUGGESTIONS);
    thread.appendChild(replies);

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
      replies = null;
    },
  };

})();
