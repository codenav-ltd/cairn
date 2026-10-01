# Cairn — Design System

> Status: draft · Last updated: 2026-10-01 · Direction: **Changelog**

## 1. Direction

**A developer's knowledge, versioned like code.**

Ideas in Cairn are spoken, restructured by AI, translated and revised over
months. That history is real, so we show it. The visual language borrows from
the places developers already read history: commit logs, changelogs, diffs. It
stays calm and legible, because this is somewhere people come to read.

What we avoid:

- The default "dev tool" look: near-black background, neon gradient, Inter everywhere.
- Decoration that carries no information. Every marker, colour and rule must
  encode something true about the content.
- Motion for its own sake. Animation is spent in three places (§7.2); everywhere
  else it is quiet.

### 1.1 Signature: the Trail

Every article and note has a **Trail**: a thin line of markers under the title.
Each marker is one revision. Hovering one shows what happened; in phase 2,
dragging along the Trail shows the document as it was at that point, with
changes highlighted.

```text
●───●──◆──▲──●────●──◇
                     rev 7 · 3 days ago
```

| Marker | Revision source | Colour                                 |
| ------ | --------------- | -------------------------------------- |
| `●`    | Manual edit     | `--ink`                                |
| `◆`    | Voice capture   | `--cobalt`                             |
| `▲`    | AI restructure  | `--amber` until reviewed, then `--ink` |
| `◇`    | Translation     | `--amber` until reviewed, then `--ink` |
| `■`    | Import          | `--muted`                              |

Shape carries the meaning; colour reinforces it. The Trail must be readable
without colour.

### 1.2 The spec line

Metadata is set in monospace as one line, written the way a log line would be:

```text
note · ◐ growing · rev 7 · 3 voice · 2 ai · 4 backlinks · EN / 中文
```

It always appears in this order and omits empty fields.

### 1.3 Maturity markers

| Stage       | Glyph | Label (en / zh)  |
| ----------- | ----- | ---------------- |
| `seed`      | `○`   | Seed / 种子      |
| `growing`   | `◐`   | Growing / 生长中 |
| `evergreen` | `●`   | Evergreen / 常青 |

### 1.4 Amber means "not yet confirmed by a human"

`--amber` is reserved for one meaning: content that no human has confirmed
yet. That covers seeds, drafts, unreviewed AI revisions and unreviewed
translations, including reader machine translations. If something is amber, a
reader knows to hold it lightly. Do not use amber for warnings; use `--danger`
or neutral styling.

---

## 2. Colour

The default follows the system theme (`prefers-color-scheme`), and users can
override it. Both themes are designed; neither is derived by inverting the other.

### 2.1 Palette

| Token           | Light     | Dark      | Use                                      |
| --------------- | --------- | --------- | ---------------------------------------- |
| `--bg`          | `#F7F8FA` | `#0D0F12` | Page background                          |
| `--surface`     | `#FFFFFF` | `#15181D` | Cards, panels, editor                    |
| `--surface-2`   | `#F0F2F5` | `#1C2027` | Inset areas, code blocks, inputs         |
| `--line`        | `#E3E6EB` | `#222730` | Hairlines, dividers                      |
| `--line-strong` | `#CDD2DA` | `#303744` | Input borders, emphasised dividers       |
| `--ink`         | `#0E1116` | `#E6E9EE` | Body text, headings                      |
| `--muted`       | `#5B6472` | `#8A93A1` | Metadata, secondary text                 |
| `--cobalt`      | `#2B4EFF` | `#7D95FF` | Links, primary actions, focus, voice     |
| `--on-cobalt`   | `#FFFFFF` | `#0D0F12` | Text on cobalt fills                     |
| `--amber`       | `#B87A00` | `#F0B43C` | Unconfirmed markers and fills            |
| `--amber-ink`   | `#8A5A00` | `#F0B43C` | Amber **text** (meets contrast in light) |
| `--danger`      | `#D23A3A` | `#FF6B6B` | Destructive actions, errors              |
| `--success`     | `#1F8A5B` | `#4CC38A` | Confirmations                            |

Contrast on `--bg`/`--surface` meets WCAG 2.2 AA for body text (`--ink`,
`--muted`, `--cobalt`, `--amber-ink`). `--amber` in light mode is for glyphs and
fills only, never small text.

### 2.2 Derived tokens

Tints and borders are derived, never hand-picked:

```css
--cobalt-tint: color-mix(in oklch, var(--cobalt) 12%, transparent);
--cobalt-border: color-mix(in oklch, var(--cobalt) 30%, transparent);
--amber-tint: color-mix(in oklch, var(--amber) 14%, transparent);
--danger-tint: color-mix(in oklch, var(--danger) 12%, transparent);
--success-tint: color-mix(in oklch, var(--success) 12%, transparent);
```

Interaction states are translucent overlays, so one token works on any surface:

```css
--hover: color-mix(in oklch, var(--ink) 5%, transparent);
--press: color-mix(in oklch, var(--ink) 9%, transparent);
--select: var(--cobalt-tint);
```

### 2.3 Rules

- No hex values outside the token file.
- No gradients in UI chrome. The only gradient allowed is the capture waveform.
- Diffs use `--success-tint` / `--danger-tint` backgrounds with `--ink` text.

---

## 3. Typography

### 3.1 Faces

| Role    | Face                                         | Use                                                       |
| ------- | -------------------------------------------- | --------------------------------------------------------- |
| Display | Bricolage Grotesque (variable)               | Site name, page and article titles. Used with restraint.  |
| Text    | Atkinson Hyperlegible Next                   | Body text and UI                                          |
| Mono    | Commit Mono                                  | Spec line, Trail labels, code, timestamps, keyboard hints |
| CJK     | Noto Sans SC → PingFang SC → Microsoft YaHei | Chinese text in every role                                |

All faces are OFL-licensed and self-hosted through `@nuxt/fonts`, with
metric-matched fallbacks to keep CLS near zero. CJK fonts are sliced with
`cn-font-split` into `unicode-range` chunks and only requested when a page
contains CJK text.

Bricolage Grotesque is used at a slightly condensed width (`wdth` 90) and weight
650 for titles. That treatment is the typographic signature; do not use the
display face for body or UI text.

### 3.2 Scale

Base UI size 15px, base reading size 18px, ratio ≈ 1.25.

| Token       | Size / line-height | Face     | Use                     |
| ----------- | ------------------ | -------- | ----------------------- |
| `--t-micro` | 12 / 16            | Mono     | Trail labels, badges    |
| `--t-meta`  | 13 / 20            | Mono     | Spec line, timestamps   |
| `--t-ui`    | 15 / 22            | Text     | Buttons, nav, forms     |
| `--t-body`  | 18 / 29 (1.6)      | Text     | Reading text            |
| `--t-h4`    | 20 / 28            | Text 700 | Article h4              |
| `--t-h3`    | 23 / 30            | Display  | Article h3              |
| `--t-h2`    | 29 / 36            | Display  | Article h2              |
| `--t-h1`    | 40 / 46            | Display  | Article title (mobile)  |
| `--t-title` | 56 / 60            | Display  | Article title (desktop) |

### 3.3 Reading measure

- Latin: `max-width: 68ch`.
- CJK: `:lang(zh)` sets `line-height: 1.8`, `max-width: 38em`, `text-autospace: normal`.
- Paragraph spacing `0.9em`; no first-line indents.
- Code blocks: `--t-meta` size in Commit Mono, `--surface-2` background, and
  allowed to extend past the reading measure on wide screens.

---

## 4. Space, shape and depth

**Spacing** uses a 4px base: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`
(`--s-1` … `--s-9`).

**Radius**: `--r-sm 4px` (badges, inputs) · `--r-md 8px` (buttons, cards) ·
`--r-lg 14px` (dialogs, popovers) · `--r-full` (avatars, pills).

**Elevation** is mostly hairlines; shadows only for floating layers:

```css
--shadow-pop: 0 1px 2px rgb(0 0 0 / 0.06), 0 8px 24px rgb(0 0 0 / 0.08); /* light */
--shadow-pop: 0 1px 2px rgb(0 0 0 / 0.4), 0 8px 24px rgb(0 0 0 / 0.5); /* dark  */
```

**Focus ring**: `0 0 0 2px var(--bg), 0 0 0 4px var(--cobalt)`.

---

## 5. Layout

Breakpoints: `sm 640` · `md 768` · `lg 1024` · `xl 1280` · `2xl 1536`.

### 5.1 Article page

```text
xl and up
┌──────────────┬────────────────────────────────────┬────────────────┐
│ Garden       │  Title in Bricolage                │ On this page   │
│  ▸ Systems   │  ●───◆──▲──●──◇   rev 7 · 3d ago   │  Heading one   │
│  ▾ Writing   │  note · ◐ growing · 4 backlinks    │  Heading two   │
│    ○ Seed…   │                                    │                │
│    ● Ever…   │  Body text at 68ch ……………………       │ Backlinks (4)  │
│              │  ……………………………………………………              │  ● Some note   │
│              │                                    │  ◐ Another     │
│              │  ── Linked from ──                 │                │
│              │  ── Discussion (12) ──             │                │
└──────────────┴────────────────────────────────────┴────────────────┘
   240px              content, centred                   260px

lg: the Garden tree collapses into a drawer
md and below: one column; the right rail moves below the article
```

Paragraph annotations (phase 2) appear in the right rail next to their
paragraph on `xl`, and as a small marker at the end of the paragraph on smaller
screens. They are secondary; whole-document discussion is the default.

### 5.2 Home

No hero banner. The home page opens straight into the work:

```text
┌───────────────────────────────────────────────────────────┐
│ Cairn site name                 Search ⌘K   EN/中文   ◐    │
├───────────────────────────────────────────────────────────┤
│ Recently                                                  │
│  2026-10-01  ◐  Title of a growing note        rev 3 · ◆  │
│  2026-09-28  ●  Title of an evergreen article  rev 12     │
│  2026-09-27  ○  A seed                          rev 1 · ◆  │
├──────────────────────────────┬────────────────────────────┤
│ Garden (topics)              │ Discussions                │
│  Systems · 14                │  Thread title · 6 replies  │
│  Writing · 9                 │  Thread title · 2 replies  │
└──────────────────────────────┴────────────────────────────┘
```

Dates in the "Recently" list are set in mono and right-aligned to a column, so
the list reads like a log.

### 5.3 Studio

- Editor at the same 68ch measure as the reading view, so writing looks like
  the result.
- The Trail sits above the editor; unreviewed AI and translation revisions show
  a review bar with **Accept**, **Edit** and **Discard**.
- The capture button is always reachable: a floating control on mobile, `C` on
  desktop.

---

## 6. Components

Base components live in `packages/ui`, built on Reka UI primitives.

Button · IconButton · Input · Textarea · Select · Combobox · Checkbox · Switch ·
Dialog · Drawer · Popover · Tooltip · Menu · Tabs · Toast · Badge · Avatar ·
Skeleton · EmptyState · CommandPalette · Trail · SpecLine · MaturityMarker ·
VisibilityBadge · CaptureButton · Waveform · DiffView

### 6.1 Interactive states

Every interactive element defines all five:

| State         | Treatment                                          |
| ------------- | -------------------------------------------------- |
| Hover         | `--hover` overlay or colour shift                  |
| Active        | `--press` overlay and `scale(0.98)`                |
| Focus-visible | Focus ring (§4); never removed without replacement |
| Disabled      | `opacity: .45`, no pointer events                  |
| Loading       | Inline spinner, control disabled, width preserved  |

### 6.2 Async and data states

| State   | Rule                                                                             |
| ------- | -------------------------------------------------------------------------------- |
| Loading | Content areas use skeletons shaped like the real layout. Shown only after 300ms. |
| Empty   | Says what this place is for and offers the action that fills it.                 |
| Error   | Says what failed and what to do next. Never only `console.error`.                |
| Success | Mutations confirm with a toast using the same verb as the button.                |

Reactions, bookmarks and comment posting are **optimistic**: the UI updates
immediately and rolls back with an error toast on failure.

---

## 7. Motion

### 7.1 Tokens

```css
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--dur-fast: 120ms; /* hover, press, colour */
--dur: 200ms; /* enter, expand (default) */
--dur-slow: 350ms; /* page-level, large surfaces */
--transition: var(--dur) var(--ease-out);
```

Rules:

- Animate only `transform`, `opacity` and colours. Never `transition: all`.
- Exits are faster than entrances.
- Nothing above 400ms except the capture moment.
- `prefers-reduced-motion: reduce` disables all non-essential motion globally.

### 7.2 The three moments

1. **List to article.** Clicking an item in a list morphs its title into the
   article title with the View Transitions API (`view-transition-name` per
   document id). Everything else cross-fades.
2. **Voice to structure.** While transcribing, text streams in line by line in
   `--muted`. When structuring finishes, the lines reorder into the draft's
   sections with FLIP animation, headings settle into place, and the text turns
   to `--ink`. This is the one place motion may run up to ~800ms.
3. **Scrubbing the Trail** (phase 2). Changed passages fade their diff tint in
   and out as the scrubber moves; layout never jumps.

### 7.3 Feedback timing

| After a user action | Must show                                         |
| ------------------- | ------------------------------------------------- |
| 0–100ms             | Visual acknowledgement (press, optimistic change) |
| 300ms               | Skeleton or progress, if still waiting            |
| 1s+                 | Progress with words ("Transcribing…")             |
| Streaming AI output | First token visible as soon as it arrives         |

Links prefetch when they enter the viewport or on hover.

---

## 8. Accessibility

- Target WCAG 2.2 AA.
- All functionality reachable by keyboard.
- Icon-only buttons have accessible labels in every locale.
- Trail, maturity and visibility are understandable without colour (shape +
  text).
- Capture always offers a typed alternative.

### 8.1 Keyboard

| Key             | Action                        |
| --------------- | ----------------------------- |
| `⌘K` / `Ctrl K` | Command palette               |
| `/`             | Search                        |
| `C`             | New capture (studio)          |
| `N`             | New note (studio)             |
| `G` `H`         | Go home                       |
| `J` / `K`       | Next / previous item in lists |
| `?`             | Show shortcuts                |

---

## 9. Writing

- English is the source language for interface copy; Chinese is a full
  translation, not an afterthought.
- Sentence case, active voice, plain verbs.
- A control says exactly what it does, and the same verb is used through the
  flow: **Publish** → "Published".
- Errors say what happened and how to fix it. They don't apologise.
- Empty states invite an action.

### 9.1 Glossary

| Concept    | English     | 中文       |
| ---------- | ----------- | ---------- |
| Article    | Article     | 文章       |
| Note       | Note        | 笔记       |
| Thread     | Thread      | 讨论       |
| Comment    | Comment     | 评论       |
| Annotation | Annotation  | 批注       |
| Capture    | Capture     | 速记       |
| Draft      | Draft       | 草稿       |
| Publish    | Publish     | 发布       |
| Revision   | Revision    | 修订       |
| Trail      | Trail       | 足迹       |
| Seed       | Seed        | 种子       |
| Growing    | Growing     | 生长中     |
| Evergreen  | Evergreen   | 常青       |
| Garden     | Garden      | 花园       |
| Backlinks  | Linked from | 被引用     |
| Private    | Private     | 私密       |
| Unlisted   | Unlisted    | 仅链接可见 |
| Members    | Members     | 仅成员     |
| Public     | Public      | 公开       |
| Unreviewed | Unreviewed  | 待审核     |

---

## 10. Token file

The canonical token file is `packages/ui/src/tokens.css`. Tailwind v4 reads it
through `@theme`, so utilities and hand-written CSS share one source. Nothing
else may declare colours, durations, easings, radii or shadows.
