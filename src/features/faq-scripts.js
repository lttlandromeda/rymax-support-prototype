/* =======================================================
   Feature 1 — Answering FAQ & Approved Scripts

   One continuous conversation, not a stack of screens.
   The Figma hub — greeting, recent orders, common requests
   — is the opening message; every tap appends to the same
   transcript and scrolls, the way a real support thread does.

   The composer is drawn exactly as the Figma frame has it,
   but it is inert — this POC covers quick questions answered
   from approved scripts, so the only ways in are the common
   requests, Marcus's orders, and the follow-up chips under
   each answer.
   ======================================================= */

export const faqScripts = (function () {

  /* ── Approved script library ──────────────────────────── */
  /* Each entry is what a trained Chase specialist would say,
     word for word. `code` is the record the answer cites.   */

  const SCRIPTS = {
    cancel: {
      code: 'ORD-CXL-02',
      lead: 'An order can be cancelled at no charge until it enters fulfilment — usually within 60 minutes of checkout.',
      list: [
        'Open the order, tap <b>Cancel order</b>, confirm. No fee, no call.',
        'Points return to your balance within <b>1 business day</b>.',
        'Card refunds post in <b>3–5 business days</b>.',
      ],
      note: '<b>#4835 · Canvas Weekender Bag</b> was placed Sep 9 and is still cancellable. <b>#4821</b> was delivered Sep 6 — that one would go through a return instead.',
      suggestions: [
        { text: 'Return #4821',         script: 'returns'    },
        { text: 'Where is my order',    script: 'tracking'   },
        { text: 'Talk to a specialist', script: 'specialist' },
      ],
    },

    damaged: {
      code: 'DMG-11',
      lead: 'If an item arrived damaged you are covered for a full replacement or a full refund, and you never pay return shipping.',
      list: [
        'Report it within <b>30 days</b> of delivery.',
        'Add 2–3 photos — the item and the outer packaging.',
        'A replacement ships in <b>2 business days</b>, or a refund posts in 3–5.',
      ],
      note: 'Keep the packaging until the claim closes. We may ask the carrier to inspect it.',
      suggestions: [
        { text: 'Empty box',            script: 'empty'      },
        { text: 'Wrong item or size',   script: 'wrong'      },
        { text: 'Talk to a specialist', script: 'specialist' },
      ],
    },

    empty: {
      code: 'EMP-07',
      lead: 'A package that arrived empty, or with an item missing, is handled as a shortage claim.',
      list: [
        'File within <b>14 days</b> of the delivery date.',
        'The carrier investigation takes <b>3–5 business days</b>.',
        'Once confirmed you choose a replacement or a full refund, points included.',
      ],
      note: 'Nothing needs to be shipped back — but hold on to the box until the claim is closed.',
      suggestions: [
        { text: 'Item damaged',         script: 'damaged'    },
        { text: 'Where is my order',    script: 'tracking'   },
        { text: 'Talk to a specialist', script: 'specialist' },
      ],
    },

    wrong: {
      code: 'WIS-05',
      lead: 'Wrong item, wrong size — the exchange is free either way.',
      list: [
        'A prepaid label is emailed to you within minutes.',
        'Ship the original back within <b>21 days</b>.',
        'The replacement leaves our warehouse as soon as the return scans.',
      ],
      note: 'A size exchange keeps the original price and point value, even if the item has since changed price.',
      suggestions: [
        { text: 'Return #4821',         script: 'returns'    },
        { text: 'Pricing & points',     script: 'pricing'    },
        { text: 'Talk to a specialist', script: 'specialist' },
      ],
    },

    pricing: {
      code: 'PTS-03',
      lead: 'Every item at The Shops at Chase carries a dollar price and a point price. Points are valued at one cent each — 13,590 points is $135.90.',
      list: [
        'Pay all points, all card, or split the two at checkout.',
        'A price drop within <b>14 days</b> of purchase is adjusted automatically.',
        'Refunded points return to your balance within <b>1 business day</b>.',
      ],
      note: 'Your balance today is <b>48,200 points</b> — about $482.00 of purchasing power.',
      suggestions: [
        /* Deliberately outside the library — shows the guardrail. */
        { text: 'Birthday discount?',   script: 'offScript'  },
        { text: 'Where is my order',    script: 'tracking'   },
        { text: 'Talk to a specialist', script: 'specialist' },
      ],
    },

    tracking: {
      code: 'TRK-01',
      lead: 'Here is where both of your open orders stand.',
      list: [
        '<b>#4835 · Canvas Weekender Bag</b> — placed Sep 9, in fulfilment. Tracking is emailed as soon as it ships, usually within 2 business days.',
        '<b>#4821 · Merino Crew Sweater</b> — delivered Sep 6, left at the front door.',
      ],
      note: 'Standard delivery runs <b>3–6 business days</b> after a package ships.',
      suggestions: [
        { text: 'Cancel an order',      script: 'cancel'     },
        { text: 'Item damaged',         script: 'damaged'    },
        { text: 'Talk to a specialist', script: 'specialist' },
      ],
    },

    returns: {
      code: 'RET-04',
      lead: 'Most items can be returned within 30 days of delivery, in original condition with tags attached.',
      list: [
        'Start the return in the order, print the prepaid label.',
        'Refunds post <b>3–5 business days</b> after the return scans.',
        'Points are restored in full — a return never costs you point value.',
      ],
      note: 'Final-sale and personalised items are the two exceptions, and both are marked on the product page.',
      suggestions: [
        { text: 'Pricing & points',     script: 'pricing'    },
        { text: 'Wrong item or size',   script: 'wrong'      },
        { text: 'Talk to a specialist', script: 'specialist' },
      ],
    },
  };

  /* Nothing approved covers this — the assistant says so
     rather than improvising, and offers the hand-off.       */
  const OFF_SCRIPT = {
    code: null,
    lead: 'I answer from Chase’s approved script library, and there is no approved wording for that one. I will not guess at it — a specialist can pick this up instead.',
    list: null,
    note: null,
    suggestions: [
      { text: 'Talk to a specialist', script: 'specialist' },
      { text: 'Pricing & points',     script: 'pricing'    },
    ],
  };

  /* ── Common requests — order matches Figma ────────────── */

  const COMMON_REQUESTS = [
    { text: 'Cancel an order',    script: 'cancel'   },
    { text: 'Item damaged',       script: 'damaged'  },
    { text: 'Empty box',          script: 'empty'    },
    { text: 'Wrong item or size', script: 'wrong'    },
    { text: 'Pricing & points',   script: 'pricing'  },
    { text: 'Where is my order',  script: 'tracking' },
  ];

  /* ── Recent orders ────────────────────────────────────── */

  const ORDERS = [
    {
      id: '#4821',
      name: 'Merino Crew Sweater · Navy · M',
      meta: '#4821 · Delivered Sep 6',
      price: '$135.90 or 13,590 points',
      status: 'Delivered Sep 6 · $135.90 or 13,590 points. Delivery is complete, so returns, damage and sizing are all still open to you.',
      suggestions: [
        { text: 'Return #4821',       script: 'returns' },
        { text: 'Item damaged',       script: 'damaged' },
        { text: 'Wrong item or size', script: 'wrong'   },
      ],
    },
    {
      id: '#4835',
      name: 'Canvas Weekender Bag',
      meta: '#4835 · Placed Sep 9',
      price: '$210.00 or 21,000 points',
      status: 'Placed Sep 9 · $210.00 or 21,000 points. Still in fulfilment, which means it can be cancelled free of charge right now.',
      suggestions: [
        { text: 'Cancel an order',   script: 'cancel'   },
        { text: 'Where is my order', script: 'tracking' },
        { text: 'Pricing & points',  script: 'pricing'  },
      ],
    },
  ];

  /* ── Module state ─────────────────────────────────────── */

  let root    = null;   /* element handed to the shell            */
  let thread  = null;   /* the scrolling transcript               */
  let restart = null;   /* "Start over" button in the header      */
  let replies = null;   /* the live quick-reply row, if any       */
  let timer   = null;
  let guard   = null;   /* scroll fallback, see scrollDown()      */
  let busy    = false;  /* a reply is in flight — ignore taps     */

  /* ── Tiny DOM helpers ─────────────────────────────────── */

  function el(tag, cls, html) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  const CHEV = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 3 11 8 6 13"/></svg>';
  const SEND  = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="14.5" x2="9" y2="3.5"/><polyline points="4.6 7.9 9 3.5 13.4 7.9"/></svg>';
  const RESET = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 12a8.5 8.5 0 1 1 2.6 6.1"/><polyline points="3 6.5 3 12 8.5 12"/></svg>';
  const LOCK = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="11" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>';

  /* ══════════════════════════════════════════════════════
     Chrome
     ══════════════════════════════════════════════════════ */

  function header() {
    const bar = el('div', 'app-header');

    /* Appears only once there is something to clear. */
    restart = el('button', 'app-header__reset', RESET);
    restart.type = 'button';
    restart.title = 'Start over';
    restart.setAttribute('aria-label', 'Start the conversation over');
    restart.hidden = true;
    restart.addEventListener('click', function () { build(); });
    bar.appendChild(restart);

    bar.appendChild(el('p', 'app-header__title', 'Support'));
    bar.appendChild(el('div', 'app-header__spacer'));
    return bar;
  }

  /* The composer from the Figma frame — present, never active.
     Plain divs rather than a disabled <input>, so there is no
     focus ring, caret or not-allowed cursor to explain away. */
  function composer() {
    const bar = el('div', 'composer');
    bar.setAttribute('aria-hidden', 'true');
    bar.appendChild(el('div', 'composer__input', 'Type your message'));
    bar.appendChild(el('div', 'composer__send', SEND));
    return bar;
  }

  /* ══════════════════════════════════════════════════════
     Opening message — the Figma hub, in the transcript
     ══════════════════════════════════════════════════════ */

  function intro() {
    const block = el('div', 'chat-intro');

    const greeting = el('div', 'app-greeting');
    greeting.appendChild(el('p', 'app-greeting__hello', 'Hello, Marcus.'));
    greeting.appendChild(el('p', 'app-greeting__sub',
      'Ask about an order, a return, pricing or your points. I answer in seconds, any hour.'));
    block.appendChild(greeting);

    const orders = el('div', 'app-section');
    orders.appendChild(el('p', 'app-label', 'Your recent orders'));
    ORDERS.forEach(function (order) {
      const card = el('button', 'order-card');
      card.type = 'button';
      card.appendChild(el('div', 'order-card__thumb'));
      const text = el('div', 'order-card__text');
      text.appendChild(el('p', 'order-card__name', order.name));
      text.appendChild(el('p', 'order-card__meta', order.meta));
      text.appendChild(el('p', 'order-card__price', order.price));
      card.appendChild(text);
      card.appendChild(el('div', 'order-card__chev', CHEV));
      card.addEventListener('click', function () { askOrder(order); });
      orders.appendChild(card);
    });
    block.appendChild(orders);

    const requests = el('div', 'app-section');
    requests.appendChild(el('p', 'app-label', 'Common requests'));
    const grid = el('div', 'chip-grid');
    COMMON_REQUESTS.forEach(function (item) {
      grid.appendChild(chip(item, 'chip'));
    });
    requests.appendChild(grid);
    block.appendChild(requests);

    return block;
  }

  /* ══════════════════════════════════════════════════════
     Message parts
     ══════════════════════════════════════════════════════ */

  function chip(item, cls) {
    const isEscalate = item.script === 'specialist';
    const node = el('button', cls + (isEscalate ? ' chip--escalate' : ''), item.text);
    node.type = 'button';
    /* The hand-off chip is shown for context but left inactive in this deck. */
    if (isEscalate) {
      node.disabled = true;
    } else {
      node.addEventListener('click', function () { ask(item); });
    }
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

  function handoffCard() {
    const card = el('div', 'handoff');
    const head = el('div', 'handoff__row');
    head.appendChild(el('span', 'handoff__dot'));
    head.appendChild(el('p', 'handoff__title', 'Specialist joining · about 2 min'));
    card.appendChild(head);
    card.appendChild(el('p', 'handoff__body',
      'Your order history and this whole conversation go across with you, so there is nothing to repeat. Every script I quoted is attached to the ticket.'));
    return card;
  }

  function quickReplies(suggestions) {
    const row = el('div', 'thread__suggestions');
    suggestions.forEach(function (item) { row.appendChild(chip(item, 'chip chip--sm')); });
    return row;
  }

  /* ══════════════════════════════════════════════════════
     Conversation — append, never repaint
     ══════════════════════════════════════════════════════ */

  function ask(item) {
    if (busy) return;

    if (item.script === 'specialist') {
      send(item.text, { kind: 'handoff' });
      return;
    }

    const answer = item.script === 'offScript'
      ? OFF_SCRIPT
      : SCRIPTS[item.script] || OFF_SCRIPT;

    send(item.text, { kind: 'answer', answer: answer });
  }

  function askOrder(order) {
    if (busy) return;
    send(order.id + ' · ' + order.name, {
      kind: 'answer',
      answer: {
        code: 'ORD-LKP-01',
        lead: order.status,
        list: null,
        note: null,
        suggestions: order.suggestions,
      },
    });
  }

  /* One turn: retire the live quick replies, post the question,
     show the assistant thinking, then swap in the answer.       */
  function send(question, reply) {
    busy = true;
    restart.hidden = false;

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
      const body = reply.kind === 'handoff' ? handoffCard() : answerCard(reply.answer);
      thread.replaceChild(botRow(body), pending);

      const suggestions = reply.kind === 'handoff' ? null : reply.answer.suggestions;
      if (suggestions && suggestions.length) {
        replies = quickReplies(suggestions);
        thread.appendChild(replies);
      }

      busy = false;
      scrollDown();
    }, 900);
  }

  /* Smooth, like a thread settling rather than a page swap.
     Reading scrollHeight forces layout, so the target is already
     correct for the node appended a line earlier. The guard snaps
     to the bottom only when the smooth scroll never ran at all —
     a background tab, or reduced-motion settings. */
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
    replies = null;

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
      replies = null;
    },
  };

})();
