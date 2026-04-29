import {SCHEMA, type DocType, type Field} from './schema'
import {docsByType, docById, type Doc} from './data'
import {activeType, type StudioState, type Pane} from './state'
import {findImage} from './images'
import {renderPortableText, type PtBlock, type PtRun} from './portableText'

// Layout constants — fixed-width terminal so every block is exactly WIDTH wide.
export const WIDTH = 110
export const HEIGHT = 30 // rows excluding header (1) + status bar (1)

const COL_TREE = 22 // includes pane separator
const COL_LIST = 32
// COL_FORM = remainder

type CellKind =
  | 'chrome' // borders, separators, label/inactive UI
  | 'title' // pane titles + header chrome
  | 'fg' // primary content color
  | 'muted' // secondary
  | 'cursor' // blinking insertion point
  | 'selection-active' // selected row in the focused pane
  | 'selection-idle' // selected row in an unfocused pane
  | 'accent' // sanity-orange highlights
  | 'status-draft'
  | 'status-published'
  | 'status-changed'
  | 'breadcrumb'
  | 'edit-banner'
  // ── PT-in-PT styling ────────────────────────────────────────────────
  | 'pt-heading'
  | 'pt-quote'
  | 'pt-code'
  | 'pt-link'
  | 'image-pixel'

type Run = {text: string; kind: CellKind}

let blockCounter = 0
const nextKey = () => `b${++blockCounter}`
const nextSpanKey = () => `s${++blockCounter}`

type Block = {
  _type: 'block'
  _key: string
  style: 'normal'
  markDefs: []
  children: Array<{_type: 'span'; _key: string; text: string; marks: string[]}>
}

const markForKind = (k: CellKind): string[] => {
  switch (k) {
    case 'chrome': return ['chrome']
    case 'title': return ['title']
    case 'fg': return ['fg']
    case 'muted': return ['muted']
    case 'cursor': return ['cursor']
    case 'selection-active': return ['selA']
    case 'selection-idle': return ['selI']
    case 'accent': return ['accent']
    case 'status-draft': return ['statusD']
    case 'status-published': return ['statusP']
    case 'status-changed': return ['statusC']
    case 'breadcrumb': return ['crumb']
    case 'edit-banner': return ['editBan']
    case 'pt-heading': return ['ptH']
    case 'pt-quote': return ['ptQ']
    case 'pt-code': return ['ptC']
    case 'pt-link': return ['ptL']
    case 'image-pixel': return ['imgPx']
  }
}

// Map PT renderer kinds (which don't know about studio chrome) to our cell kinds.
const ptKindToCellKind = (k: PtRun['kind']): CellKind => {
  switch (k) {
    case 'fg': return 'fg'
    case 'muted': return 'muted'
    case 'accent': return 'accent'
    case 'cursor': return 'cursor'
    case 'h': return 'pt-heading'
    case 'quote': return 'pt-quote'
    case 'code-bg': return 'pt-code'
    case 'link': return 'pt-link'
  }
}

const mkBlock = (runs: Run[]): Block => ({
  _type: 'block',
  _key: nextKey(),
  style: 'normal',
  markDefs: [],
  children: runs.map((r) => ({
    _type: 'span',
    _key: nextSpanKey(),
    text: r.text.length ? r.text : ' ',
    marks: markForKind(r.kind),
  })),
})

const pad = (s: string, n: number) => {
  // truncate visually if too long, padding with spaces otherwise
  if ([...s].length === n) return s
  if ([...s].length > n) return [...s].slice(0, n).join('')
  return s + ' '.repeat(n - [...s].length)
}

const truncate = (s: string, n: number): string => {
  if ([...s].length <= n) return s
  if (n <= 1) return [...s].slice(0, n).join('')
  return [...s].slice(0, n - 1).join('') + '…'
}

// ──────────────────────────────────────────────────────────────────────
// Header (top row) — DOOM-style title bar but in studio chrome
// ──────────────────────────────────────────────────────────────────────

const buildHeader = (s: StudioState): Block => {
  const left = ' ◆ pt-studio '
  const project = ' play.sanity.io '
  const dataset = ' production '
  const user = ' eoin@sanity.io '
  const right = ` ${user} `
  const fillerLen = WIDTH - left.length - project.length - dataset.length - right.length - 4
  const filler = '─'.repeat(Math.max(0, fillerLen))
  return mkBlock([
    {text: left, kind: 'accent'},
    {text: '│', kind: 'chrome'},
    {text: project, kind: 'fg'},
    {text: '│', kind: 'chrome'},
    {text: dataset, kind: 'muted'},
    {text: filler, kind: 'chrome'},
    {text: '│', kind: 'chrome'},
    {text: right, kind: 'fg'},
    {text: '│', kind: 'chrome'},
  ])
}

// ──────────────────────────────────────────────────────────────────────
// Status bar (bottom row) — breadcrumb on the left, hint on the right
// ──────────────────────────────────────────────────────────────────────

const buildBreadcrumb = (s: StudioState): string => {
  const t = activeType(s)
  const docs = docsByType(t.name)
  const doc = docs[s.listIndex]
  const parts = [t.pluralTitle]
  if (s.activePane !== 'tree' && doc) {
    parts.push(String(doc.values.title || doc.values.name || doc._id))
  }
  if (s.activePane === 'form' && doc) {
    const f = t.fields[s.formIndex]
    if (f) parts.push(f.label)
  }
  return parts.join(' › ')
}

const buildStatusBar = (s: StudioState): Block => {
  const flashing = s.flash && Date.now() < s.flashUntil
  const left = ' ' + (flashing ? s.flash : buildBreadcrumb(s))
  const right = s.editing
    ? ' ▌ EDITING — Esc to discard ▌ '
    : ' Tab │ ↑↓ │ Enter / → │ Esc / ← │ E to edit │ Cmd+S to save '
  const filler = ' '.repeat(Math.max(1, WIDTH - left.length - right.length))
  return mkBlock([
    {text: truncate(left, WIDTH - right.length - 1), kind: flashing ? 'accent' : 'breadcrumb'},
    {text: filler, kind: 'chrome'},
    {text: right, kind: s.editing ? 'edit-banner' : 'muted'},
  ])
}

// ──────────────────────────────────────────────────────────────────────
// Tree pane (left)
// ──────────────────────────────────────────────────────────────────────

const titleRow = (text: string, width: number, focused: boolean): Run[] => {
  const t = ' ' + truncate(text, width - 2)
  return [
    {text: pad(t, width - 1), kind: focused ? 'accent' : 'title'},
    {text: '│', kind: 'chrome'},
  ]
}

const treeRows = (s: StudioState): Run[][] => {
  const focused = s.activePane === 'tree'
  const rows: Run[][] = []
  rows.push(titleRow('STRUCTURE', COL_TREE, focused))
  rows.push([
    {text: pad('', COL_TREE - 1), kind: 'chrome'},
    {text: '│', kind: 'chrome'},
  ])
  for (let i = 0; i < SCHEMA.length; i++) {
    const t = SCHEMA[i]
    const sel = i === s.treeIndex
    const marker = sel ? (focused ? '▶' : '▷') : ' '
    const text = ` ${marker} ${t.icon}  ${truncate(t.pluralTitle, COL_TREE - 8)}`
    const padded = pad(text, COL_TREE - 1)
    const kind: CellKind = sel ? (focused ? 'selection-active' : 'selection-idle') : 'fg'
    rows.push([
      {text: padded, kind},
      {text: '│', kind: 'chrome'},
    ])
  }
  return rows
}

// ──────────────────────────────────────────────────────────────────────
// List pane (middle)
// ──────────────────────────────────────────────────────────────────────

const formatRelative = (iso: string): string => {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  const mon = Math.floor(day / 30)
  return `${mon}mo ago`
}

const statusGlyph = (status: Doc['status']): {ch: string; kind: CellKind} => {
  switch (status) {
    case 'published': return {ch: '●', kind: 'status-published'}
    case 'draft':     return {ch: '◌', kind: 'status-draft'}
    case 'changed':   return {ch: '◐', kind: 'status-changed'}
  }
}

const listRows = (s: StudioState): Run[][] => {
  const focused = s.activePane === 'list'
  const t = activeType(s)
  const docs = docsByType(t.name)
  const rows: Run[][] = []
  rows.push(titleRow(t.pluralTitle.toUpperCase() + `  (${docs.length})`, COL_LIST, focused))
  rows.push([
    {text: pad('', COL_LIST - 1), kind: 'chrome'},
    {text: '│', kind: 'chrome'},
  ])

  if (docs.length === 0) {
    rows.push([
      {text: pad('  (no documents yet)', COL_LIST - 1), kind: 'muted'},
      {text: '│', kind: 'chrome'},
    ])
    return rows
  }

  for (let i = 0; i < docs.length; i++) {
    const d = docs[i]
    const sel = i === s.listIndex
    const sg = statusGlyph(d.status)
    const title = String(d.values.title || d.values.name || d.values.siteName || d._id)
    const subline = formatRelative(d.updatedAt)
    const marker = sel ? (focused ? '▶' : '▷') : ' '
    const titleLen = COL_LIST - 7 // ` ▶ ● ` (5) + spacing + reserved
    const titleText = pad(truncate(title, titleLen), titleLen)
    const kind: CellKind = sel ? (focused ? 'selection-active' : 'selection-idle') : 'fg'
    rows.push([
      {text: ` ${marker} `, kind},
      {text: sg.ch, kind: sg.kind},
      {text: ' ', kind},
      {text: titleText, kind},
      {text: '│', kind: 'chrome'},
    ])
    // sub-row with status + relative time
    const statusLabel = d.status === 'published' ? 'PUBLISHED' : d.status === 'draft' ? 'DRAFT' : 'CHANGES'
    const sub = `      ${statusLabel} · ${subline}`
    rows.push([
      {text: pad(truncate(sub, COL_LIST - 1), COL_LIST - 1), kind: 'muted'},
      {text: '│', kind: 'chrome'},
    ])
  }
  return rows
}

// ──────────────────────────────────────────────────────────────────────
// Form pane (right)
// ──────────────────────────────────────────────────────────────────────

// Returns the rendered rows plus, for each field, the row index where its
// label starts. The caller uses these offsets to scroll the form pane so
// the focused field is always in view.
const formRows = (s: StudioState): {rows: Run[][]; fieldStarts: number[]} => {
  const focused = s.activePane === 'form'
  const t = activeType(s)
  const docs = docsByType(t.name)
  const doc = docs[s.listIndex]
  const formW = WIDTH - COL_TREE - COL_LIST
  const rows: Run[][] = []
  const fieldStarts: number[] = []

  if (!doc) {
    rows.push([{text: pad(' DOCUMENT', formW - 1), kind: 'title'}, {text: ' ', kind: 'chrome'}])
    rows.push([{text: pad('', formW - 1), kind: 'chrome'}, {text: ' ', kind: 'chrome'}])
    rows.push([{text: pad('  No document selected.', formW - 1), kind: 'muted'}, {text: ' ', kind: 'chrome'}])
    return {rows, fieldStarts}
  }

  const sg = statusGlyph(doc.status)
  const titleStr = String(doc.values.title || doc.values.name || doc.values.siteName || doc._id)

  // Pane title with status pill
  rows.push([
    {text: ' ', kind: focused ? 'accent' : 'title'},
    {text: sg.ch, kind: sg.kind},
    {text: ' ', kind: focused ? 'accent' : 'title'},
    {text: pad(truncate(titleStr.toUpperCase(), formW - 6), formW - 5), kind: focused ? 'accent' : 'title'},
    {text: ' ', kind: 'chrome'},
  ])
  rows.push([
    {text: pad(`  ${t.title}  ·  ${doc._id}  ·  ${formatRelative(doc.updatedAt)}`, formW - 1), kind: 'muted'},
    {text: ' ', kind: 'chrome'},
  ])
  rows.push([{text: pad('', formW - 1), kind: 'chrome'}, {text: ' ', kind: 'chrome'}])

  // Fields
  for (let i = 0; i < t.fields.length; i++) {
    fieldStarts[i] = rows.length
    const f = t.fields[i]
    const sel = i === s.formIndex
    const indicator = sel ? (focused ? '▶' : '▷') : ' '
    const labelKind: CellKind = sel ? (focused ? 'selection-active' : 'selection-idle') : 'fg'

    // Label row
    rows.push([
      {text: ` ${indicator}  `, kind: labelKind},
      {text: f.label, kind: labelKind},
      {text: '   ', kind: 'fg'},
      {text: `[${f.kind}]${f.to ? ' → ' + f.to : ''}`, kind: 'muted'},
      {text: pad('', Math.max(0, formW - 1 - 4 - f.label.length - 3 - (f.kind.length + 2 + (f.to ? 4 + f.to.length : 0)))), kind: 'fg'},
      {text: ' ', kind: 'chrome'},
    ])

    // Value row(s). When this field is the active edit target, render the
    // live edit buffer (with the cursor at editCursor) instead of the
    // stored value.
    const editingThis = sel && focused && s.editing
    const valueRows = editingThis
      ? renderEditBuffer(s.editBuffer, s.editCursor, formW - 6, s.blinkPhase)
      : renderFieldValue(f, doc, formW - 6, false, s.blinkPhase)
    for (const vr of valueRows) {
      rows.push([
        {text: '     ', kind: 'fg'},
        ...vr,
        {text: pad('', Math.max(0, formW - 1 - 5 - runWidth(vr))), kind: 'fg'},
        {text: ' ', kind: 'chrome'},
      ])
    }

    if (f.description) {
      rows.push([
        {text: '     ', kind: 'fg'},
        {text: pad(truncate('› ' + f.description, formW - 7), formW - 7), kind: 'muted'},
        {text: ' ', kind: 'chrome'},
        {text: ' ', kind: 'chrome'},
      ])
    }

    rows.push([{text: pad('', formW - 1), kind: 'chrome'}, {text: ' ', kind: 'chrome'}])
  }

  return {rows, fieldStarts}
}

const runWidth = (runs: Run[]): number =>
  runs.reduce((acc, r) => acc + [...r.text].length, 0)

const cursor = (blink: number): Run => ({
  text: blink % 2 === 0 ? '▌' : ' ',
  kind: 'cursor',
})

// Render an in-progress edit buffer with the cursor inserted at the right
// offset. Wraps to the column width so long values stay readable.
const renderEditBuffer = (
  buffer: string,
  cursorIdx: number,
  width: number,
  blink: number,
): Run[][] => {
  const before = buffer.slice(0, cursorIdx)
  const after = buffer.slice(cursorIdx)
  const cur = cursor(blink)

  // We need to wrap at `width`, but cursor lives between two chars rather
  // than as a chunk. Simplest correct approach: render before+cursor+after
  // as a single logical sequence, then fold into lines.
  type Atom = {ch: string; kind: 'fg' | 'cursor'}
  const atoms: Atom[] = []
  for (const ch of before) atoms.push({ch, kind: 'fg'})
  // Use the blink phase so the cursor visibly pulses while typing
  atoms.push({ch: cur.text, kind: 'cursor'})
  for (const ch of after) atoms.push({ch, kind: 'fg'})

  const out: Run[][] = []
  let line: Run[] = []
  let lineLen = 0
  let pendingKind: 'fg' | 'cursor' | null = null
  let pendingText = ''
  const flush = () => {
    if (pendingKind && pendingText) {
      line.push({text: pendingText, kind: pendingKind})
      pendingKind = null
      pendingText = ''
    }
  }
  for (const a of atoms) {
    if (lineLen >= width) {
      flush()
      out.push(line)
      line = []
      lineLen = 0
    }
    if (pendingKind === a.kind) {
      pendingText += a.ch
    } else {
      flush()
      pendingKind = a.kind
      pendingText = a.ch
    }
    lineLen++
  }
  flush()
  if (line.length === 0) line = [{text: '', kind: 'fg'}]
  out.push(line)
  return out
}

const renderFieldValue = (
  f: Field,
  doc: Doc,
  width: number,
  editing: boolean,
  blink: number,
): Run[][] => {
  const v = doc.values[f.name]

  const wrap = (str: string, kind: CellKind): Run[][] => {
    if (!str) return [[{text: '(empty)', kind: 'muted'}, ...(editing ? [cursor(blink)] : [])]]
    // simple greedy wrap
    const out: Run[][] = []
    const words = str.split(/(\s+)/)
    let line = ''
    for (const w of words) {
      if ([...line].length + [...w].length > width) {
        out.push([{text: line, kind}])
        line = w.trimStart()
      } else {
        line += w
      }
    }
    if (line.length) out.push([{text: line, kind}])
    if (editing && out.length) {
      out[out.length - 1] = [...out[out.length - 1], cursor(blink)]
    }
    return out
  }

  switch (f.kind) {
    case 'string':
    case 'text':
    case 'slug':
      return wrap(String(v ?? ''), 'fg')

    case 'datetime': {
      if (!v) return [[{text: '(unset)', kind: 'muted'}]]
      const d = new Date(String(v))
      const human = d.toLocaleString('en-US', {dateStyle: 'medium', timeStyle: 'short'})
      return [[{text: human, kind: 'fg'}, {text: '   ', kind: 'fg'}, {text: `(${formatRelative(String(v))})`, kind: 'muted'}]]
    }

    case 'reference': {
      const ref = String(v ?? '')
      if (!ref) return [[{text: '(no reference)', kind: 'muted'}]]
      const target = docById(ref)
      if (!target) return [[{text: '⚠  unresolved reference: ' + ref, kind: 'status-draft'}]]
      const label = String(target.values.name || target.values.title || target._id)
      return [[
        {text: '→ ', kind: 'accent'},
        {text: label, kind: 'fg'},
        {text: '   ', kind: 'fg'},
        {text: `(${target._type})`, kind: 'muted'},
      ]]
    }

    case 'array': {
      const arr = Array.isArray(v) ? (v as unknown[]) : []
      if (arr.length === 0) return [[{text: '(0 items)', kind: 'muted'}]]
      const items = arr.map((id) => {
        const t = docById(String(id))
        return t ? String(t.values.title || t.values.name || t._id) : String(id)
      })
      const out: Run[][] = [[{text: `${arr.length} items`, kind: 'accent'}]]
      for (const it of items.slice(0, 4)) {
        out.push([
          {text: '  • ', kind: 'muted'},
          {text: truncate(it, width - 4), kind: 'fg'},
        ])
      }
      return out
    }

    case 'image': {
      const img = findImage(v)
      if (!img) {
        return [[{text: '(no image set)', kind: 'muted'}]]
      }
      const out: Run[][] = []
      // Top border sized to the image
      const top = '┌' + '─'.repeat(img.width) + '┐'
      out.push([{text: top, kind: 'chrome'}])
      for (const r of img.rows) {
        out.push([
          {text: '│', kind: 'chrome'},
          {text: pad(r, img.width), kind: 'image-pixel'},
          {text: '│', kind: 'chrome'},
        ])
      }
      const bot = '└' + '─'.repeat(img.width) + '┘'
      out.push([{text: bot, kind: 'chrome'}])
      out.push([{text: img.meta, kind: 'muted'}])
      return out
    }

    case 'portableText': {
      const blocks = Array.isArray(v) ? (v as PtBlock[]) : []
      if (blocks.length === 0) {
        return [[{text: '(empty body)', kind: 'muted'}]]
      }
      // Render the PT inside a soft frame so it reads as "this is a PTE field"
      const w = Math.max(20, width - 2)
      const labelLine: Run = {
        text: '┌─ portable text ' + '─'.repeat(Math.max(0, w + 2 - 17)) + '┐',
        kind: 'chrome',
      }
      const closeLine: Run = {
        text: '└' + '─'.repeat(w + 2) + '┘',
        kind: 'chrome',
      }
      const ptRows = renderPortableText(blocks, w)
      const out: Run[][] = []
      out.push([labelLine])
      for (const ptLine of ptRows) {
        const runs: Run[] = ptLine.map((r) => ({text: r.text, kind: ptKindToCellKind(r.kind)}))
        const used = runs.reduce((acc, r) => acc + [...r.text].length, 0)
        out.push([
          {text: '│ ', kind: 'chrome'},
          ...runs,
          {text: pad('', Math.max(0, w - used)), kind: 'fg'},
          {text: ' │', kind: 'chrome'},
        ])
      }
      out.push([closeLine])
      const blockCount = blocks.length
      const wordCount = blocks
        .flatMap((b) => b.children?.map((c) => c.text) ?? [])
        .join(' ')
        .split(/\s+/)
        .filter(Boolean).length
      out.push([{text: `${blockCount} blocks · ${wordCount} words · last edited just now`, kind: 'muted'}])
      return out
    }

    case 'boolean':
      return [[{text: v ? '☑ true' : '☐ false', kind: v ? 'accent' : 'muted'}]]

    case 'number':
      return [[{text: String(v ?? 0), kind: 'fg'}]]

    default:
      return [[{text: String(v ?? ''), kind: 'fg'}]]
  }
}

// ──────────────────────────────────────────────────────────────────────
// Compose the three panes side-by-side into rows
// ──────────────────────────────────────────────────────────────────────

const composeRows = (
  tree: Run[][],
  list: Run[][],
  form: Run[][],
  height: number,
): Run[][] => {
  const blank = (w: number): Run[] => [
    {text: pad('', w - 1), kind: 'chrome'},
    {text: '│', kind: 'chrome'},
  ]
  const blankR = (w: number): Run[] => [{text: pad('', w - 1), kind: 'chrome'}, {text: ' ', kind: 'chrome'}]
  const out: Run[][] = []
  for (let i = 0; i < height; i++) {
    out.push([
      ...(tree[i] ?? blank(COL_TREE)),
      ...(list[i] ?? blank(COL_LIST)),
      ...(form[i] ?? blankR(WIDTH - COL_TREE - COL_LIST)),
    ])
  }
  return out
}

// ──────────────────────────────────────────────────────────────────────
// Top-level: state → portable text blocks
// ──────────────────────────────────────────────────────────────────────

export const renderStudio = (s: StudioState): Block[] => {
  blockCounter = 0
  const blocks: Block[] = []
  blocks.push(buildHeader(s))

  // Pane separator beneath header
  blocks.push(
    mkBlock([
      {text: '─'.repeat(COL_TREE - 1), kind: 'chrome'},
      {text: '┬', kind: 'chrome'},
      {text: '─'.repeat(COL_LIST - 1), kind: 'chrome'},
      {text: '┬', kind: 'chrome'},
      {text: '─'.repeat(WIDTH - COL_TREE - COL_LIST - 1), kind: 'chrome'},
    ]),
  )

  const tree = treeRows(s)
  const list = listRows(s)
  const {rows: formAll, fieldStarts} = formRows(s)
  // Auto-scroll: keep the focused field's start row inside the viewport.
  const viewport = HEIGHT - 2
  const targetStart = fieldStarts[s.formIndex] ?? 0
  let scroll = s.formScroll
  if (s.activePane === 'form' || s.editing) {
    const margin = 2
    if (targetStart < scroll + margin) scroll = Math.max(0, targetStart - margin)
    // bias down enough that the field's first ~3 rows are visible
    const bottomLimit = scroll + viewport - 4
    if (targetStart > bottomLimit) scroll = Math.max(0, targetStart - viewport + 6)
    scroll = Math.min(scroll, Math.max(0, formAll.length - viewport))
  }
  s.formScroll = scroll
  const form = formAll.slice(scroll, scroll + viewport)
  // Pad to the viewport so compose doesn't try to fall back to blanks oddly.
  while (form.length < viewport) {
    form.push([
      {text: pad('', WIDTH - COL_TREE - COL_LIST - 1), kind: 'chrome'},
      {text: ' ', kind: 'chrome'},
    ])
  }
  const composed = composeRows(tree, list, form, viewport)
  for (const row of composed) blocks.push(mkBlock(row))

  // Bottom separator
  blocks.push(
    mkBlock([
      {text: '─'.repeat(COL_TREE - 1), kind: 'chrome'},
      {text: '┴', kind: 'chrome'},
      {text: '─'.repeat(COL_LIST - 1), kind: 'chrome'},
      {text: '┴', kind: 'chrome'},
      {text: '─'.repeat(WIDTH - COL_TREE - COL_LIST - 1), kind: 'chrome'},
    ]),
  )

  blocks.push(buildStatusBar(s))
  return blocks
}
