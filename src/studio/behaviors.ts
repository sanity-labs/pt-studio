import {defineBehavior, effect} from '@portabletext/editor/behaviors'
import {SCHEMA} from './schema'
import {DOCS, docsByType} from './data'
import {activeType, type StudioState, type Pane} from './state'
import type {PtBlock} from './portableText'
import {
  blockTextLen,
  deleteCharAt,
  forwardDeleteAt,
  insertCharAt,
  marksAtOffset,
  mergeBlockWithPrev,
  splitBlockAt,
  toggleMark,
} from './ptEdit'

/**
 * All keyboard input for pt-studio is captured by the Portable Text
 * Editor's Behaviors API. Tab/Shift-Tab cycles panes, ↑↓ moves the
 * selection within the active pane, Enter or → drills in, Esc or ←
 * backs out, E enters edit mode, Esc exits it.
 *
 * Every matched key is consumed by a single `effect()` action with
 * nothing else returned, so the editor never inserts a character.
 */

// Keys we always intercept (navigation chrome).
const NAV_KEYS = new Set<string>([
  'Tab',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Enter', 'Escape',
  'e', 'E',
  's', 'S',
  ' ',
])

// Field types that hold a single-line string we know how to edit textually.
const STRING_KINDS = new Set(['string', 'text', 'slug', 'datetime', 'number'])
// Field types we open in the rich PT mini-editor.
const PT_KINDS = new Set(['portableText'])
const EDITABLE_KINDS = new Set([...STRING_KINDS, ...PT_KINDS])

const isPrintable = (k: string) =>
  k.length === 1 &&
  k.charCodeAt(0) >= 0x20 &&
  k.charCodeAt(0) !== 0x7f

const PANES: Pane[] = ['tree', 'list', 'form']

const flash = (s: StudioState, msg: string, durationMs = 2500) => {
  s.flash = msg
  s.flashUntil = Date.now() + durationMs
}

const nudge = (s: StudioState) => {
  s.lastTickMs = Date.now()
  s.blinkPhase = 0 // reset blink so cursor stays solid right after a keystroke
}

const enterEditMode = (s: StudioState) => {
  const t = activeType(s)
  const docs = docsByType(t.name)
  const doc = docs[s.listIndex]
  const f = t.fields[s.formIndex]
  if (!doc || !f) return false
  if (!EDITABLE_KINDS.has(f.kind)) {
    flash(s, `${f.label}: ${f.kind} fields aren't editable in this demo`)
    return false
  }

  if (PT_KINDS.has(f.kind)) {
    // PT mode: cursor at end of last block, marks taken from there
    const blocks = (doc.values[f.name] as PtBlock[] | undefined) ?? []
    if (blocks.length === 0) {
      blocks.push({_type: 'block', style: 'normal', children: [{_type: 'span', text: '', marks: []}], markDefs: []})
      doc.values[f.name] = blocks
    }
    const lastIdx = blocks.length - 1
    s.editingKind = 'pt'
    s.ptBlockIndex = lastIdx
    s.ptOffset = blockTextLen(blocks[lastIdx])
    s.ptMarks = marksAtOffset(blocks[lastIdx], s.ptOffset)
    s.editing = true
    flash(s, `Editing ${f.label} — type / Enter for new block / ⌘B/I/E for marks / ⌘1–3 for headings / Esc to exit`, 5000)
    return true
  }

  // String mode (default)
  const current = doc.values[f.name]
  s.editingKind = 'string'
  s.editBuffer = current === undefined || current === null ? '' : String(current)
  s.editCursor = s.editBuffer.length
  s.editing = true
  flash(s, `Editing ${f.label} — Enter to save · Esc to discard`)
  return true
}

// Get the PT array we're currently editing (always lives on the focused doc).
const getEditingBlocks = (s: StudioState): PtBlock[] | null => {
  const t = activeType(s)
  const docs = docsByType(t.name)
  const doc = docs[s.listIndex]
  const f = t.fields[s.formIndex]
  if (!doc || !f) return null
  const v = doc.values[f.name]
  return Array.isArray(v) ? (v as PtBlock[]) : null
}

const stampDocChanged = (s: StudioState) => {
  const t = activeType(s)
  const docs = docsByType(t.name)
  const doc = docs[s.listIndex]
  if (!doc) return
  const target = DOCS.find((d) => d._id === doc._id)
  if (!target) return
  target.updatedAt = new Date().toISOString()
  if (target.status === 'published') target.status = 'changed'
}

const PT_STYLE_KEYS: Record<string, NonNullable<PtBlock['style']>> = {
  '0': 'normal',
  '1': 'h1',
  '2': 'h2',
  '3': 'h3',
}

const commitEdit = (s: StudioState) => {
  const t = activeType(s)
  const docs = docsByType(t.name)
  const doc = docs[s.listIndex]
  const f = t.fields[s.formIndex]
  if (!doc || !f) {
    s.editing = false
    return
  }
  // Find the doc in the source-of-truth array and mutate it. docsByType
  // returns sorted views over the same Doc objects, so this in-place mutate
  // is reflected everywhere.
  const target = DOCS.find((d) => d._id === doc._id)
  if (target) {
    target.values[f.name] = f.kind === 'number' ? Number(s.editBuffer) : s.editBuffer
    target.updatedAt = new Date().toISOString()
    if (target.status === 'published') target.status = 'changed'
  }
  s.editing = false
  flash(s, `✓ ${f.label} saved`)
}

export const makeStudioBehaviors = (stateRef: {current: StudioState}) => {
  // Keystrokes that drive an in-progress STRING edit.
  const onStringEditKeydown = defineBehavior({
    on: 'keyboard.keydown',
    guard: ({event}) => {
      const s = stateRef.current
      if (!s.editing || s.editingKind !== 'string') return false
      const k = event.originEvent.key
      if (k === 'Backspace' || k === 'Delete' || k === 'Home' || k === 'End') return true
      if (k === 'ArrowLeft' || k === 'ArrowRight') return true
      if (k === 'Enter' || k === 'Escape') return true
      if (event.originEvent.metaKey || event.originEvent.ctrlKey || event.originEvent.altKey) return false
      return isPrintable(k)
    },
    actions: [
      ({event}) => [
        effect(() => {
          const s = stateRef.current
          const k = event.originEvent.key
          nudge(s)
          if (k === 'Escape') { s.editing = false; flash(s, 'Discarded edit'); return }
          if (k === 'Enter') { commitEdit(s); return }
          if (k === 'Backspace') {
            if (s.editCursor > 0) {
              s.editBuffer = s.editBuffer.slice(0, s.editCursor - 1) + s.editBuffer.slice(s.editCursor)
              s.editCursor--
            }
            return
          }
          if (k === 'Delete') {
            if (s.editCursor < s.editBuffer.length) {
              s.editBuffer = s.editBuffer.slice(0, s.editCursor) + s.editBuffer.slice(s.editCursor + 1)
            }
            return
          }
          if (k === 'ArrowLeft') { s.editCursor = Math.max(0, s.editCursor - 1); return }
          if (k === 'ArrowRight') { s.editCursor = Math.min(s.editBuffer.length, s.editCursor + 1); return }
          if (k === 'Home') { s.editCursor = 0; return }
          if (k === 'End') { s.editCursor = s.editBuffer.length; return }
          if (isPrintable(k)) {
            s.editBuffer = s.editBuffer.slice(0, s.editCursor) + k + s.editBuffer.slice(s.editCursor)
            s.editCursor += k.length
          }
        }),
      ],
    ],
  })

  // Keystrokes that drive an in-progress PT edit. Block-level editing:
  // type into the focused block, Enter splits, Backspace deletes/merges,
  // arrows navigate, ⌘B/I/E toggle inline marks, ⌘0-3/Q switch styles,
  // ⌘L/⌘O toggle list-item.
  const onPtEditKeydown = defineBehavior({
    on: 'keyboard.keydown',
    guard: ({event}) => {
      const s = stateRef.current
      if (!s.editing || s.editingKind !== 'pt') return false
      const k = event.originEvent.key
      // Always swallow these
      if (k === 'Escape' || k === 'Enter' || k === 'Tab') return true
      if (k === 'Backspace' || k === 'Delete' || k === 'Home' || k === 'End') return true
      if (k.startsWith('Arrow')) return true
      // Mod-shortcuts (mark/style toggling)
      if (event.originEvent.metaKey || event.originEvent.ctrlKey) return true
      if (event.originEvent.altKey) return false
      return isPrintable(k)
    },
    actions: [
      ({event}) => [
        effect(() => {
          const s = stateRef.current
          const k = event.originEvent.key
          const meta = event.originEvent.metaKey || event.originEvent.ctrlKey
          const shift = event.originEvent.shiftKey
          nudge(s)
          const blocks = getEditingBlocks(s)
          if (!blocks) return
          const block = blocks[s.ptBlockIndex]
          if (!block) return

          // Exit edit mode
          if (k === 'Escape') {
            s.editing = false
            flash(s, 'Stopped editing')
            return
          }

          // ── ⌘ shortcuts ─────────────────────────────────────────────
          if (meta) {
            const lk = k.toLowerCase()
            // Style switching
            if (lk in PT_STYLE_KEYS && !shift) {
              block.style = PT_STYLE_KEYS[lk]
              block.listItem = undefined
              stampDocChanged(s)
              flash(s, `Style: ${block.style}`, 1500)
              return
            }
            if (lk === 'q' && !shift) {
              block.style = 'blockquote'
              block.listItem = undefined
              stampDocChanged(s)
              flash(s, 'Style: blockquote', 1500)
              return
            }
            if (lk === 'l' && shift) {
              block.listItem = block.listItem === 'bullet' ? undefined : 'bullet'
              if (block.listItem) block.level = block.level ?? 1
              stampDocChanged(s)
              flash(s, block.listItem ? 'Bullet list' : 'List off', 1500)
              return
            }
            if (lk === 'o' && shift) {
              block.listItem = block.listItem === 'number' ? undefined : 'number'
              if (block.listItem) block.level = block.level ?? 1
              stampDocChanged(s)
              flash(s, block.listItem ? 'Numbered list' : 'List off', 1500)
              return
            }
            // Mark toggling
            if (lk === 'b') { s.ptMarks = toggleMark(s.ptMarks, 'strong'); flash(s, `Marks: [${s.ptMarks.join(', ')}]`, 1200); return }
            if (lk === 'i') { s.ptMarks = toggleMark(s.ptMarks, 'em');     flash(s, `Marks: [${s.ptMarks.join(', ')}]`, 1200); return }
            if (lk === 'e') { s.ptMarks = toggleMark(s.ptMarks, 'code');   flash(s, `Marks: [${s.ptMarks.join(', ')}]`, 1200); return }
            // Save with ⌘S (just flash — we mutate live)
            if (lk === 's') { stampDocChanged(s); flash(s, '✓ Saved'); return }
            // Unknown ⌘ combo — swallow but do nothing
            return
          }

          // ── Plain keys ──────────────────────────────────────────────
          if (k === 'Enter') {
            splitBlockAt(blocks, s.ptBlockIndex, s.ptOffset)
            s.ptBlockIndex++
            s.ptOffset = 0
            s.ptMarks = []
            stampDocChanged(s)
            return
          }

          if (k === 'Backspace') {
            if (s.ptOffset > 0) {
              deleteCharAt(block, s.ptOffset)
              s.ptOffset--
            } else if (s.ptBlockIndex > 0) {
              const at = mergeBlockWithPrev(blocks, s.ptBlockIndex)
              if (at !== null) {
                s.ptBlockIndex--
                s.ptOffset = at
                s.ptMarks = marksAtOffset(blocks[s.ptBlockIndex], s.ptOffset)
              }
            }
            stampDocChanged(s)
            return
          }

          if (k === 'Delete') {
            const len = blockTextLen(block)
            if (s.ptOffset < len) {
              forwardDeleteAt(block, s.ptOffset)
            }
            stampDocChanged(s)
            return
          }

          if (k === 'ArrowLeft') {
            if (s.ptOffset > 0) s.ptOffset--
            else if (s.ptBlockIndex > 0) {
              s.ptBlockIndex--
              s.ptOffset = blockTextLen(blocks[s.ptBlockIndex])
            }
            s.ptMarks = marksAtOffset(blocks[s.ptBlockIndex], s.ptOffset)
            return
          }
          if (k === 'ArrowRight') {
            const len = blockTextLen(block)
            if (s.ptOffset < len) s.ptOffset++
            else if (s.ptBlockIndex < blocks.length - 1) {
              s.ptBlockIndex++
              s.ptOffset = 0
            }
            s.ptMarks = marksAtOffset(blocks[s.ptBlockIndex], s.ptOffset)
            return
          }
          if (k === 'ArrowUp') {
            if (s.ptBlockIndex > 0) {
              s.ptBlockIndex--
              s.ptOffset = Math.min(s.ptOffset, blockTextLen(blocks[s.ptBlockIndex]))
              s.ptMarks = marksAtOffset(blocks[s.ptBlockIndex], s.ptOffset)
            }
            return
          }
          if (k === 'ArrowDown') {
            if (s.ptBlockIndex < blocks.length - 1) {
              s.ptBlockIndex++
              s.ptOffset = Math.min(s.ptOffset, blockTextLen(blocks[s.ptBlockIndex]))
              s.ptMarks = marksAtOffset(blocks[s.ptBlockIndex], s.ptOffset)
            }
            return
          }
          if (k === 'Home') { s.ptOffset = 0; s.ptMarks = marksAtOffset(block, 0); return }
          if (k === 'End') { s.ptOffset = blockTextLen(block); s.ptMarks = marksAtOffset(block, s.ptOffset); return }

          // Printable characters: insert at cursor with active marks
          if (isPrintable(k)) {
            insertCharAt(block, s.ptOffset, k, s.ptMarks)
            s.ptOffset += k.length
            stampDocChanged(s)
          }
        }),
      ],
    ],
  })

  const onKeyDown = defineBehavior({
    on: 'keyboard.keydown',
    guard: ({event}) => !stateRef.current.editing && NAV_KEYS.has(event.originEvent.key),
    actions: [
      ({event}) => [
        effect(() => {
          const s = stateRef.current
          const key = event.originEvent.key
          const shift = event.originEvent.shiftKey
          const meta = event.originEvent.metaKey || event.originEvent.ctrlKey
          nudge(s)

          // Cmd+S → faux-save flash
          if ((key === 's' || key === 'S') && meta) {
            flash(s, '✓ Saved (faux — this is a mocked studio)')
            return
          }

          // Tab to switch pane
          if (key === 'Tab') {
            const idx = PANES.indexOf(s.activePane)
            const next = shift
              ? PANES[(idx - 1 + PANES.length) % PANES.length]
              : PANES[(idx + 1) % PANES.length]
            s.activePane = next
            flash(s, `Pane: ${labelForPane(next)}`)
            return
          }

          // Up/down move within the active pane
          if (key === 'ArrowUp' || key === 'ArrowDown') {
            const dir = key === 'ArrowUp' ? -1 : 1
            if (s.activePane === 'tree') {
              s.treeIndex = clamp(s.treeIndex + dir, 0, SCHEMA.length - 1)
              s.listIndex = 0
              s.formIndex = 0
            } else if (s.activePane === 'list') {
              const docs = docsByType(activeType(s).name)
              s.listIndex = clamp(s.listIndex + dir, 0, Math.max(0, docs.length - 1))
              s.formIndex = 0
            } else {
              const fields = activeType(s).fields
              s.formIndex = clamp(s.formIndex + dir, 0, Math.max(0, fields.length - 1))
            }
            return
          }

          // Right / Enter → drill in
          if (key === 'ArrowRight' || key === 'Enter') {
            if (s.activePane === 'tree') {
              s.activePane = 'list'
              flash(s, `Opened ${activeType(s).pluralTitle}`)
            } else if (s.activePane === 'list') {
              s.activePane = 'form'
              const t = activeType(s)
              const docs = docsByType(t.name)
              const doc = docs[s.listIndex]
              if (doc) flash(s, `Opened ${doc.values.title || doc.values.name || doc._id}`)
            } else {
              // already in the form — Enter starts edit mode
              if (key === 'Enter') enterEditMode(s)
            }
            return
          }

          // Left / Escape → back out
          if (key === 'ArrowLeft' || key === 'Escape') {
            if (s.activePane === 'form') {
              s.activePane = 'list'
            } else if (s.activePane === 'list') {
              s.activePane = 'tree'
            }
            return
          }

          // E to enter edit mode from anywhere in the form pane
          if ((key === 'e' || key === 'E') && s.activePane === 'form') {
            enterEditMode(s)
            return
          }
        }),
      ],
    ],
  })

  // Belt-and-braces: any single-char insert is dropped on the floor. The
  // edit buffer doesn't go through the editor's value, so we never want
  // the editor to actually mutate its own document. (When editing, our
  // onEditKeydown beat already consumed the keydown — the insert.text
  // event won't fire — but if it slips through, we still drop it.)
  const blockTextInput = defineBehavior({
    on: 'insert.text',
    guard: ({event}) => event.text.length > 0,
    actions: [() => [effect(() => {})]],
  })

  // Block break / soft break — Enter never inserts a paragraph break in
  // the studio document.
  const blockBreak = defineBehavior({
    on: 'insert.break',
    guard: () => true,
    actions: [() => [effect(() => {})]],
  })
  const blockSoftBreak = defineBehavior({
    on: 'insert.soft break',
    guard: () => true,
    actions: [() => [effect(() => {})]],
  })

  return [onPtEditKeydown, onStringEditKeydown, onKeyDown, blockTextInput, blockBreak, blockSoftBreak]
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

const labelForPane = (p: Pane) =>
  p === 'tree' ? 'Structure' : p === 'list' ? 'Documents' : 'Form'
