/* =======================================================
   Feature 1 — Answering FAQ & Approved Scripts

   Two screens live inside the phone:
     hub    — "v2 · 01 · Support Hub" (1:1 with Figma)
     thread — the answer, always rendered from the approved
              script library, never improvised

   Only the paths that carry the story are interactive:
   common requests, recent orders, the composer, follow-ups,
   the back arrow and the specialist hand-off.
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
      suggestions: ['Return #4821', 'Where is my order', 'Talk to a specialist'],
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
      suggestions: ['Start a damage claim', 'Empty box', 'Talk to a specialist'],
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
      suggestions: ['Start a claim', 'Item damaged', 'Talk to a specialist'],
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
      suggestions: ['Exchange #4821', 'Pricing & points', 'Talk to a specialist'],
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
      suggestions: ['Where is my order', 'Cancel an order', 'Talk to a specialist'],
    },

    tracking: {
      code: 'TRK-01',
      lead: 'Here is where both of your open orders stand.',
      list: [
        '<b>#4835 · Canvas Weekender Bag</b> — placed Sep 9, in fulfilment. Tracking is emailed as soon as it ships, usually within 2 business days.',
        '<b>#4821 · Merino Crew Sweater</b> — delivered Sep 6, left at the front door.',
      ],
      note: 'Standard delivery runs <b>3–6 business days</b> after a package ships.',
      suggestions: ['Cancel an order', 'Item damaged', 'Talk to a specialist'],
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
      suggestions: ['Return #4821', 'Pricing & points', 'Talk to a specialist'],
    },
  };

  /* ── Chips shown on the hub — order matches Figma ──────── */

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
      suggestions: ['Return #4821', 'Item damaged', 'Wrong item or size'],
    },
    {
      id: '#4835',
      name: 'Canvas Weekender Bag',
      meta: '#4835 · Placed Sep 9',
      price: '$210.00 or 21,000 points',
      status: 'Placed Sep 9 · $210.00 or 21,000 points. Still in fulfilment, which means it can be cancelled free of charge right now.',
      suggestions: ['Cancel an order', 'Where is my order', 'Pricing & points'],
    },
  ];

  /* ── Free-text routing ────────────────────────────────── */
  /* Keyword → script. Anything that does not match is handed
     to a specialist rather than answered off-script.        */

  const ROUTES = [
    { script: 'cancel',   words: ['cancel', 'call off', 'stop the order', '4835'] },
    { script: 'damaged',  words: ['damage', 'broken', 'torn', 'ripped', 'defect'] },
    { script: 'empty',    words: ['empty', 'missing', 'nothing inside', 'shortage', 'claim'] },
    { script: 'wrong',    words: ['wrong', 'size', 'exchange', 'swap', 'too small', 'too big'] },
    { script: 'pricing',  words: ['point', 'price', 'pricing', 'cost', 'how much', 'balance', 'redeem'] },
    { script: 'tracking', words: ['where', 'track', 'ship', 'deliver', 'arrive', 'when will'] },
    { script: 'returns',  words: ['return', 'refund', 'send back', 'money back'] },
  ];

  /* ── State ────────────────────────────────────────────── */

  let state = { view: 'hub', messages: [], typing: false };
  let root = null;
  let timer = null;

  /* ── Tiny DOM helpers ─────────────────────────────────── */

  function el(tag, cls, html) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  const CHEV = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 3 11 8 6 13"/></svg>';
  const BACK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
  const SEND = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="14.5" x2="9" y2="3.5"/><polyline points="4.6 7.9 9 3.5 13.4 7.9"/></svg>';
  const LOCK = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="11" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>';

  /* ══════════════════════════════════════════════════════
     Screen — Support Hub
     ══════════════════════════════════════════════════════ */

  function hubScreen() {
    const wrap = el('div', 'app screen-enter');

    /* header */
    const header = el('div', 'app-header');
    header.appendChild(el('p', 'app-header__title', 'Support'));
    header.appendChild(el('div', 'app-header__spacer'));
    header.appendChild(el('div', 'app-header__badge', 'THE SHOPS AT CHASE'));
    wrap.appendChild(header);

    /* body */
    const body = el('div', 'app-body');

    const greeting = el('div', 'app-greeting');
    greeting.appendChild(el('p', 'app-greeting__hello', 'Hello, Marcus.'));
    greeting.appendChild(el('p', 'app-greeting__sub',
      'Ask about an order, a return, pricing or your points. I answer in seconds, any hour.'));
    body.appendChild(greeting);

    /* recent orders */
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
      card.addEventListener('click', function () { askAboutOrder(order); });
      orders.appendChild(card);
    });
    body.appendChild(orders);

    /* common requests */
    const requests = el('div', 'app-section');
    requests.appendChild(el('p', 'app-label', 'Common requests'));
    const grid = el('div', 'chip-grid');
    COMMON_REQUESTS.forEach(function (item) {
      const chip = el('button', 'chip', item.text);
      chip.type = 'button';
      chip.addEventListener('click', function () { ask(item.text, item.script); });
      grid.appendChild(chip);
    });
    requests.appendChild(grid);
    body.appendChild(requests);

    body.appendChild(el('div', 'app-spacer'));
    body.appendChild(el('div', 'app-rule'));
    body.appendChild(el('p', 'app-footnote',
      'Answers use approved Chase scripts. A specialist is one tap away at any point.'));

    wrap.appendChild(body);
    wrap.appendChild(composer());
    return wrap;
  }

  /* ══════════════════════════════════════════════════════
     Screen — Thread
     ══════════════════════════════════════════════════════ */

  function threadScreen() {
    const wrap = el('div', 'app screen-enter');

    /* header with back */
    const header = el('div', 'app-header');
    const back = el('button', 'app-header__back', BACK);
    back.type = 'button';
    back.setAttribute('aria-label', 'Back to support');
    back.addEventListener('click', goHub);
    header.appendChild(back);
    header.appendChild(el('p', 'app-header__title', 'Support'));
    header.appendChild(el('div', 'app-header__spacer'));
    header.appendChild(el('div', 'app-header__badge', 'THE SHOPS AT CHASE'));
    wrap.appendChild(header);

    /* messages */
    const thread = el('div', 'thread');
    thread.id = 'thread';

    state.messages.forEach(function (msg) {
      thread.appendChild(msg.from === 'user' ? userMsg(msg) : botMsg(msg));
    });

    if (state.typing) {
      const t = el('div', 'msg msg--bot');
      t.appendChild(el('p', 'msg__bot-label', 'Support assistant'));
      t.appendChild(el('div', 'typing', '<span></span><span></span><span></span>'));
      thread.appendChild(t);
    } else {
      const last = state.messages[state.messages.length - 1];
      if (last && last.suggestions && last.suggestions.length) {
        const row = el('div', 'thread__suggestions');
        last.suggestions.forEach(function (label) {
          const isEscalate = label === 'Talk to a specialist';
          const chip = el('button', 'chip chip--sm' + (isEscalate ? ' chip--escalate' : ''), label);
          chip.type = 'button';
          chip.addEventListener('click', function () { handleSuggestion(label); });
          row.appendChild(chip);
        });
        thread.appendChild(row);
      }
    }

    wrap.appendChild(thread);
    wrap.appendChild(composer());
    return wrap;
  }

  function userMsg(msg) {
    const row = el('div', 'msg msg--user');
    row.appendChild(el('div', 'msg__user-bubble', msg.text));
    return row;
  }

  function botMsg(msg) {
    const row = el('div', 'msg msg--bot');
    row.appendChild(el('p', 'msg__bot-label', 'Support assistant'));

    if (msg.kind === 'handoff') {
      const card = el('div', 'handoff');
      const head = el('div', 'handoff__row');
      head.appendChild(el('span', 'handoff__dot'));
      head.appendChild(el('p', 'handoff__title', 'Specialist joining · about 2 min'));
      card.appendChild(head);
      card.appendChild(el('p', 'handoff__body', msg.lead));
      row.appendChild(card);
      return row;
    }

    const card = el('div', 'answer-card');
    card.appendChild(el('p', 'answer-card__lead', msg.lead));

    if (msg.list && msg.list.length) {
      const list = el('ul', 'answer-card__list');
      msg.list.forEach(function (item) { list.appendChild(el('li', null, item)); });
      card.appendChild(list);
    }

    if (msg.note) card.appendChild(el('p', 'answer-card__note', msg.note));

    if (msg.code) {
      card.appendChild(el('div', 'answer-card__source',
        LOCK + '<span>Approved script · ' + msg.code + ' · v4.2</span>'));
    }

    row.appendChild(card);
    return row;
  }

  /* ── Composer — shared by both screens ────────────────── */

  function composer() {
    const bar = el('div', 'composer');

    const input = el('input', 'composer__input');
    input.type = 'text';
    input.placeholder = 'Type your message';
    input.id = 'composer-input';
    input.autocomplete = 'off';

    const send = el('button', 'composer__send', SEND);
    send.type = 'button';
    send.setAttribute('aria-label', 'Send message');

    function submit() {
      const value = input.value.trim();
      if (!value) return;
      input.value = '';
      askFreeText(value);
    }

    send.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });

    bar.appendChild(input);
    bar.appendChild(send);
    return bar;
  }

  /* ══════════════════════════════════════════════════════
     Conversation logic
     ══════════════════════════════════════════════════════ */

  function ask(question, scriptKey) {
    const script = SCRIPTS[scriptKey];
    push({ from: 'user', text: question });
    reply(script
      ? { from: 'bot', lead: script.lead, list: script.list, note: script.note,
          code: script.code, suggestions: script.suggestions }
      : escalation());
  }

  function askAboutOrder(order) {
    push({ from: 'user', text: order.id + ' · ' + order.name });
    reply({
      from: 'bot',
      lead: order.status,
      list: null,
      note: null,
      code: 'ORD-LKP-01',
      suggestions: order.suggestions,
    });
  }

  function askFreeText(text) {
    const key = route(text);
    push({ from: 'user', text: text });
    const script = SCRIPTS[key];
    reply(script
      ? { from: 'bot', lead: script.lead, list: script.list, note: script.note,
          code: script.code, suggestions: script.suggestions }
      : escalation());
  }

  function route(text) {
    const value = text.toLowerCase();
    for (let i = 0; i < ROUTES.length; i++) {
      for (let j = 0; j < ROUTES[i].words.length; j++) {
        if (value.indexOf(ROUTES[i].words[j]) !== -1) return ROUTES[i].script;
      }
    }
    return null;
  }

  /* No approved wording for the question — say so, hand it over. */
  function escalation() {
    return {
      from: 'bot',
      lead: 'I answer from Chase’s approved script library, and there is no approved wording for that one. I will not guess at it — a specialist can pick this up instead.',
      list: null,
      note: null,
      code: null,
      suggestions: ['Talk to a specialist', 'Where is my order', 'Pricing & points'],
    };
  }

  function handleSuggestion(label) {
    if (label === 'Talk to a specialist') {
      push({ from: 'user', text: label });
      reply({
        from: 'bot',
        kind: 'handoff',
        lead: 'Your order history and this whole conversation go across with you, so there is nothing to repeat. Every script I quoted is attached to the ticket.',
        suggestions: [],
      });
      return;
    }

    /* "Return #4821", "Exchange #4821", "Start a claim" … route
       through the same library as any other question. */
    const key = route(label);
    ask(label, key);
  }

  function push(msg) {
    state.messages.push(msg);
    state.view = 'thread';
    paint();
  }

  function reply(msg) {
    state.typing = true;
    paint();
    clearTimeout(timer);
    timer = setTimeout(function () {
      state.typing = false;
      state.messages.push(msg);
      paint();
    }, 750);
  }

  function goHub() {
    state.view = 'hub';
    state.messages = [];
    state.typing = false;
    clearTimeout(timer);
    paint();
  }

  /* ── Paint ────────────────────────────────────────────── */

  function paint() {
    if (!root) return;
    root.innerHTML = '';
    root.appendChild(state.view === 'hub' ? hubScreen() : threadScreen());
    const thread = root.querySelector('#thread');
    if (thread) thread.scrollTop = thread.scrollHeight;
  }

  /* ── Public API ───────────────────────────────────────── */

  return {
    render: function () {
      root = el('div', 'app-root');
      paint();
      return root;
    },
    reset: function () {
      state = { view: 'hub', messages: [], typing: false };
      clearTimeout(timer);
    },
  };

})();
