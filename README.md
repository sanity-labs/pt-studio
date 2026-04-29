# PT-STUDIO

**The entire Sanity Studio shell, rendered as ASCII inside a single `@portabletext/editor` field.**

Three panes (structure tree │ document list │ form view), full keyboard navigation, status bar with breadcrumbs, status pills, faux blinking cursor — every row of the screen is one Portable Text block. Input is captured by the [Behaviors API](https://www.portabletext.org/editor/guides/create-behavior/): `defineBehavior` rules match navigation keys, run `effect()` to mutate a small ref, and return no other action so the editor never inserts text.

Sister project to [pt-doom](https://github.com/sanity-labs/pt-doom). Together they answer the question *"what could you possibly render inside a PTE field?"*.

[▶ Open at pt-studio.sanity.dev](https://pt-studio.sanity.dev)

## Controls

| Key | Action |
| --- | --- |
| `Tab` / `Shift+Tab` | cycle panes |
| `↑` / `↓` | move selection within the active pane |
| `Enter` / `→` | drill in (tree → list → form → edit) |
| `Esc` / `←` | back out |
| `E` | edit the focused field (faux — discarded with Esc) |
| `Cmd+S` | save (faux flash) |

## How it's wired

```
keyboard.keydown ──► defineBehavior guard ──► effect() ──► mutate state ref
                                                              │
                       ┌──────────────────────────────────────┘
                       ▼
         requestAnimationFrame → renderStudio(state)
                                                      │
                                                      ▼
                              editor.send({type:'update value', value})
                                                      │
                                                      ▼
                                          <PortableTextEditable /> paints
```

- **`src/studio/schema.ts`** — mocked blog/marketing schema (Post, Page, Author, Category, Site Settings) with field types: string, text, slug, datetime, reference, array, image, portableText, boolean, number.
- **`src/studio/data.ts`** — fake content. Posts with statuses (`draft` / `published` / `changed`), authors with bios, etc.
- **`src/studio/render.ts`** — composes three panes side-by-side into Portable Text blocks. Each block is exactly `WIDTH` chars wide with column separators (`│`).
- **`src/studio/behaviors.ts`** — `keyboard.keydown` rule that matches `Tab`, arrows, `Enter`, `Esc`, `E`, `Cmd+S`. Plus `insert.text` / `insert.break` guards as belt-and-braces against stray edits.
- **`src/App.tsx`** — `<EditorProvider>` + `<PortableTextEditable>` + `<BehaviorPlugin>`. A `requestAnimationFrame` loop drives the cursor blink and re-renders.

## Hack it live

```js
__pts.activePane = 'form'      // jump straight to the form
__pts.editing = true           // turn on the faux edit cursor
__pts.flash = 'Hi mom'; __pts.flashUntil = Date.now() + 5000
```

## Run locally

```
npm install
npm run dev
```

## License

MIT — see [LICENSE](./LICENSE).
