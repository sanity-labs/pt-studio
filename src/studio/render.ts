import {SCHEMA, type DocType, type Field} from './schema'
import {docsByType, docById, type Doc} from './data'
import {activeType, type StudioState, type Pane} from './state'

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

const formRows = (s: StudioState): Run[][] => {
  const focused = s.activePane === 'form'
  const t = activeType(s)
  const docs = docsByType(t.name)
  const doc = docs[s.listIndex]
  const formW = WIDTH - COL_TREE - COL_LIST
  const rows: Run[][] = []

  if (!doc) {
    rows.push([{text: pad(' DOCUMENT', formW - 1), kind: 'title'}, {text: ' ', kind: 'chrome'}])
    rows.push([{text: pad('', formW - 1), kind: 'chrome'}, {text: ' ', kind: 'chrome'}])
    rows.push([{text: pad('  No document selected.', formW - 1), kind: 'muted'}, {text: ' ', kind: 'chrome'}])
    return rows
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

    // Value row(s)
    const valueRows = renderFieldValue(f, doc, formW - 6, sel && focused && s.editing, s.blinkPhase)
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

  return rows
}

const runWidth = (runs: Run[]): number =>
  runs.reduce((acc, r) => acc + [...r.text].length, 0)

const cursor = (blink: number): Run => ({
  text: blink % 2 === 0 ? '▌' : ' ',
  kind: 'cursor',
})

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
      return [
        [{text: `${arr.length} items`, kind: 'accent'}],
        ...items.slice(0, 4).map((it) => [
          {text: '  • ', kind: 'muted'} as Run,
          {text: truncate(it, width - 4), kind: 'fg'},
        ]),
      ]
    }

    case 'image':
      return [[
        {text: '┌──────┐ ', kind: 'chrome'},
        {text: String(v ?? '(no image)'), kind: v ? 'fg' : 'muted'},
      ], [
        {text: '│ ░▓░▓ │ ', kind: 'chrome'},
        {text: '1920 × 1080  ·  jpg  ·  342 kB', kind: 'muted'},
      ], [
        {text: '└──────┘', kind: 'chrome'},
      ]]

    case 'portableText': {
      // It's a portable-text field rendered inside another portable-text
      // field. Yes. Render a faux-block summary that fits in the column.
      const w = Math.max(20, width)
      const dashes = (n: number) => '─'.repeat(Math.max(0, n))
      const labelLine = (label: string): Run => ({
        text: '┌─ ' + label + ' ' + dashes(w - 5 - label.length) + '┐',
        kind: 'chrome',
      })
      const innerLine = (text: string): Run[] => {
        const inner = ' ' + truncate(text, w - 4) + ' '
        return [
          {text: '│', kind: 'chrome'},
          {text: pad(inner, w - 2), kind: 'fg'},
          {text: '│', kind: 'chrome'},
        ]
      }
      const closeLine: Run = {text: '└' + dashes(w - 2) + '┘', kind: 'chrome'}
      return [
        [labelLine('block')],
        innerLine('Lorem ipsum dolor sit amet, consectetur adipiscing'),
        innerLine('elit. Sed do eiusmod tempor incididunt ut labore.'),
        [closeLine],
        [labelLine('list')],
        innerLine('• First bullet — making the case for ASCII'),
        innerLine('• Second bullet — Portable Text is just data'),
        [closeLine],
        [{text: '4 blocks · 218 words · last edited just now', kind: 'muted'}],
      ]
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
  const form = formRows(s)
  const composed = composeRows(tree, list, form, HEIGHT - 2)
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
