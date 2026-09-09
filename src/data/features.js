/* =======================================================
   Rymax × Chase — Presentation content

   One entry per slide. The shell (app.js) owns the left
   panel copy and device frame; each feature module owns
   what renders inside the phone screen.
   ======================================================= */

import { faqScripts } from '../features/faq-scripts.js';

export const features = [
  {
    id:       'faq-scripts',
    label:    'Answering FAQ & Approved Scripts',
    title:    'Answering FAQ &amp;<br>Approved Scripts',
    subtitle: 'Answers common customer inquiries using official, pre-approved Chase scripts.',
    try:      'Tap a common request, an order, or type your own question',
    description: [
      'Marcus opens Support and sees the two things he is most likely to ask about: his own recent orders, and the six requests that make up the bulk of the queue. No search box to phrase a question into, no menu tree.',
      'Every answer is rendered from Chase’s approved script library and cites the record it came from — ORD-CXL-02, DMG-11, PTS-03. The assistant does not paraphrase policy, so the wording a customer reads at 2am is the wording legal signed off on.',
      'Ask something the library does not cover and it says so, then hands the thread to a specialist with the order history attached. Staying on-script is a property of the system, not something an agent has to remember under pressure.',
    ],
    render:  () => faqScripts.render(),
    onLeave: () => faqScripts.reset(),
  },
];
