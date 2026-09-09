# Rymax × Chase — Customer Support AI POC

A slide-by-slide prototype deck built with [Astro](https://astro.build). The left
half is the **presentation** (slide copy + navigation); the right half is the
**prototype** (an interactive iPhone frame that runs each feature).

## Run

```bash
npm install
npm run dev      # http://localhost:4321
```

```bash
npm run build    # static output in dist/
npm run preview  # serve the built site
```

## Structure

```
public/
  fonts/                     Queens (Klim) display face, served locally
src/
  layouts/
    BaseLayout.astro         <head>: fonts, design tokens, global styles
  components/
    ProtoShell.astro         two-column deck layout
    presentation/            LEFT — the presentation
      Presentation.astro       slide copy container + nav
      NavButtons.astro         Prev / Next pills + keyboard hint
    prototype/               RIGHT — the interactive prototype
      Prototype.astro          "try it" hint + device
      PhoneFrame.astro         bezel, side buttons, screen, Dynamic Island
      StatusBar.astro          iOS status bar (decorative)
  pages/
    index.astro              composes the deck, loads the shell script
  scripts/
    app.js                   hash-based slide routing + left-panel rendering
  features/
    faq-scripts.js           Feature 1 — "Answering FAQ & Approved Scripts"
  data/
    features.js              one entry per slide (copy + render hook)
  styles/
    design-tokens.css        colours, type scale, radii — from the Figma source
    global.css               component styles
```

## Adding a feature

1. Create `src/features/<feature>.js` exporting an object with
   `render()` → `HTMLElement` and optional `reset()`.
2. Add an entry to `src/data/features.js` (id, title, subtitle, `try` hint,
   `description`, and `render` / `onLeave` hooks).

The shell picks up the rest — feature count, navigation, arrow-key routing and
the `#<id>` deep link.
