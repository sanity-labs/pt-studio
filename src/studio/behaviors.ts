import {defineBehavior, effect} from '@portabletext/editor/behaviors'
import {SCHEMA} from './schema'
import {DOCS, docsByType} from './data'
import {activeType, type StudioState, type Pane} from './state'

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
// Anything else (image, array, reference, portableText) shows a flash and
// stays read-only.
const EDITABLE_KINDS = new Set(['string', 'text', 'slug', 'datetime', 'number'])

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
  const current = doc.values[f.name]
  s.editBuffer = current === undefined || current === null ? '' : String(current)
  s.editCursor = s.editBuffer.length
  s.editing = true
  flash(s, `Editing ${f.label} — Enter to save · Esc to discard`)
  return true
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
  // Keystrokes that drive an in-progress edit. Captured on a separate
  // behavior so we can keep the priority guard tight: only fire when
  // editing, only forward the key into the buffer.
  const onEditKeydown = defineBehavior({
    on: 'keyboard.keydown',
    guard: ({event}) => {
      if (!stateRef.current.editing) return false
      const k = event.originEvent.key
      // Special editing keys
      if (k === 'Backspace' || k === 'Delete' || k === 'Home' || k === 'End') return true
      if (k === 'ArrowLeft' || k === 'ArrowRight') return true
      if (k === 'Enter' || k === 'Escape') return true
      if (event.originEvent.metaKey || event.originEvent.ctrlKey || event.originEvent.altKey) return false
      // Printable characters
      return isPrintable(k)
    },
    actions: [
      ({event}) => [
        effect(() => {
          const s = stateRef.current
          const k = event.originEvent.key
          nudge(s)
          if (k === 'Escape') {
            s.editing = false
            flash(s, 'Discarded edit')
            return
          }
          if (k === 'Enter') {
            commitEdit(s)
            return
          }
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
          if (k === 'ArrowLeft') {
            s.editCursor = Math.max(0, s.editCursor - 1)
            return
          }
          if (k === 'ArrowRight') {
            s.editCursor = Math.min(s.editBuffer.length, s.editCursor + 1)
            return
          }
          if (k === 'Home') { s.editCursor = 0; return }
          if (k === 'End') { s.editCursor = s.editBuffer.length; return }
          // Printable: insert at cursor
          if (isPrintable(k)) {
            s.editBuffer = s.editBuffer.slice(0, s.editCursor) + k + s.editBuffer.slice(s.editCursor)
            s.editCursor += k.length
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

  return [onEditKeydown, onKeyDown, blockTextInput, blockBreak, blockSoftBreak]
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

const labelForPane = (p: Pane) =>
  p === 'tree' ? 'Structure' : p === 'list' ? 'Documents' : 'Form'
