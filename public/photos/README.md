# Photo stubs — Vision AI features (5 & 6)

Drop the placeholder damage photo here as:

    damage-stub.jpg

The shot list, the Vision AI scan strip and the capture flow all read
`/photos/damage-stub.jpg` (see `src/features/damaged-merchandise.js`,
constant `STUB`). Until the file exists the thumbnails fall back to the
grey `--app-placeholder` block, so the deck still runs.

Per-shot images: each entry in `SHOTS` has its own `img` field, all
pointing at `STUB` for now. Point PHOTO 2 / PHOTO 3 at their own files
when real photos are available.

---

Feature 6 (Wrong Item / Wrong Size · SKU Mismatch) reads one photo of the
sewn-in size tag as:

    tag-stub.jpg

Referenced from `src/features/wrong-size.js`, constant `STUB`. Same
grey-placeholder fallback until the file exists.
