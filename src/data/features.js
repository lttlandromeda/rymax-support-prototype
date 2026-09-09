/* =======================================================
   Rymax × Chase — Presentation content

   One entry per slide. The shell (app.js) owns the left
   panel copy and device frame; each feature module owns
   what renders inside the phone screen.
   ======================================================= */

import { faqScripts } from '../features/faq-scripts.js';
import { blockedUsers } from '../features/blocked-users.js';
import { contextCollection } from '../features/context-collection.js';
import { cancelOrder } from '../features/cancel-order.js';
import { damagedMerchandise } from '../features/damaged-merchandise.js';
import { wrongSize } from '../features/wrong-size.js';
import { pricingPoints } from '../features/pricing-points.js';

export const features = [
  {
    id:       'faq-scripts',
    label:    'Answering FAQ & Approved Scripts',
    title:    'Answering FAQ &amp;<br>Approved Scripts',
    subtitle: 'Answers common customer inquiries using official, pre-approved Chase scripts.',
    description: [
      'Marcus opens Support and sees the two things he is most likely to ask about: his own recent orders, and the six requests that make up the bulk of the queue. No search box to phrase a question into, no menu tree.',
      'Every answer is rendered from Chase’s approved script library and cites the record it came from — ORD-CXL-02, DMG-11, PTS-03. The assistant does not paraphrase policy, so the wording a customer reads at 2am is the wording legal signed off on.',
      'Ask something the library does not cover — the “Birthday discount?” follow-up under Pricing &amp; points — and it says so, then hands the thread to a specialist with the order history attached. Staying on-script is a property of the system, not something an agent has to remember under pressure.',
    ],
    render:  () => faqScripts.render(),
    onLeave: () => faqScripts.reset(),
  },

  {
    id:       'blocked-users',
    label:    'Assisting Blocked / Confused Users',
    title:    'Assisting Blocked /<br>Confused Users',
    subtitle: 'Identifies the exact page or step where the customer hit a problem, and guides them through it field by field.',
    description: [
      'Marcus is stuck at checkout. The assistant does not ask him to describe that — it already has the page, the step and the error code from his session, and opens by stating them back: <b>Checkout → Payment, step 3 of 4, CARD_DECL_51 twice</b>. The four-stop tracker shows exactly where the flow broke.',
      'One narrowing question — “which one matches what you are seeing?” — turns a vague block into a known case. Each answer is three concrete steps drawn from approved guidance (PAY-DECL-51), not improvised troubleshooting.',
      '“Show me on the page” then walks him field by field — billing ZIP, saved card, place order — one tap at a time. If it still will not clear, the hand-off carries the page, the step, the error and everything already tried, so a specialist starts where he left off.',
    ],
    render:  () => blockedUsers.render(),
    onLeave: () => blockedUsers.reset(),
  },

  {
    id:       'context-collection',
    label:    'Automatic Data & Context Collection',
    title:    'Automatic Data &amp;<br>Context Collection',
    subtitle: 'Collects relevant order details, customer issues, and required information or photos before any escalation to a human agent.',
    description: [
      'Marcus has already told the assistant the box came crushed and the sweater is torn. When he asks for a person, the system does not open a blank ticket — it assembles one. Order #4821, his contact details and the Sep 6 carrier scan are pulled without a single question, because they already sit on the account and the shipment record.',
      'What it cannot infer, it asks for once. The claim needs three photos; two are attached, so it requests the third — the shipping label — inline, and nothing else. The sheet is Marcus’s to check before anything moves: every line names where it came from — <b>From your account</b>, <b>From the carrier</b>, <b>You told us</b>.',
      '“Continue” hands the specialist a claim that is already complete. Nothing on that list gets asked again — not by the assistant, not by the person who picks it up. The escalation starts from a full file instead of a cold “how can I help?”.',
    ],
    render:  () => contextCollection.render(),
    onLeave: () => contextCollection.reset(),
  },

  {
    id:       'cancel-order',
    label:    'Order Cancellation Requests',
    title:    'Order Cancellation Requests<br>(Cancel Order)',
    subtitle: 'Locates paid or in-progress orders that are still eligible for cancellation based on current fulfillment status, and prompts the customer to pick which one to cancel.',
    description: [
      'Marcus asks to cancel an order and the assistant does not ask which one. It has already checked fulfilment on every open order and lists only the two that can still be pulled from the warehouse — #4821 and #4835. #4790 shipped Sep 7, so that one is offered as a return instead of being hidden.',
      'One tap picks the order; a second opens the receipt before anything moves — the exact refund (<b>$135.90 or 13,590 points</b>), the card it goes back to, and when it lands. A reason is offered but never required. Nothing is cancelled until Marcus confirms on that sheet.',
      '“Cancel this order” closes it out on the spot — no queue, no call, no waiting on an agent. The thread ends on a plain confirmation: the order is stopped, the refund is on its way to the Chase card ending 4821, and the email is already sent.',
    ],
    render:  () => cancelOrder.render(),
    onLeave: () => cancelOrder.reset(),
  },

  {
    id:       'damaged-merchandise',
    label:    'Empty Box or Damaged Merchandise (Vision AI)',
    title:    'Empty Box or Damaged<br>Merchandise (Vision AI)',
    subtitle: 'Guides customers through submitting required information and photos. Vision AI (Computer Vision) automatically analyzes photo uploads to verify defect integrity or packaging flaws, instantly triggering replacement workflows.',
    description: [
      'Marcus says the box arrived crushed. The assistant does not send him a claim form — it names the three photos the claim needs: the box from outside, the shipping label, what was inside. Two are already on file, so it asks for the one that is missing.',
      'The last shot is guided. Tapping <b>Take photo</b> opens a framed viewfinder with one instruction — “get the item and the packing material in one shot, lit evenly” — and blurry or dark captures are rejected before they are accepted. <b>Submit for review</b> unlocks once all three are in.',
      'Vision AI reads the set on screen: <b>outer seal broken</b>, <b>crushed corner — impact damage</b>, <b>label matches order #4821</b>. At <b>94% confidence</b> it approves the replacement outright — ships today, tracking within two hours, nothing to send back. Below the threshold the same photos route straight to a specialist, with nothing asked twice.',
    ],
    render:  () => damagedMerchandise.render(),
    onLeave: () => damagedMerchandise.reset(),
  },

  {
    id:       'wrong-size',
    label:    'Wrong Item / Wrong Size (SKU Mismatch)',
    title:    'Wrong Item / Wrong Size<br>(SKU Mismatch)',
    subtitle: 'The customer uploads a photo of the item or product tag; Vision AI verifies tag details against The Shops at Chase DB and generates a decision.',
    description: [
      'Marcus opens the thread already knowing what went wrong: he ordered the Merino Crew in medium and a large turned up. The assistant does not send him a returns form — it asks for one photo of the sewn-in size tag, the single thing it needs to settle this.',
      'Vision AI reads the tag against The Shops at Chase catalogue — SKU <b>41827-NVY-L</b>, size <b>L</b>, on an order placed for <b>M</b> — and lays the two side by side: what was ordered, what was received. The mismatch is shown, not asserted.',
      'Because the record and the photo agree, the fix is offered on the spot — the right size ships today with a prepaid label for the wrong one, or a full refund of <b>$135.90</b> if Marcus would rather. Nothing goes back before the replacement goes out.',
    ],
    render:  () => wrongSize.render(),
    onLeave: () => wrongSize.reset(),
  },

  {
    id:       'pricing-points',
    label:    'Pricing, Sales & Points Acceleration',
    title:    'Pricing, Sales &amp;<br>Points Acceleration',
    subtitle: 'The AI instantly queries the item in DB, fetches final pricing, explains pricing rules (including active discounts and promo expiration dates), and calculates earned rewards points.',
    description: [
      'Marcus notices the Merino Crew rang up at $135.90 when it was $189.00 the day before, and asks why. The assistant does not point him at a terms page — it pulls the live record and shows the arithmetic: the list price, then the two cuts sitting on top of it — <b>Fall Sale −$38.00</b> and <b>promo CHASE10 −$15.10</b>, each with the date it lapses.',
      'The same answer carries the part a pricing FAQ usually leaves out — that both discounts expire together at <b>Sep 11, 23:59 ET</b>, and that the price returns to $189.00 afterwards. A countdown, not a vague “limited time”.',
      'It also does the rewards maths in place: <b>1,359 points</b> on this order — $135.90 × 10, doubled by the apparel accelerator, posting three days after delivery — and notes that $14.10 more would clear the $150 threshold for 500 bonus points. Every follow-up — redeeming points, a later price drop — is answered from the same approved library; ask something it does not cover and it says so plainly rather than guessing.',
    ],
    render:  () => pricingPoints.render(),
    onLeave: () => pricingPoints.reset(),
  },
];
