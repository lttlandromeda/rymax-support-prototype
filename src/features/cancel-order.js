/* =======================================================
   Feature 4 — Order Cancellation Requests (Cancel Order)

   Same append-only transcript as Features 1–3. Marcus has
   asked to cancel an order; the assistant does not ask which
   one — it has already checked fulfilment status on every
   open order and lists only the ones that can still be pulled
   from the warehouse. One tap picks the order, a second opens
   a receipt (refund, card, timing) as a bottom sheet — and
   nothing is cancelled until Marcus confirms there. The thread
   ends on a plain confirmation.

   Figma: Rymax-Customer-Support-AI-POC
     · v2 · 05 · Cancel — pick order   (frame 111:95)
     · v2 · 06 · Cancel — confirm      (frame 111:157)
   ======================================================= */

export const cancelOrder = (function () {

  /* ── Every open order, with fulfilment status ─────────── */
  /* Only `cancellable` rows can be picked. The shipped one is
     shown anyway, offered as a return instead of hidden.     */

  const ORDERS = [
    {
      id:        '#4821',
      name:      'Merino Crew Sweater · Navy · M',
      sheetName: 'Merino Crew Sweater · M',
      meta:      '#4821 · Placed Sep 8',
      price:     '$135.90 or 13,590 points',
      status:    'cancellable',
      refund:    '$135.90',
      points:    'or 13,590 points returned',
      card:      'Chase card ···· 4821',
      arrives:   '3–5 business days',
    },
    {
      id:        '#4835',
      name:      'Canvas Weekender Bag',
      sheetName: 'Canvas Weekender Bag',
      meta:      '#4835 · Placed Sep 9',
      price:     '$210.00 or 21,000 points',
      status:    'cancellable',
      refund:    '$210.00',
      points:    'or 21,000 points returned',
      card:      'Chase card ···· 4821',
      arrives:   '3–5 business days',
    },
    {
      id:      '#4790',
      name:    'Oxford Shirt · White · L',
      meta:    '#4790 · Shipped Sep 7',
      price:   '$89.00 or 8,900 points',
      status:  'shipped',
    },
  ];

  const DEFAULT_PICK = '#4821';

  /* ── Module state ─────────────────────────────────────── */

  let root     = null;
  let thread   = null;
  let live     = null;   /* the pick list, then the closing chip */
  let sheet    = null;   /* the bottom sheet, while mounted      */
  let timer    = null;
  let guard    = null;
  let busy     = false;
  let selected = DEFAULT_PICK;

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
  const CLOSE = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><line x1="3.5" y1="3.5" x2="12.5" y2="12.5"/><line x1="12.5" y1="3.5" x2="3.5" y2="12.5"/></svg>';
  const CHEVR = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 3 11 8 6 13"/></svg>';

  function current() {
    return ORDERS.find(function (o) { return o.id === selected; });
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

  /* Present, never active — see Features 1–3. */
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

  /* ══════════════════════════════════════════════════════
     Opening message — the conversation already in progress
     ══════════════════════════════════════════════════════ */

  function intro() {
    const block = el('div', 'chat-intro');
    block.appendChild(userMsg('I need to cancel an order.'));
    block.appendChild(botRow(el('div', 'prompt-card',
      'Two of your orders can still be pulled before they leave the warehouse. Pick one.')));
    live = pickList();
    block.appendChild(live);
    return block;
  }

  /* ── Pick list — built once; selection only toggles a class ─ */

  let opts = {};   /* id → the cancellable option button */

  function pickList() {
    const wrap = el('div', 'cancel-pick');
    opts = {};

    ORDERS.forEach(function (o) {
      const shipped = o.status === 'shipped';
      const opt = el(shipped ? 'div' : 'button', 'cancel-opt');

      if (shipped) {
        opt.classList.add('is-shipped');
      } else {
        opt.type = 'button';
        opt.setAttribute('aria-pressed', o.id === selected ? 'true' : 'false');
        if (o.id === selected) opt.classList.add('is-selected');
        opt.addEventListener('click', function () { pick(o.id); });
        opts[o.id] = opt;
      }

      const row = el('div', 'cancel-opt__row');
      row.appendChild(el('span', 'cancel-opt__radio', shipped ? null : CHECK));
      row.appendChild(el('span', 'cancel-opt__thumb'));

      const text = el('span', 'cancel-opt__text');
      text.appendChild(el('span', 'cancel-opt__name', o.name));
      text.appendChild(el('span', 'cancel-opt__meta', o.meta));
      text.appendChild(el('span', 'cancel-opt__price', o.price));
      row.appendChild(text);
      opt.appendChild(row);

      const foot = el('div', 'cancel-opt__foot');
      foot.appendChild(el('span', 'cancel-opt__badge' + (shipped ? ' is-shipped' : ''),
        shipped ? 'ALREADY SHIPPED' : 'CAN BE CANCELLED'));
      if (shipped) foot.appendChild(el('span', 'cancel-opt__return', 'Return it instead'));
      opt.appendChild(foot);

      wrap.appendChild(opt);
    });

    const submit = el('button', 'cancel-submit', 'Cancel the selected order');
    submit.type = 'button';
    submit.addEventListener('click', openSheet);
    wrap.appendChild(submit);

    return wrap;
  }

  function pick(id) {
    if (busy || sheet || id === selected || !opts[id]) return;
    if (opts[selected]) {
      opts[selected].classList.remove('is-selected');
      opts[selected].setAttribute('aria-pressed', 'false');
    }
    selected = id;
    opts[id].classList.add('is-selected');
    opts[id].setAttribute('aria-pressed', 'true');
  }

  function retireLive() {
    if (live) { live.classList.add('is-spent'); live = null; }
  }

  /* ══════════════════════════════════════════════════════
     Bottom sheet — "Cancel order #____?"
     ══════════════════════════════════════════════════════ */

  function detailRow(key, val, sub, big) {
    const row = el('div', 'cancel-row');
    row.appendChild(el('span', 'cancel-row__key', key));
    const v = el('span', 'cancel-row__val');
    v.appendChild(el('span', 'cancel-row__val-main' + (big ? ' is-lg' : ''), val));
    if (sub) v.appendChild(el('span', 'cancel-row__val-sub', sub));
    row.appendChild(v);
    return row;
  }

  function openSheet() {
    if (sheet || busy) return;
    const o = current();

    const scrim = el('div', 'sheet-scrim');
    scrim.addEventListener('click', function () { closeSheet(); });

    const panel = el('div', 'sheet');
    panel.appendChild(el('div', 'sheet__grip-wrap', '<span class="sheet__grip"></span>'));

    const head = el('div', 'sheet__head');
    head.appendChild(el('p', 'sheet__title', 'Cancel order ' + o.id + '?'));
    head.appendChild(el('div', 'app-header__spacer'));
    const x = el('button', 'sheet__close', CLOSE);
    x.type = 'button';
    x.setAttribute('aria-label', 'Close');
    x.addEventListener('click', function () { closeSheet(); });
    head.appendChild(x);
    panel.appendChild(head);

    const rows = el('div', 'cancel-rows');
    rows.appendChild(detailRow('Item', o.sheetName));
    rows.appendChild(detailRow('Refund', o.refund, o.points, true));
    rows.appendChild(detailRow('Back to', o.card));
    rows.appendChild(detailRow('Arrives in', o.arrives));
    panel.appendChild(rows);

    const reason = el('div', 'cancel-reason');
    reason.appendChild(el('span', 'cancel-reason__label', 'Reason — optional'));
    reason.appendChild(el('span', 'cancel-reason__chev', CHEVR));
    panel.appendChild(reason);

    panel.appendChild(el('div', 'sheet__spacer'));

    const foot = el('div', 'sheet__foot');
    const go = el('button', 'sheet__continue', 'Cancel this order');
    go.type = 'button';
    go.addEventListener('click', confirmCancel);
    foot.appendChild(go);
    const keep = el('button', 'sheet__keep', 'Keep my order');
    keep.type = 'button';
    keep.addEventListener('click', function () { closeSheet(); });
    foot.appendChild(keep);
    panel.appendChild(foot);

    root.appendChild(scrim);
    root.appendChild(panel);
    sheet = { scrim: scrim, panel: panel };

    requestAnimationFrame(function () {
      scrim.classList.add('is-open');
      panel.classList.add('is-open');
    });
  }

  function closeSheet() {
    if (!sheet) return;
    const s = sheet;
    sheet = null;

    s.scrim.classList.remove('is-open');
    s.panel.classList.remove('is-open');

    setTimeout(function () {
      s.scrim.remove();
      s.panel.remove();
    }, 260);
  }

  /* ══════════════════════════════════════════════════════
     Confirmation — the thread ends here
     ══════════════════════════════════════════════════════ */

  function doneCard(o) {
    const card = el('div', 'cancel-done');

    const head = el('div', 'cancel-done__head');
    head.appendChild(el('span', 'cancel-done__check', CHECK));
    head.appendChild(el('p', 'cancel-done__title', 'Order ' + o.id + ' cancelled'));
    card.appendChild(head);

    const list = el('div', 'cancel-done__list');
    [
      ['Refund',     o.refund + ' ' + o.points.replace(/^or /, '· ') ],
      ['Back to',    o.card],
      ['Arrives in', o.arrives],
    ].forEach(function (pair) {
      const r = el('div', 'cancel-done__row');
      r.appendChild(el('span', 'cancel-done__row-key', pair[0]));
      r.appendChild(el('span', 'cancel-done__row-val', pair[1]));
      list.appendChild(r);
    });
    card.appendChild(list);

    card.appendChild(el('p', 'cancel-done__note',
      'A confirmation email is on its way. Nothing else is needed from you — the order is stopped before it ships.'));
    return card;
  }

  function confirmCancel() {
    if (busy) return;
    const o = current();
    busy = true;
    retireLive();
    closeSheet();

    clearTimeout(timer);
    timer = setTimeout(function () {
      const pending = typingRow();
      thread.appendChild(pending);
      scrollDown();

      clearTimeout(timer);
      timer = setTimeout(function () {
        thread.replaceChild(botRow(doneCard(o)), pending);

        live = el('div', 'thread__suggestions');
        const over = el('button', 'chip chip--sm', 'Start over');
        over.type = 'button';
        over.addEventListener('click', function () { build(); });
        live.appendChild(over);
        thread.appendChild(live);

        busy = false;
        scrollDown();
      }, 850);
    }, 300);
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
    selected = DEFAULT_PICK;

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
